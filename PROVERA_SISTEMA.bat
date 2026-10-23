@echo off
title NET-SCAN - DIJAGNOSTIKA I PROVERA SISTEMA
color 0B
cd /d "%~dp0"

echo =========================================================
echo       NET-SCAN - DIJAGNOSTIKA I TEST SISTEMA
echo =========================================================
echo.
echo Ovaj program ce proveriti sve komponente i ispisati
echo status vaseg racunara i fajlova.
echo.

echo --- 1. PROVERA FOLDERA I RASPONOVANJA ---
echo("%~dp0" | findstr /I /L /C:"AppData\Local\Temp" /C:"Temp1_" /C:"Temp2_" >nul
if not errorlevel 1 (
    color 0C
    echo [GRESKA] Pokrenuli ste iz privremenog ZIP foldera!
    echo Morate raspakovati (Extract All) arhivu na radnu povrsinu ili disk.
) else (
    echo [OK] Pokrenuto iz regularnog foldera: %~dp0
)
echo.

echo --- 2. PROVERA FAJLOVA SERVERA ---
if exist "server.js" (
    echo [OK] server.js postoji i spreman je za rad.
) else (
    echo [UPOZORENJE] server.js NE postoji u ovom folderu!
)

if exist "dist\index.html" (
    echo [OK] dist\index.html (web interfejs) postoji.
) else (
    echo [UPOZORENJE] dist folder NE postoji u ovom folderu!
)

if exist "data.json" (
    echo [OK] data.json (baza podataka) postoji.
) else (
    echo [INFO] data.json ce biti kreiran automatski.
)
echo.

echo --- 3. PROVERA NODE.JS OKRUZENJA ---
set NODE_CHECK=
where node >nul 2>nul
if %errorlevel% equ 0 set NODE_CHECK=node
if not defined NODE_CHECK if exist "C:\Program Files\nodejs\node.exe" set "NODE_CHECK=C:\Program Files\nodejs\node.exe"
if not defined NODE_CHECK if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_CHECK=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_CHECK if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_CHECK=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_CHECK if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_CHECK=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if defined NODE_CHECK (
    echo [OK] Node.js je pronadjen na: %NODE_CHECK%
    echo Verzija Node.js:
    "%NODE_CHECK%" -v
) else (
    color 0C
    echo [GRESKA] Node.js NIJE pronadjen na ovom racunaru!
    echo Molimo instalirajte Node.js sa https://nodejs.org (LTS .msi verzija).
)
echo.

echo --- 4. PROVERA PORTA 3000 ---
netstat -ano | findstr /R /C:":3000 " >nul 2>nul
if %errorlevel% equ 0 (
    echo [UPOZORENJE] Port 3000 je zauzet (mozda je NET-SCAN vec aktivan).
    echo Proverite http://localhost:3000 ili procese na portu 3000:
    netstat -ano | findstr /R /C:":3000 "
) else (
    echo [OK] Port 3000 je slobodan i spreman za NET-SCAN.
)
echo.

echo =========================================================
echo DIJAGNOSTIKA JE ZAVRSENA.
echo Pritisnite bilo koji taster za zatvaranje...
echo =========================================================
pause
