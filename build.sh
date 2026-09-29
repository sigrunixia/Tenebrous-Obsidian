#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
sass --no-source-map "$DIR/src/main.scss" "$DIR/theme.css"
echo "Built theme.css"
sass --no-source-map "$DIR/src/main-publish.scss" "$DIR/publish.css"
echo "Built publish.css"
sass --no-source-map "$DIR/src/main-landing-snippet.scss" "$DIR/landing-preview.css"
echo "Built landing-preview.css"

cp "$DIR/src/publish.js" "$DIR/publish.js"
node "$DIR/build-index.js"
echo "Built publish.js"
