@echo off
setlocal enabledelayedexpansion

rem Migrates an existing Apollo installation to Helios.
rem It is run by the installer and is safe to run more than once. It never overwrites Helios
rem configuration files that already exist, and it only removes the old installation after its
rem configuration has been copied.

rem Get the Helios root directory
for %%I in ("%~dp0\..") do set "NEW_DIR=%%~fI"

if not defined ProgramW6432 (
    echo ProgramW6432 is not defined, skipping the Apollo migration.
    exit /b 0
)

rem ProgramW6432 is always the 64-bit Program Files directory, even from a 32-bit installer process
set "OLD_DIR=%ProgramW6432%\Apollo"
set "OLD_APPDATA=%LOCALAPPDATA%\SudoMaker\Apollo"
set "NEW_APPDATA=%LOCALAPPDATA%\Helios"

if /I "%OLD_DIR%"=="%NEW_DIR%" exit /b 0

if not exist "%OLD_DIR%\sunshine.exe" (
    echo No Apollo installation found in "%OLD_DIR%", nothing to migrate.
    exit /b 0
)

echo Migrating Apollo from "%OLD_DIR%" to "%NEW_DIR%"

rem Stop an Apollo instance that is still running from the old directory, it holds the config files
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Process sunshine -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ($env:ProgramW6432 + '\Apollo\*') } | Stop-Process -Force"

rem Copy the configuration (settings, apps, state, credentials, covers). Files that already exist
rem in the new installation are kept.
set "COPY_OK=0"
if exist "%OLD_DIR%\config\" (
    robocopy "%OLD_DIR%\config" "%NEW_DIR%\config" /E /XC /XN /XO /NFL /NDL /NJH /NJS /NP
    if !ERRORLEVEL! LSS 8 (
        set "COPY_OK=1"
    ) else (
        echo Failed to copy the Apollo configuration.
    )
) else (
    echo No Apollo configuration folder found.
)

if "!COPY_OK!"=="0" (
    echo The old Apollo installation was kept in "%OLD_DIR%".
    exit /b 1
)

rem Remove the old service. The old script also saves the service start type so that it can be restored.
if exist "%OLD_DIR%\scripts\uninstall-service.bat" (
    call "%OLD_DIR%\scripts\uninstall-service.bat"
) else (
    net stop ApolloService
    sc delete ApolloService
)

rem Keep the saved service start type for the new service
if exist "%OLD_APPDATA%\service_start_type.txt" (
    if not exist "%NEW_APPDATA%\" mkdir "%NEW_APPDATA%\"
    move /Y "%OLD_APPDATA%\service_start_type.txt" "%NEW_APPDATA%\service_start_type.txt"
)

rem Remove the old firewall rule, the new one is added by the installer
netsh advfirewall firewall delete rule name=Apollo

rem Uninstall the old version silently. In silent mode its uninstaller keeps the configuration and the
rem drivers. "_?=" makes it run in place so that we can wait for it, then we remove what it leaves behind.
if exist "%OLD_DIR%\Uninstall.exe" (
    start "" /wait "%OLD_DIR%\Uninstall.exe" /S _?=%OLD_DIR%
    del /F /Q "%OLD_DIR%\Uninstall.exe"
)

rem The configuration has been copied, so the old directory is not needed anymore
rmdir /S /Q "%OLD_DIR%"

echo Apollo was migrated to Helios.
exit /b 0
