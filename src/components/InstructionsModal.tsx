import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Download,
  Terminal,
  Shield,
  Server,
  CheckCircle,
  Copy,
  Check,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import startBatContent from '../../start.bat?raw';
import installStartupBatContent from '../../install_startup.bat?raw';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const [copiedIpcmd, setCopiedIpcmd] = useState(false);

  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, type = 'text/plain') => {
    // CMD pouzdano cita batch skripte sa Windows CRLF zavrsetcima redova.
    const normalizedContent = filename.toLowerCase().endsWith('.bat')
      ? content.replace(/\r?\n/g, '\r\n')
      : content;
    const blob = new Blob([normalizedContent], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                NET-SCAN — Korisničko Uputstvo (Offline Mreža)
              </h3>
              <p className="text-[11px] text-gray-400">Podešavanje glavnog servera i pristup kolega</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-300 leading-relaxed">
          {/* QUICK DOWNLOADS BANNER */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-blue-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <Download className="w-4 h-4" /> Preuzimanje Fajlova za Pokretanje
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Za novu instalaciju preuzmite ceo ZIP. Pojedinačni start.bat služi samo za zamenu postojeće skripte.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/NET-SCAN-OFFLINE.zip"
                download="NET-SCAN-OFFLINE.zip"
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold rounded-lg font-mono text-[11px] transition-all shadow-md flex items-center gap-1.5"
                title="Preuzmite kompletan spakovan paket (server.js + dist + start.bat)"
              >
                <Download className="w-3.5 h-3.5" /> Gotov Offline Paket (.ZIP)
              </a>
              <button
                onClick={() => downloadFile(startBatContent, 'start.bat', 'application/x-bat')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                title="Preuzmite samo start.bat skriptu"
              >
                <Terminal className="w-3.5 h-3.5" /> start.bat
              </button>
              <button
                onClick={() => downloadFile(installStartupBatContent, 'install_startup.bat', 'application/x-bat')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                title="Preuzmite install_startup.bat skriptu"
              >
                <Server className="w-3.5 h-3.5" /> install_startup.bat
              </button>
            </div>
          </div>

          {/* 1. KAKO SE POKRECE APLIKACIJA */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">
                1
              </span>
              Kako se pokreće aplikacija na vašem računaru (serveru)?
            </h4>
            <div className="pl-7 space-y-1.5 text-gray-300">
              <p>
                • Dvoklikom pokrenite fajl <strong className="text-emerald-400 font-mono">start.bat</strong>.
              </p>
              <p>
                • <strong>Opciono:</strong> Ako želite da se aplikacija pali sama pri svakom paljenju računara, pokrenite fajl <strong className="text-blue-400 font-mono">install_startup.bat</strong>.
              </p>
              <p>
                • Browser će se otvoriti automatski čim server bude spreman. <span className="text-amber-300 font-semibold">CMD prozor mora ostati otvoren</span>, jer je to "mozak" vaše aplikacije. Ako je NET-SCAN već aktivan, start.bat otvara postojeću instancu umesto da pravi novu.
              </p>
            </div>
          </div>

          {/* 2. KAKO PRISTUPITI APLIKACIJI */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">
                2
              </span>
              Kako pristupiti aplikaciji (preko browsera)?
            </h4>
            <div className="pl-7 space-y-1.5 text-gray-300">
              <p>
                • Na ovom (glavnom) računaru otvorite Chrome, Firefox ili Edge i ukucajte:
              </p>
              <div className="bg-[#0f1117] p-2.5 rounded-lg border border-[#262a36] font-mono text-emerald-400 text-xs inline-block">
                http://localhost:3000
              </div>
            </div>
          </div>

          {/* OBAVEZNO PODESAVANJE ZA KOLEGE */}
          <div className="bg-[#14161f] border border-[#2b3142] rounded-xl p-4 space-y-3">
            <div className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Podešavanje da bi kolege mogle da pristupe sa svojih računara
            </div>
            <p className="text-gray-300 text-xs">
              Kolege iz drugih kancelarija/zgrada u vašoj zatvorenoj mreži <strong className="text-white">ne moraju ništa da instaliraju</strong>. Dovoljno je da ovaj vaš računar glumi server:
            </p>

            <div className="space-y-2 pt-1 border-t border-[#262a36]">
              <div>
                <strong className="text-white">KORAK A: Saznajte vašu fiksnu IP adresu</strong>
                <ol className="list-decimal list-inside text-gray-400 mt-1 space-y-0.5">
                  <li>Otvorite Start i ukucajte CMD.</li>
                  <li>
                    Ukucajte komandu: <code className="text-emerald-400 font-mono">ipconfig</code> i pritisnite Enter.
                  </li>
                  <li>
                    Pronađite red <em>"IPv4 Address"</em> (na primer: <code className="text-white font-mono">11.29.50.15</code>).
                  </li>
                </ol>
                <div className="mt-2 text-gray-300 bg-[#0f1117] p-2 rounded border border-[#262a36]">
                  Vaše kolege na svom računaru u Chrome kucaju:{' '}
                  <span className="text-emerald-400 font-mono font-bold">http://[VASA_IP_ADRESA]:3000</span>
                </div>
              </div>

              <div className="pt-2">
                <strong className="text-white">KORAK B: Otključavanje porta 3000 kroz Windows Firewall</strong>
                <ol className="list-decimal list-inside text-gray-400 mt-1 space-y-0.5">
                  <li>Otvorite Start i ukucajte: <em>Windows Defender Firewall with Advanced Security</em></li>
                  <li>Sa leve strane kliknite na <strong>Inbound Rules (Ulazna pravila)</strong>.</li>
                  <li>Sa desne strane kliknite na <strong>New Rule... (Novo pravilo)</strong>.</li>
                  <li>Izaberite <strong>Port</strong> &gt; Next.</li>
                  <li>Izaberite <strong>TCP</strong>, a u polje unosite port: <strong className="text-emerald-400 font-mono">3000</strong> &gt; Next.</li>
                  <li>Izaberite <strong>Allow the connection</strong> &gt; Next &gt; Next.</li>
                  <li>Nazovite ga <em>"NET-SCAN Server"</em> i kliknite Finish.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* 3. PODACI ZA PRIJAVU */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">
                3
              </span>
              Podaci za prijavu (Login)
            </h4>
            <div className="pl-7 text-gray-300">
              Korisničko ime: <strong className="text-white font-mono">Admin</strong> &nbsp;|&nbsp; Lozinka: <strong className="text-white font-mono">123</strong>
            </div>
          </div>

          {/* 4. NOVA UGRADJENA CMD KONZOLA */}
          <div className="space-y-1.5 bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Kako radi nova Ugrađena CMD Konzola?
            </h4>
            <p className="text-gray-300">
              Kada bilo koja kolega sa svog računara klikne na dugme <strong>PING</strong>, <strong>TRACERT</strong> ili <strong>TELNET</strong>, prozor konzole se otvara <strong>isključivo u njihovom browseru</strong>.
            </p>
            <p className="text-emerald-300">
              ✓ Nema otvaranja prozora na vašem glavnom serverskom računaru!<br />
              ✓ Kolegama se ne preuzima nikakav .bat fajl — sve ide uživo kroz web interfejs!
            </p>
          </div>

          {/* 5. GDE SE CUVAJU PODACI */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">
                4
              </span>
              Baza i Bekapi (data.json)
            </h4>
            <div className="pl-7 space-y-1 text-gray-400">
              <p>
                • Svi podaci se automatski čuvaju u fajlu <strong className="text-white font-mono">data.json</strong> u folderu aplikacije.
              </p>
              <p>
                • Svakog dana u pozadini aplikacija pravi kopiju u folder <strong className="text-white font-mono">backups/data_backup_YYYY-MM-DD.json</strong>.
              </p>
              <p>
                • Bekapi stariji od 14 dana se automatski čiste kako ne bi zauzimali prostor na disku.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#262a36] bg-[#14161f] flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            Specijalno prilagođeno za sigurne (offline) mreže • Created by <strong className="text-emerald-400">N1ko7a</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            U redu, razumem
          </button>
        </div>
      </div>
    </div>
  );
};
