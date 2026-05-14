#!/usr/bin/env bash
set -euo pipefail

REPO_BASE="/browser-search-tool"
REPLACEMENTS=("/_next/" "/favicon.ico" "/manifest.json")

echo "ghpages-deploy: starting"
echo "REPO_BASE=${REPO_BASE}"

echo "-> running build: npm run build"
npm run build

# Some Next.js versions (>=16) use `output: "export"` and produce `out/` during
# `next build`. If `out/` already exists, skip legacy `next export`.
if [ -d "out" ]; then
  echo "out/ already created by next build; skipping legacy export"
else
  echo "-> running legacy static export (next export)"
  # prefer an npm script named "export" if present, otherwise fall back to npx
  if npm run | grep -q " export"; then
    npm run export || true
  else
    npx next export || true
  fi
fi

if [ ! -d "out" ]; then
  echo "Error: out/ directory not found after build/export" >&2
  exit 1
fi

echo "-> copying out/ -> docs/"
rm -rfv docs && cp -Rv out docs

echo "-> create docs/.nojekyll to ensure GitHub Pages serves _next/"
touch docs/.nojekyll

echo "Applying replacements to HTML files (skipping files that already contain ${REPO_BASE}/_next)..."
find docs -name '*.html' -print0 | while IFS= read -r -d '' file; do
  if grep -q "${REPO_BASE}/_next/" "$file"; then
    echo "Skipping $file (already contains ${REPO_BASE}/_next/)"
    continue
  fi
  echo "Processing $file"
  for pattern in "${REPLACEMENTS[@]}"; do
    sed -i.bak "s|${pattern}|${REPO_BASE}${pattern}|g" "$file"
  done
  rm -f "${file}.bak"
done

echo "docs/ snapshot (top-level):"
ls -la docs || true

echo "docs/_next file count:"
if [ -d docs/_next ]; then
  find docs/_next -type f | wc -l || true
else
  echo "(no docs/_next directory)"
fi

echo "Head of docs/index.html (first 40 lines):"
head -n 40 docs/index.html || true

echo "Done. docs/ updated with base path ${REPO_BASE}."