import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  isValidIpv4,
  getSubnetBase,
  cleanMacAddress,
  formatMacAddress,
  generateDevicesCsv,
  parseTerminalCommand,
  parseSubnetInput,
  calculateSubnetStats,
  filterSubnetDevices,
} from './networkUtils.ts';

test('formatDuration formats seconds, minutes, hours and days correctly', () => {
  const now = 1000000000;
  assert.equal(formatDuration(null), '');
  assert.equal(formatDuration(0), '');
  // 30 seconds ago
  assert.equal(formatDuration(now - 30 * 1000, now), '30s');
  // 5 minutes ago
  assert.equal(formatDuration(now - 5 * 60 * 1000, now), '5m');
  // 2 hours and 15 minutes ago
  assert.equal(formatDuration(now - (2 * 3600 + 15 * 60) * 1000, now), '2h 15m');
  // 3 days and 4 hours ago
  assert.equal(formatDuration(now - (3 * 86400 + 4 * 3600) * 1000, now), '3d 4h');
});

test('isValidIpv4 accurately validates IP addresses', () => {
  assert.equal(isValidIpv4('192.168.1.1'), true);
  assert.equal(isValidIpv4('11.29.50.1'), true);
  assert.equal(isValidIpv4('10.0.0.255'), true);
  assert.equal(isValidIpv4('0.0.0.0'), true);
  assert.equal(isValidIpv4(''), false);
  assert.equal(isValidIpv4('256.1.1.1'), false);
  assert.equal(isValidIpv4('192.168.1'), false);
  assert.equal(isValidIpv4('192.168.1.1.1'), false);
  assert.equal(isValidIpv4('abc.def.ghi.jkl'), false);
});

test('getSubnetBase extracts correct /24 prefix', () => {
  assert.equal(getSubnetBase('192.168.1.15'), '192.168.1');
  assert.equal(getSubnetBase('11.29.50.100'), '11.29.50');
  assert.equal(getSubnetBase('invalid'), null);
});

test('cleanMacAddress and formatMacAddress normalize MAC strings', () => {
  assert.equal(cleanMacAddress('00:1A:2B:3C:4D:5E'), '001A2B3C4D5E');
  assert.equal(cleanMacAddress('00-1a-2b-3c-4d-5e'), '001A2B3C4D5E');
  assert.equal(cleanMacAddress('001A2B3C4D5E'), '001A2B3C4D5E');
  assert.equal(cleanMacAddress('-'), null);
  assert.equal(cleanMacAddress('invalid_mac'), null);

  assert.equal(formatMacAddress('001a2b3c4d5e'), '00:1A:2B:3C:4D:5E');
  assert.equal(formatMacAddress('00-1A-2B-3C-4D-5E'), '00:1A:2B:3C:4D:5E');
});

test('generateDevicesCsv generates properly escaped UTF-8 CSV', () => {
  const devices = [
    {
      name: 'Switch "Glavni"',
      location: 'Beograd',
      type: 'Switch',
      ip: '11.29.50.1',
      status: 'ONLINE',
      latency: '2 ms',
      mac: '00:1A:2B:3C:4D:01',
    },
  ];
  const csv = generateDevicesCsv(devices);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Switch ""Glavni"""'));
  assert.ok(csv.includes('"11.29.50.1"'));
});

test('parseTerminalCommand parses commands and options', () => {
  const p1 = parseTerminalCommand('ping 11.29.50.1');
  assert.equal(p1.cmd, 'ping');
  assert.equal(p1.target, '11.29.50.1');
  assert.equal(p1.isContinuous, false);
  assert.equal(p1.count, 4);

  const p2 = parseTerminalCommand('ping -t 192.168.1.1');
  assert.equal(p2.cmd, 'ping');
  assert.equal(p2.isContinuous, true);
  assert.equal(p2.count, 25);

  const p3 = parseTerminalCommand('telnet 10.10.1.1 80');
  assert.equal(p3.cmd, 'telnet');
  assert.equal(p3.target, '10.10.1.1');
  assert.equal(p3.param, '80');
});

test('parseSubnetInput parses various subnet notation inputs', () => {
  assert.equal(parseSubnetInput('192.168.1.0/24'), '192.168.1');
  assert.equal(parseSubnetInput('192.168.1.1'), '192.168.1');
  assert.equal(parseSubnetInput('192.168.1'), '192.168.1');
  assert.equal(parseSubnetInput('10.0.0.0/24'), '10.0.0');
  assert.equal(parseSubnetInput('11.29.50'), '11.29.50');
  assert.equal(parseSubnetInput(''), '11.29.50');
});

test('calculateSubnetStats accurately counts online and offline', () => {
  const devices = [
    { status: 'ONLINE' as const },
    { status: 'ONLINE' as const },
    { status: 'OFFLINE' as const },
  ];
  const stats = calculateSubnetStats(devices);
  assert.equal(stats.total, 3);
  assert.equal(stats.online, 2);
  assert.equal(stats.offline, 1);
});

test('filterSubnetDevices filters by mode and search keyword', () => {
  const devices = [
    { id: '1', ip: '192.168.1.1', name: 'Gateway', hostname: 'GW', mac: 'AA:BB', type: 'Ruter', status: 'ONLINE' as const, latency: '1 ms' },
    { id: '2', ip: '192.168.1.15', name: 'PC Marko', hostname: 'PC15', mac: 'CC:DD', type: 'Računar', status: 'ONLINE' as const, latency: '3 ms' },
    { id: '3', ip: '192.168.1.20', name: 'Slobodno', hostname: '-', mac: '-', type: '-', status: 'OFFLINE' as const, latency: '-' },
  ];

  const onlineOnly = filterSubnetDevices(devices, 'online');
  assert.equal(onlineOnly.length, 2);

  const offlineOnly = filterSubnetDevices(devices, 'offline');
  assert.equal(offlineOnly.length, 1);
  assert.equal(offlineOnly[0].ip, '192.168.1.20');

  const searched = filterSubnetDevices(devices, 'all', 'marko');
  assert.equal(searched.length, 1);
  assert.equal(searched[0].ip, '192.168.1.15');
});


