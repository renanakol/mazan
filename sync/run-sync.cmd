@echo off
rem Mazan daily sync (called by Windows Task Scheduler)
chcp 65001 >nul
cd /d "%~dp0"
node sync.js >nul 2>&1
