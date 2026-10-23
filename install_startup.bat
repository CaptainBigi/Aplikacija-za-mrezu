@echo off
title NET-SCAN - Instalacija u Windows Startup (Automatsko Pokretanje)
color 0B
cd /d "%~dp0"

echo =========================================================
echo   NET-SCAN INTRANET MONITOR - AUTOMATSKO POKRETANJE
echo =========================================================
echo.
echo Ovaj program ce podesiti da se NET-SCAN server automatski
echo pokrene pri svakom paljenju ovog racunara.
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\NET-SCAN_Server.bat"

echo Kreiram automatsku skriptu u folderu:
echo %STARTUP_FOLDER%
echo.

(
    echo @echo off
    echo cd /d "%~dp0"
    echo start "" "%~dp0start.bat"
) > "%SHORTCUT%"

if exist "%SHORTCUT%" (
    color 0A
    echo =========================================================
    echo [USPESNO PODESENO]
    echo NET-SCAN server ce se sam pokrenuti svaki put kada
    echo se racunar upali ili restartuje!
    echo =========================================================
) else (
    color 0C
    echo =========================================================
    echo [GRESKA] Nije uspelo kreiranje skripte u Startup folderu.
    echo Pokrenite ovaj fajl kao Administrator.
    echo =========================================================
)

echo.
pause
