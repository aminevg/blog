#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0
case "$FILE" in "$CLAUDE_PROJECT_DIR"/*) ;; *) exit 0 ;; esac
cd "$CLAUDE_PROJECT_DIR"

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js|*.css|*.json|*.jsonc|*.md|*.mdx|*.yaml|*.yml)
    bun run format:file "$FILE" >&2 || exit 2 ;;
esac

case "$FILE" in
  *.astro|*.ts|*.mjs|*.js)
    bun run lint:file "$FILE" >&2 || exit 2 ;;
esac

# Match CI: textlint only runs on content under src/content/**.
case "$FILE" in
  "$CLAUDE_PROJECT_DIR"/src/content/*.md|"$CLAUDE_PROJECT_DIR"/src/content/*.mdx)
    bun run textlint:file "$FILE" >&2 || exit 2 ;;
esac

bun run spell:file "$FILE" >&2 || exit 2
exit 0
