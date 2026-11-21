@echo off

rem Get the Helios root directory
for %%I in ("%~dp0\..") do set "ROOT_DIR=%%~fI"

set RULE_NAME=Helios
set PROGRAM_BIN="%ROOT_DIR%\helios.exe"

rem Remove the existing rules first: older installs pointed them at another executable
netsh advfirewall firewall delete rule name=%RULE_NAME% > nul 2>&1

rem Add the rule
netsh advfirewall firewall add rule name=%RULE_NAME% dir=in action=allow protocol=tcp program=%PROGRAM_BIN% enable=yes
netsh advfirewall firewall add rule name=%RULE_NAME% dir=in action=allow protocol=udp program=%PROGRAM_BIN% enable=yes
