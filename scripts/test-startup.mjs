import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeStandaloneCopy() {
  // Znak & u putanji pokriva uobicajeni naziv raspakovanog ZIP foldera.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'net-scan-&-startup-'));
  for (const file of ['server.js', 'package.json', 'data.json', 'netscan-data.json']) {
    fs.copyFileSync(path.join(ROOT, file), path.join(directory, file));
  }
  fs.cpSync(path.join(ROOT, 'dist'), path.join(directory, 'dist'), { recursive: true });
  return directory;
}

async function getFreePort() {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const address = socket.address();
  assert.ok(address && typeof address === 'object');
  const { port } = address;
  socket.close();
  await once(socket, 'close');
  return port;
}

function launch(directory, port) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: directory,
    env: { ...process.env, PORT: String(port), NET_SCAN_OPEN_BROWSER: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  return { child, output: () => output };
}

async function stop(child) {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
}

async function waitForHealth(child, port, output) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Server je prerano zavrsio:\n${output()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return response;
    } catch {
      // Server jos uvek slusa; pokusaj ponovo do isteka roka.
    }
    await delay(100);
  }
  throw new Error(`Server nije odgovorio na health proveru:\n${output()}`);
}

test('standalone paket se pokrece i servira API i web interfejs', { timeout: 15000 }, async () => {
  const directory = makeStandaloneCopy();
  const port = await getFreePort();
  const { child, output } = launch(directory, port);

  try {
    const healthResponse = await waitForHealth(child, port, output);
    const health = await healthResponse.json();
    assert.deepEqual(health, { app: 'net-scan', status: 'ok', port });

    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(pageResponse.status, 200);
    const page = await pageResponse.text();
    assert.match(page, /<div id="root"><\/div>/);

    const devicesResponse = await fetch(`http://127.0.0.1:${port}/api/devices`);
    assert.equal(devicesResponse.status, 200);
    assert.ok(Array.isArray(await devicesResponse.json()));
  } finally {
    await stop(child);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('zauzet port prekida server sa exit kodom 1, bez laznog exit koda 0', { timeout: 15000 }, async () => {
  const directory = makeStandaloneCopy();
  const port = await getFreePort();
  const blocker = net.createServer();
  blocker.listen(port, '0.0.0.0');
  await once(blocker, 'listening');
  const { child, output } = launch(directory, port);

  try {
    const result = await Promise.race([
      once(child, 'exit'),
      delay(8000, undefined, { ref: false }).then(() => {
        throw new Error(`Server nije prekinuo rad na zauzetom portu:\n${output()}`);
      }),
    ]);
    assert.equal(result[0], 1, output());
    assert.equal(result[1], null, output());
    assert.match(output(), new RegExp(`Port ${port} je vec zauzet`));
  } finally {
    await stop(child);
    blocker.close();
    await once(blocker, 'close');
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
