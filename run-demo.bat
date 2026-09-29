@echo off
REM Oja demo launcher: installs dependencies (first run only) and starts the dev server.
REM The site runs at http://localhost:3000 in demo mode (no configuration needed).
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing dependencies, this takes a few minutes...
  call npm install --legacy-peer-deps
  if errorlevel 1 (
    echo Install failed. Check your network connection and try again.
    pause
    exit /b 1
  )
)
echo Starting Oja demo on http://localhost:3000 ...
echo Press Ctrl+C to stop the server.
call npm run dev
