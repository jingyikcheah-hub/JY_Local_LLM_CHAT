@echo off
setlocal
cd /d "%~dp0"

echo.
echo  LocalChat - private AI on your computer
echo  =======================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.10 to 3.12, then run this file again.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating the LocalChat environment...
  python -m venv .venv
  if errorlevel 1 goto :failed
)

echo Checking backend dependencies...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto :failed

if not exist "frontend\dist\index.html" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo The web interface has not been built and Node.js was not found.
    echo Install Node.js 22 or use a LocalChat release package that includes frontend\dist.
    pause
    exit /b 1
  )
  echo Building the LocalChat interface...
  pushd frontend
  call npm install
  if errorlevel 1 goto :frontend_failed
  call npm run build
  if errorlevel 1 goto :frontend_failed
  popd
)

if not exist models mkdir models
echo.
echo LocalChat is starting at http://127.0.0.1:8000
echo Keep this window open while you use the app. Press Ctrl+C to stop it.
echo.
set LOCALCHAT_OPEN_BROWSER=true
".venv\Scripts\python.exe" main.py
exit /b %errorlevel%

:frontend_failed
popd
:failed
echo.
echo Setup did not finish. Review the message above, then run this file again.
pause
exit /b 1
