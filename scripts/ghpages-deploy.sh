#!/usr/bin/env bash
set -euo pipefail

REPO_BASE="browser-search-tool"

rm -rf docs && mkdir -p "docs/${REPO_BASE}"

npm run build

cp -Rv out/ "docs/${REPO_BASE}/"
