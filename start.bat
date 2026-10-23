@echo off
setlocal EnableExtensions DisableDelayedExpansion
title NET-SCAN INTRANET MONITOR - SERVER
color 0A
cd /d "%~dp0"
if errorlevel 1 goto folder_error

set "APP_PORT=3000"
set "APP_URL=http://localhost:3000"
set "PORT=3000"

echo =========================================================
echo       NET-SCAN INTRANET MONITOR - GLAVNI SERVER
echo       Created by N1ko7a (Za Sigurne Offline Mreze)
echo =========================================================
echo.

REM Ne pokreci aplikaciju iz privremenog foldera ZIP arhive.
echo("%~dp0" | findstr /I /L /C:"AppData\Local\Temp" /C:"Temp1_" /C:"Temp2_" >nul
if not errorlevel 1 goto inside_zip
goto check_node

:inside_zip
color 0C
echo =========================================================
echo  [UPOZORENJE] POKRENULI STE PROGRAM IZ ZIP ARHIVE!
echo =========================================================
echo.
echo  Raspakujte ZIP sa "Extract All / Izdvoj sve" u obican
echo  folder, npr. Desktop\NET-SCAN ili C:\NET-SCAN, pa tek
echo  onda pokrenite start.bat iz tog novog foldera.
echo.
pause
exit /b 1

:folder_error
color 0C
echo [GRESKA] Ne mogu da otvorim folder u kojem je start.bat.
echo Raspakujte kompletan ZIP u lokalni folder i pokusajte ponovo.
echo.
pause
exit /b 1

:check_node
echo [1/4] Proveravam Node.js okruzenje...
set "NODE_EXE="

where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"
if defined NODE_EXE goto node_found

if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%~dp0node.exe" set "NODE_EXE=%~dp0node.exe"
if defined NODE_EXE goto node_found
goto no_node

:no_node
color 0C
echo.
echo =========================================================
echo  [GRESKA] NODE.JS NIJE PRONADJEN ILI NE RADI!
echo =========================================================
echo.
echo  Instalirajte Node.js LTS (verzija 18, 20, 22 ili novija):
echo  https://nodejs.org
echo.
echo  Nakon instalacije zatvorite ovaj prozor i ponovo
echo  pokrenite start.bat. Nije potreban npm install za
echo  gotov offline paket koji sadrzi server.js i dist.
echo.
pause
exit /b 1

:node_found
"%NODE_EXE%" --version >nul 2>nul
if errorlevel 1 goto no_node
echo [OK] Node.js je prisutan: "%NODE_EXE%"
echo.

echo [2/4] Proveravam datoteke aplikacije...
if not exist "server.js" if not exist "server.ts" goto no_server
if not exist "data.json" if exist "netscan-data.json" copy /y "netscan-data.json" "data.json" >nul
if not exist "dist\index.html" echo [UPOZORENJE] dist\index.html nedostaje. Raspakujte kompletan offline paket.
echo [OK] Provera datoteka je zavrsena.
echo.

echo [3/4] Proveravam da li je NET-SCAN vec pokrenut...
"%NODE_EXE%" -e "fetch('http://127.0.0.1:3000/api/devices',{signal:AbortSignal.timeout(1500)}).then(r=>r.json()).then(d=>process.exit(Array.isArray(d)?0:1)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 goto already_running
echo [OK] Nije pronadjena aktivna NET-SCAN instanca.
echo.

echo [4/4] Pokrecem NET-SCAN server na portu 3000...
echo.
echo =========================================================
echo  Aplikacija ce se otvoriti u browseru cim server bude
echo  spreman. Ako se ne otvori, idite na:
echo  http://localhost:3000
echo.
echo  Ovaj CMD prozor MORA ostati otvoren dok server radi.
echo  Login: Admin / 123
echo =========================================================
echo.

set "NET_SCAN_OPEN_BROWSER=true"
if exist "server.js" goto run_server_js
goto run_server_ts

:run_server_js
echo Pokrecem gotov server.js...
echo.
"%NODE_EXE%" "%~dp0server.js"
set "SERVER_EXIT=%errorlevel%"
goto server_stopped

:run_server_ts
echo [INFO] server.js nije pronadjen, pokrecem server.ts...
echo.
call npx tsx "%~dp0server.ts"
set "SERVER_EXIT=%errorlevel%"
goto server_stopped

:already_running
color 0A
echo [OK] NET-SCAN je vec aktivan na ovom racunaru.
echo Ne pokrecem drugu instancu; otvaram postojecu aplikaciju.
echo.
start "" "%APP_URL%"
timeout /t 3 /nobreak >nul
exit /b 0

:server_stopped
if "%SERVER_EXIT%"=="0" goto server_stopped_clean
goto server_error

:server_stopped_clean
color 0E
echo.
echo =========================================================
echo  [OBAV] Server je zaustavljen (Exit kod: 0).
echo.
echo  Ako se ovo desilo odmah, a niste sami zaustavili server,
echo  pokrenite PROVERA_SISTEMA.bat i procitajte poruke iznad.
echo =========================================================
echo.
pause
exit /b 0

:server_error
color 0C
echo.
echo =========================================================
echo  [GRESKA] Server se zaustavio (Exit kod: %SERVER_EXIT%).
echo.
echo  Procitajte prvu poruku o gresci IZNAD ove poruke.
echo  Ako je port 3000 zauzet, zatvorite drugi program koji ga
echo  koristi ili otvorite vec pokrenuti NET-SCAN u browseru.
echo.
echo  Procesi na portu 3000:
netstat -ano | findstr /R /C:":3000 "
echo =========================================================
echo.
pause
exit /b %SERVER_EXIT%

:no_server
color 0C
echo.
echo =========================================================
echo  [GRESKA] NEDOSTAJU server.js i server.ts!
echo =========================================================
echo.
echo  start.bat mora biti u istom folderu sa server.js,
echo  package.json i dist folderom. Raspakujte CEO offline
echo  paket; nemojte preuzimati ili pokretati samo start.bat.
echo.
pause
exit /b 1
