#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NODE_FALLBACK_VERSION="v22.11.0"
LOCAL_NODE_DIR="$HOME/.local/node-$NODE_FALLBACK_VERSION"
if [ -d "$LOCAL_NODE_DIR/bin" ]; then
  export PATH="$LOCAL_NODE_DIR/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERR] Node.js not found. Please run ./install.sh first." >&2
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-8080}"

if [ ! -d ".next" ]; then
  echo "[INFO] .next build folder not found. Running npm run build..."
  npm run build
fi

exec node server.js
