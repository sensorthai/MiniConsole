#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Mini Game Console 3D — Cross-Platform Server Installer (macOS / Linux / Unix)
# Checks required components (Node.js >= 18, npm, dependencies, Next.js build)
# and auto-installs anything missing.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

NODE_MIN_MAJOR=18
NODE_FALLBACK_VERSION="v22.11.0"
LOCAL_NODE_DIR="$HOME/.local/node-$NODE_FALLBACK_VERSION"
PORT="${PORT:-8080}"
AUTO_START=0

for arg in "$@"; do
  case "$arg" in
    --start) AUTO_START=1 ;;
    --port=*) PORT="${arg#*=}" ;;
  esac
done

log()  { printf "\033[1;36m[INFO]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ OK ]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[ERR ]\033[0m %s\n" "$*" >&2; }

OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"
log "Detected OS: $OS_NAME ($ARCH_NAME)"

# Add local fallback node to PATH if previously installed
if [ -d "$LOCAL_NODE_DIR/bin" ]; then
  export PATH="$LOCAL_NODE_DIR/bin:$PATH"
fi

check_node_version() {
  if ! command -v node >/dev/null 2>&1; then
    return 1
  fi
  local ver major
  ver="$(node -v | sed 's/^v//')"
  major="${ver%%.*}"
  if [ -z "$major" ] || [ "$major" -lt "$NODE_MIN_MAJOR" ]; then
    return 1
  fi
  return 0
}

install_node_unix() {
  warn "Node.js >= v${NODE_MIN_MAJOR} not found. Auto-installing Node.js ${NODE_FALLBACK_VERSION}..."

  # 1. Try native package managers first
  if [ "$OS_NAME" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    log "Installing Node.js via Homebrew..."
    brew install node@22 || brew install node || true
    if check_node_version; then return 0; fi
  fi

  # 2. Portable official Node.js binary tarball (no root required)
  local node_os="" node_arch=""
  case "$OS_NAME" in
    Darwin) node_os="darwin" ;;
    Linux)  node_os="linux" ;;
    *)      node_os="" ;;
  esac

  case "$ARCH_NAME" in
    x86_64|amd64)  node_arch="x64" ;;
    arm64|aarch64) node_arch="arm64" ;;
    armv7l)        node_arch="armv7l" ;;
    *)             node_arch="" ;;
  esac

  if [ -n "$node_os" ] && [ -n "$node_arch" ]; then
    local pkg_name="node-${NODE_FALLBACK_VERSION}-${node_os}-${node_arch}"
    local url="https://nodejs.org/dist/${NODE_FALLBACK_VERSION}/${pkg_name}.tar.gz"
    local tmp_tgz="/tmp/${pkg_name}.tar.gz"

    log "Downloading $url ..."
    if command -v curl >/dev/null 2>&1; then
      curl -fSL "$url" -o "$tmp_tgz"
    elif command -v wget >/dev/null 2>&1; then
      wget -q "$url" -O "$tmp_tgz"
    else
      err "Neither curl nor wget is available to download Node.js."
      exit 1
    fi

    mkdir -p "$HOME/.local"
    rm -rf "$LOCAL_NODE_DIR"
    tar -xzf "$tmp_tgz" -C "$HOME/.local"
    mv "$HOME/.local/${pkg_name}" "$LOCAL_NODE_DIR"
    rm -f "$tmp_tgz"
    export PATH="$LOCAL_NODE_DIR/bin:$PATH"

    if check_node_version; then
      ok "Installed portable Node.js $(node -v) to $LOCAL_NODE_DIR"
      return 0
    fi
  fi

  # 3. Fallback Linux system package manager
  if [ "$OS_NAME" = "Linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y nodejs npm
    elif command -v yum >/dev/null 2>&1; then
      sudo yum install -y nodejs npm
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm nodejs npm
    elif command -v apk >/dev/null 2>&1; then
      sudo apk add --no-cache nodejs npm
    fi
  fi

  if ! check_node_version; then
    err "Failed to install Node.js >= v${NODE_MIN_MAJOR}. Please install Node.js manually from https://nodejs.org/"
    exit 1
  fi
}

# --- Step 1: Check Node.js & npm ---
if check_node_version && command -v npm >/dev/null 2>&1; then
  ok "Node.js $(node -v) and npm $(npm -v) detected."
else
  install_node_unix
  ok "Node.js $(node -v) and npm $(npm -v) ready."
fi

# --- Step 2: Install npm dependencies ---
if [ -f "package-lock.json" ]; then
  log "Installing npm dependencies (npm ci)..."
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  log "Installing npm dependencies (npm install)..."
  npm install --no-audit --no-fund
fi
ok "Dependencies installed."

# --- Step 3: Build Next.js production bundle ---
log "Building Next.js production server (npm run build)..."
npm run build
ok "Production build complete (.next ready)."

# --- Step 4: Verify server port availability ---
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  warn "Port $PORT is currently in use. You can start on another port with: PORT=8081 ./start.sh"
else
  ok "Port $PORT is available."
fi

chmod +x "$SCRIPT_DIR/start.sh" 2>/dev/null || true

echo ""
echo "================================================================"
echo "  Mini Game Console 3D Server Setup Complete!"
echo "  Start server : ./start.sh"
echo "  Custom port  : PORT=8080 ./start.sh"
echo "================================================================"

if [ "$AUTO_START" -eq 1 ]; then
  exec "$SCRIPT_DIR/start.sh"
fi
