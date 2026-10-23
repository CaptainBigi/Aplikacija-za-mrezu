# NET-SCAN — Intranet Network Monitor & Web Terminal

Aplikacija za nadzor lokalne/offline mreže, sa mapama zgrada, web terminalom, skenerom podmreža i oglasnom tablom.

## Pokretanje na Windowsu (preporučeno)

1. Raspakujte **kompletan** `NET-SCAN-OFFLINE.zip` u običan folder, na primer `C:\NET-SCAN` ili `Desktop\NET-SCAN`.
2. Instalirajte **Node.js LTS, verziju 18 ili noviju**, ako već nije instaliran: <https://nodejs.org>.
3. Dvoklikom pokrenite `start.bat` iz raspakovanog foldera.
4. Browser će se otvoriti automatski kada server bude spreman. Ako se ne otvori, posetite **http://localhost:3000**.

**Nije potrebno pokretati `npm install` za gotov offline paket.** Potrebni `server.js`, `dist` i `package.json` već su u paketu.

- Korisničko ime: `Admin`
- Lozinka: `123`
- CMD prozor mora ostati otvoren dok aplikacija radi.
- Ako je NET-SCAN već pokrenut, `start.bat` ne pravi drugu instancu, nego otvara postojeću aplikaciju.

Detaljno uputstvo je u fajlu `KORISNICKO_UPUTSTVO.txt`, a dijagnostika je dostupna kroz `PROVERA_SISTEMA.bat`.

## Ručno pokretanje gotovog paketa

Iz foldera u kojem su `server.js`, `package.json` i `dist`:

```bash
npm start
```

## Build i provera izvornog koda

```bash
npm install
npm run lint
npm test
npm run build
npm start
```

`npm run build` pravi web interfejs, standalone `server.js` i `public/NET-SCAN-OFFLINE.zip`. Za poslednji korak pakovanja potreban je Python 3.

## Ako se aplikacija ne otvori

- Nemojte pokretati `start.bat` direktno iz ZIP arhive niti preuzimati samo taj fajl — raspakujte ceo paket.
- Proverite da li je Node.js instaliran i da li radi komanda `node --version`.
- Ako je port `3000` zauzet, pročitajte poruku iznad koda greške. Ako je NET-SCAN već aktivan, otvorite http://localhost:3000.
- Pokrenite `PROVERA_SISTEMA.bat` za proveru fajlova, Node.js okruženja i porta.
