#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0
cd "$CLAUDE_PROJECT_DIR"

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js|*.css|*.json|*.jsonc|*.md|*.mdx|*.yaml|*.yml)
    npm run --silent format:file -- "$FILE" >&2 || exit 2 ;;
esac

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js)
    npm run --silent lint:file -- "$FILE" >&2 || exit 2 ;;
esac

case "$FILE" in
  *.md|*.mdx)
    npm run --silent textlint:file -- "$FILE" >&2 || exit 2 ;;
esac

npm run --silent spell:file -- "$FILE" >&2 || exit 2
exit 0
