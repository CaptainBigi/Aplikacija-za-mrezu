# NET-SCAN — Intranet Network Monitor & Web Terminal

Aplikacija za nadzor lokalne/offline mreže, sa mapama zgrada, web terminalom, skenerom podmreža i oglasnom tablom.

## Nadzor i mrežni skener

- Stvarne ONLINE/OFFLINE promene automatski se objavljuju kao sistemske poruke na oglasnoj tabli, bez duplikata pri ponovnoj proveri istog statusa.
- Server proverava uređaje 5 sekundi nakon pokretanja i zatim na svakih 60 sekundi.
- Ako ICMP ping nije dozvoljen, dostupnost se proverava paralelno preko TCP portova 80, 443, 445, 135, 22 i 9100.
- Skener prikazuje vreme poslednjeg završenog skeniranja i mapu svih 256 adresa: zeleno je zauzeto, sivo slobodno, a tamno neprovereno.
- U skener se može dodati više /24 podmreža. Server ih automatski skenira jednu po jednu na proizvoljan interval od 1 do 1440 minuta; 0 minuta isključuje automatiku.
- Automatika radi i kada skener nije otvoren. Rezultat svake mreže se čuva, a uklanjanje iz automatske liste ne briše poslednju mapu zauzetosti.
- Dok je skener otvoren, klik na kružić uređaja u gornjem monitoru direktno otvara i skroluje do mape zauzetosti njegove podmreže.

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

## API za widget-e

Ruta `GET /api/widget-stats` vraća broj uređaja bez login-a i korisničke sesije. Zahtev mora da sadrži tajno zaglavlje `X-API-Key`.

Podrazumevani token je `moj_tajni_token_123`:

```bash
curl -H "X-API-Key: moj_tajni_token_123" http://localhost:3000/api/widget-stats
```

Primer odgovora:

```json
{
  "total": 12,
  "online": 9,
  "offline": 3
}
```

Primer za JavaScript widget (zameni `IP_SERVERA` adresom računara na kojem radi NET-SCAN):

```js
const response = await fetch('http://IP_SERVERA:3000/api/widget-stats', {
  headers: { 'X-API-Key': 'moj_tajni_token_123' }
});

if (!response.ok) throw new Error('Neispravan API token ili server nije dostupan');
const stats = await response.json();
console.log(stats.total, stats.online, stats.offline);
```

Za drugi token postavi promenljivu okruženja `WIDGET_API_KEY` pre pokretanja servera. Na Windowsu to možeš uraditi u istom CMD prozoru sa `set WIDGET_API_KEY=neki_drugi_token`, a zatim pokrenuti `start.bat`.

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
