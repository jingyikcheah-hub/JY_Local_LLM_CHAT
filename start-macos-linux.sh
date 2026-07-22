#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

printf '\nLocalChat - private AI on your computer\n'
printf '=======================================\n\n'

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.10 to 3.12 is required."
  exit 1
fi

if [ ! -x ".venv/bin/python" ]; then
  echo "Creating the LocalChat environment..."
  python3 -m venv .venv
fi

echo "Checking backend dependencies..."
.venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt

if [ ! -f "frontend/dist/index.html" ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "Node.js 22 is required to build the missing web interface."
    exit 1
  fi
  echo "Building the LocalChat interface..."
  (cd frontend && npm install && npm run build)
fi

mkdir -p models
echo "LocalChat is starting at http://127.0.0.1:8000"
echo "Keep this terminal open. Press Ctrl+C to stop it."
LOCALCHAT_OPEN_BROWSER=true .venv/bin/python main.py
