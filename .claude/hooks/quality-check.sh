#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0
cd "$CLAUDE_PROJECT_DIR"

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js|*.css|*.json|*.jsonc|*.md|*.mdx|*.yaml|*.yml)
    npx prettier --write "$FILE" >&2 || exit 2 ;;
esac

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js)
    npx eslint --fix "$FILE" >&2 || exit 2 ;;
esac

case "$FILE" in
  *.md|*.mdx)
    npx textlint --fix "$FILE" >&2 || exit 2 ;;
esac

npx cspell "$FILE" >&2 || exit 2
exit 0
