#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -r backend/requirements.txt
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

cd backend
exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
