@echo off
chcp 65001 >nul
cd /d "%~dp0"
python -m http.server 8080
http://localhost:8080
pause