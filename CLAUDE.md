## Quality tools

- Formatting: Prettier (auto-applied on edit via Claude Code hook)
- Linting: ESLint (auto-fixable issues applied; unfixable surface to you)
- Prose linting: textlint on MDX (Japanese + English rules)
- Spell check: cspell (add new proper nouns to `cspell.json`)
- Typecheck: `npm run check` (not run per-edit; run before claiming done)

**Before ending a task, run `npm run verify`.** CI will block merges on failures.
