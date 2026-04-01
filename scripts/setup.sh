#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOSTS_SCRIPT="${SCRIPT_DIR}/setup_hosts_v3.py"

echo "==> WisePenView setup (macOS/Linux)"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js first."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not available. Please reinstall Node.js."
  exit 1
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

if command -v corepack >/dev/null 2>&1; then
  echo "==> Enabling corepack and preparing pnpm..."
  corepack enable
  corepack prepare pnpm@latest --activate
else
  echo "corepack is not available."
  echo "Global install may pollute user environment."
  read -r -p "Allow global pnpm install via npm -g? (y/N): " ALLOW_GLOBAL_PNPM
  if [[ "${ALLOW_GLOBAL_PNPM}" =~ ^[Yy]$ ]]; then
    echo "==> Installing pnpm globally via npm..."
    npm install -g pnpm
  else
    echo "Cancelled. Please install a newer Node.js version (recommended >= 16.13) and retry."
    exit 1
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm installation failed."
  exit 1
fi

echo "pnpm version: $(pnpm -v)"

echo "==> Installing dependencies with pnpm..."
cd "${PROJECT_ROOT}"
pnpm install

if [[ ! -f "${HOSTS_SCRIPT}" ]]; then
  echo "Error: hosts setup script not found at ${HOSTS_SCRIPT}"
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Error: Python is not installed. Cannot run hosts setup script."
  exit 1
fi

echo "==> Running hosts setup script..."
echo "Note: This step may require sudo/admin permission."
"${PYTHON_CMD}" "${HOSTS_SCRIPT}" || true

echo
echo "Setup finished."
echo "You can now start local testing with:"
echo "  npm run mock"
echo "or"
echo "  npm run dev"
echo "If hosts setup shows permission denied, run this script with sudo:"
echo "  sudo bash scripts/setup.sh"
