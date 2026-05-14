#!/usr/bin/env bash
set -euo pipefail

REPO_BASE="/browser-search-tool"
REPLACEMENTS=("/_next/" "/favicon.ico" "/manifest.json")

npm run build
rm -rf docs && cp -R out docs

for pattern in "${REPLACEMENTS[@]}"; do
  find docs -name '*.html' -exec sed -i "s|${pattern}|${REPO_BASE}${pattern}|g" {} +
done

echo "Done. docs/ updated with base path ${REPO_BASE}."