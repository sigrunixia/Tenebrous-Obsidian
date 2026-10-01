#!/usr/bin/env bash
# Build the theme, then deploy the results into the Tenebrous vault.
#
#   ./build.sh              build everything and copy it into the vault
#   ./build.sh --publish    also push publish.css and publish.js to Obsidian Publish
#   ./build.sh --build-only build into this repo only, touch nothing in the vault
#
# Only publish.css and publish.js are ever pushed to the live site, and only
# with --publish. Published notes are not touched; publish those on their own.
# VAULT overrides the vault path, VAULT_NAME the Obsidian CLI vault name.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
VAULT="${VAULT:-/Users/Signia/Vaults/Tenebrous}"
VAULT_NAME="${VAULT_NAME:-Tenebrous}"

DEPLOY=1
PUBLISH=0
for arg in "$@"; do
  case "$arg" in
    --publish)    PUBLISH=1 ;;
    --build-only) DEPLOY=0 ;;
    *) echo "Unknown option: $arg" >&2; echo "Usage: build.sh [--publish] [--build-only]" >&2; exit 2 ;;
  esac
done

if [ "$PUBLISH" = 1 ] && [ "$DEPLOY" = 0 ]; then
  echo "--publish needs the deploy step; drop --build-only." >&2
  exit 2
fi

# Build
sass --no-source-map "$DIR/src/main.scss" "$DIR/theme.css"
echo "Built theme.css"
sass --no-source-map "$DIR/src/main-publish.scss" "$DIR/publish.css"
echo "Built publish.css"
sass --no-source-map "$DIR/src/main-landing-snippet.scss" "$DIR/landing-preview.css"
echo "Built landing-preview.css"
sass --no-source-map "$DIR/src/main-contact-snippet.scss" "$DIR/contact-preview.css"
echo "Built contact-preview.css"

cp "$DIR/src/publish.js" "$DIR/publish.js"
node "$DIR/build-index.js" "$VAULT" >/dev/null
echo "Built publish.js"

[ "$DEPLOY" = 1 ] || exit 0

# Deploy. The vault keeps its own manifest.json, so only theme.css is copied
# into the theme folder.
if [ ! -d "$VAULT/.obsidian" ]; then
  echo "No vault at $VAULT, skipping deploy." >&2
  exit 1
fi

cp "$DIR/theme.css"           "$VAULT/.obsidian/themes/Tenebrous/theme.css"
cp "$DIR/landing-preview.css" "$VAULT/.obsidian/snippets/landing-preview.css"
cp "$DIR/contact-preview.css" "$VAULT/.obsidian/snippets/contact-preview.css"
cp "$DIR/publish.css"         "$VAULT/publish.css"
cp "$DIR/publish.js"          "$VAULT/publish.js"
echo "Deployed to $VAULT (theme, snippets, publish.css, publish.js)"

if [ "$PUBLISH" = 1 ]; then
  for f in publish.css publish.js; do
    obsidian publish:add vault="$VAULT_NAME" file="$f"
  done
fi
