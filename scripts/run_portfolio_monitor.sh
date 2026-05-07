#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
python3 -m portfolio_monitor --config config.yaml run-if-due --send
