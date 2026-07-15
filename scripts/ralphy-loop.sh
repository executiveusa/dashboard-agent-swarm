#!/usr/bin/env bash
set -euo pipefail

PRD_PATH="${1:-PRD.md}"
ENGINE_FLAG="${2:---copilot}"

echo "[ralphy-loop] ensuring ralphy-cli is installed..."
npm install -g ralphy-cli

echo "[ralphy-loop] initializing project config if needed..."
if [ ! -f .ralphy/config.yaml ]; then
  ralphy --init
fi

echo "[ralphy-loop] running autonomous loop with PRD: ${PRD_PATH}"
ralphy ${ENGINE_FLAG} --prd "${PRD_PATH}" --max-retries 3 --retry-delay 5
