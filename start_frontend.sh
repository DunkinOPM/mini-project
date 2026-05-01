#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/frontend"

echo "╔══════════════════════════════════════╗"
echo "║   InsightEd — Frontend Setup         ║"
echo "╚══════════════════════════════════════╝"

if [ ! -d "node_modules" ]; then
  echo "→ Installing Node dependencies..."
  npm install
fi

echo ""
echo "✓ Frontend ready! Starting on http://localhost:5173"
echo ""
npm run dev
