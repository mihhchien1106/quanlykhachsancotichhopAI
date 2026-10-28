@echo off
cd /d "%~dp0backend"
echo Grand Hotel: http://localhost:4000
start "" "http://localhost:4000"
node server.js
pause
