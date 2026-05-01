#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/backend"

echo "╔══════════════════════════════════════╗"
echo "║   InsightEd — Backend Setup          ║"
echo "╚══════════════════════════════════════╝"

# Create virtualenv if not exists
if [ ! -d ".venv" ]; then
  echo "→ Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "→ Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "→ Downloading spaCy model..."
python -m spacy download en_core_web_sm --quiet 2>/dev/null || true

echo "→ Downloading NLTK data..."
python -c "import nltk; nltk.download('stopwords', quiet=True); nltk.download('punkt', quiet=True)" 2>/dev/null || true

echo ""
echo "✓ Backend ready! Starting on http://localhost:8000"
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
