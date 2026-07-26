#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
sass --no-source-map "$DIR/src/main.scss" "$DIR/theme.css"
echo "Built theme.css"
