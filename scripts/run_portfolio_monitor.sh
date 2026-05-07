#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
python -m portfolio_monitor --config config.yaml run-if-due --send
