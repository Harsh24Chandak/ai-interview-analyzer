#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -f .env ]; then
  cp .env.example .env
fi
echo "Starting AI Interview Analyzer FastAPI Backend on http://localhost:5000 ..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
