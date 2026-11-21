@echo off
setlocal

rem Removes the executables of a Helios install made before the binaries were renamed
rem (helios.exe and tools\heliossvc.exe replace them). The service keeps its name, HeliosService:
rem install-service.bat points it at the new binary afterwards.

rem Get the Helios root directory
for %%I in ("%~dp0\..") do set "ROOT_DIR=%%~fI"

set "OLD_EXE=%ROOT_DIR%\sunshine.exe"
set "OLD_SERVICE_EXE=%ROOT_DIR%\tools\sunshinesvc.exe"

if not exist "%OLD_EXE%" if not exist "%OLD_SERVICE_EXE%" (
    echo No executables of an older Helios install found, nothing to remove.
    exit /b 0
)

rem Stop the service, which still runs the old executables
sc qc HeliosService > nul 2>&1
if %ERRORLEVEL%==0 net stop HeliosService

rem Give the old host process time to exit, then make sure it is gone (only the one from this install)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:OLD_EXE -or $_.Path -eq $env:OLD_SERVICE_EXE }; if ($p) { $p | Wait-Process -Timeout 15 -ErrorAction SilentlyContinue; $p | Stop-Process -Force -ErrorAction SilentlyContinue }"

if exist "%OLD_EXE%" del /f /q "%OLD_EXE%"
if exist "%OLD_SERVICE_EXE%" del /f /q "%OLD_SERVICE_EXE%"

echo Removed the executables of the older Helios install.
exit /b 0
