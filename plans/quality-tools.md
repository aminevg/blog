# Quality tools implementation plan

Adds formatting, linting, typechecking, prose linting, and spell-checking to the bilingual Astro blog, with enforcement at three layers: editor, Claude Code hooks, and CI. This document captures the final decisions reached through grilling and their rationale; skip to Section 10 for the step-by-step implementation order.

---

## 1. Tool choices

| Category           | Tool                                                                   | Notes                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Formatting         | **Prettier** + `prettier-plugin-astro` + `prettier-plugin-tailwindcss` | Only formatter that handles `.astro` JSX-in-`{…}` expressions correctly. Tailwind plugin auto-sorts classes.          |
| Linting (code)     | **ESLint** + `typescript-eslint` + `eslint-plugin-astro`               | Widest rule coverage for `.astro`; used by Astro's own docs repo.                                                     |
| Typechecking       | **`astro check`** only                                                 | Superset of `tsc` — covers `.ts` + `.astro` frontmatter + MDX.                                                        |
| Prose lint (JP/EN) | **textlint** + JP presets + EN rules                                   | JP: `preset-ja-technical-writing` + `preset-smarthr` (with opt-outs). EN: `write-good`, `alex`, `unexpanded-acronym`. |
| Spell check        | **cspell**                                                             | Runs on all files; complementary to textlint. Silent on Japanese.                                                     |
| Editor defaults    | **`.editorconfig`**                                                    | Zero-cost alignment with Prettier.                                                                                    |

### Ruled out — with evidence

- **Biome, oxlint, oxfmt** for linting/formatting. Biome v2.4 _does_ format `.astro` with `html.formatter.enabled`, but leaves JSX inside `{…}` expressions untouched, producing mixed or unrepaired indentation in 9/29 `.astro` files in this repo that use `{items.map((x) => (…))}` patterns. oxfmt does not support `.astro` at all (beta announcement lists Vue but not Astro). oxlint only parses frontmatter `<script>` blocks and catches fewer issues than ESLint (2/5 vs 5/5 on a synthetic violation file).
- **tsc** alongside `astro check`. They report different things (`astro check` reports 22 hints `tsc` misses); two sources of truth create inconsistent signals for AI agents.
- **tsgo**. Alpha, no `.astro` support, no declaration emit. Revisit when Astro ships native support.
- **Stylelint**. Would cover the current 25 `<style>` blocks, but the intent is to move fully to Tailwind. In a Tailwind-only end state, Stylelint's surface approaches zero (Tailwind's PostCSS build catches directive syntax errors; Stylelint can't check class attributes in HTML).
- **eslint-plugin-tailwindcss**. Tailwind v4 support unresolved (GH issue #325 open since March 2024). Revisit if class-level linting becomes a pain point.
- **eslint-plugin-mdx**. Finicky setup (default parser can't handle JSX-in-MDX out of the box); low rule-coverage payoff for 7 MDX files. Prettier handles MDX formatting fine.
- **Pre-commit hooks** (husky, simple-git-hooks, lefthook + lint-staged). User choice — CI is the final gate for humans.
- **Stop hook**. Fires on every turn-end with no matcher; wiring `astro check` (5s) there adds ~1.5min to a 20-turn session. CLAUDE.md + CI cover the gap.
- **commitlint, link checker, size-limit, pa11y** — low ROI for a solo static blog.

---

## 2. Packages to add (devDependencies)

```
prettier
prettier-plugin-astro
prettier-plugin-tailwindcss
eslint
typescript-eslint
eslint-plugin-astro
textlint
@textlint/mdx
textlint-rule-preset-ja-technical-writing
textlint-rule-preset-smarthr
textlint-rule-write-good
textlint-rule-alex
textlint-rule-unexpanded-acronym
cspell
```

Remove from `devDependencies`:

- `@astrojs/check` stays (used by `astro check`).
- `typescript` stays (peer dep of ESLint + Astro).

---

## 3. Configuration files

### `.prettierrc.json`

```json
{
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```

### `.prettierignore`

```
dist/
.astro/
node_modules/
package-lock.json
public/
```

### `eslint.config.mjs`

```js
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  { ignores: ["dist/", ".astro/", "node_modules/", "public/"] },
];
```

**Note:** config order matters. `tseslint.configs.recommended` first, then `eslintPluginAstro.configs.recommended` — verified empirically. Inverted order produces `Parsing error: Expression expected` on all `.astro` files because typescript-eslint's parser clobbers the astro-eslint-parser assignment.

### `.textlintrc.json`

```json
{
  "plugins": {
    "@textlint/markdown": { "extensions": [".mdx"] }
  },
  "rules": {
    "preset-ja-technical-writing": {
      "no-exclamation-question-mark": false,
      "ja-no-weak-phrase": false
    },
    "preset-smarthr": {
      "prh-rules": false,
      "@textlint-rule/pattern": false
    },
    "write-good": true,
    "alex": true,
    "unexpanded-acronym": {
      "ignore_acronyms": [
        "SRE",
        "API",
        "CLI",
        "CI",
        "CD",
        "HTTP",
        "URL",
        "DNS",
        "AWS",
        "GCP",
        "HTML",
        "CSS",
        "JS",
        "TS",
        "JSON",
        "YAML",
        "MDX",
        "RSS",
        "OG",
        "UI",
        "UX",
        "PR",
        "FAQ"
      ]
    }
  }
}
```

**Rationale for opt-outs:**

- `no-exclamation-question-mark` — blog prose permits ! and ?.
- `ja-no-weak-phrase` — blog tone permits "かもしれない".
- `prh-rules` — SmartHR house dictionary (e.g., `一つ → 1つ`). Personal voice preferred.
- `@textlint-rule/pattern` — SmartHR house patterns.
- `ja-space-between-half-and-full-width` stays ON per explicit decision.

### `cspell.json`

```json
{
  "version": "0.2",
  "language": "en",
  "ignorePaths": [
    "node_modules/**",
    "dist/**",
    ".astro/**",
    "package-lock.json",
    "public/**"
  ],
  "words": [
    "Amine",
    "Ilidrissi",
    "aminevg",
    "Astro",
    "SmartHR",
    "Tailwind",
    "mdx",
    "frontmatter"
  ]
}
```

Project wordlist grows as new proper nouns appear. Expect ~20-30 additions in the first weeks, then silence.

### `.editorconfig`

```ini
root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

---

## 4. `package.json` scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "textlint": "textlint \"src/content/**/*.{md,mdx}\"",
    "textlint:fix": "textlint --fix \"src/content/**/*.{md,mdx}\"",
    "spell": "cspell \"**/*.{astro,ts,mjs,md,mdx,json,css}\"",
    "verify": "npm run format:check && npm run lint && npm run textlint && npm run spell && npm run check"
  }
}
```

**Remove** the current `typecheck` script (redundant with `check`).

---

## 5. Claude Code hook

### `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/quality-check.sh"
          }
        ]
      }
    ]
  }
}
```

### `.claude/hooks/quality-check.sh`

```bash
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
```

Make executable: `chmod +x .claude/hooks/quality-check.sh`.

**Behavior:** sequential, fail-fast. First tool that reports an unfixable issue causes the hook to exit with code 2; Claude Code feeds the tool's stderr back to the agent as feedback. Tool-agnostic fixable issues (Prettier reformat, ESLint autofix, textlint autofix) are applied silently.

**Why exit 2 not exit 1:** for PostToolUse hooks, exit 1 only shows the first line of stderr to the agent. Exit 2 feeds full stderr back. The difference matters when ESLint emits 4 errors — the agent needs all of them, not just the first, to fix in a single response.

**Scope:** `.claude/` paths are project-local to this worktree. When merging, confirm `.claude/` is not in `.gitignore`.

---

## 6. CI — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run verify
      - run: npm run build
```

Single job, sequential. Runtime target: <2 min. Parallelize into separate jobs only if it grows past that.

Does **not** gate deploy — deploys remain manual via `wrangler deploy`. If Cloudflare Workers Builds is wired later, CI can be a required check.

---

## 7. Editor setup

### `.vscode/extensions.json`

```json
{
  "recommendations": [
    "astro-build.astro-vscode",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "3w36zj6.textlint",
    "streetsidesoftware.code-spell-checker",
    "bradlc.vscode-tailwindcss",
    "editorconfig.editorconfig"
  ]
}
```

### `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["astro", "javascript", "typescript"],
  "[astro]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "textlint.languages": ["markdown", "mdx"]
}
```

---

## 8. `CLAUDE.md` additions

Add a short section at the top level (or create the file if absent):

```markdown
## Quality tools

- Formatting: Prettier (auto-applied on edit via Claude Code hook)
- Linting: ESLint (auto-fixable issues applied; unfixable surface to you)
- Prose linting: textlint on MDX (Japanese + English rules)
- Spell check: cspell (add new proper nouns to `cspell.json`)
- Typecheck: `npm run check` (not run per-edit; run before claiming done)

**Before ending a task, run `npm run verify`.** CI will block merges on failures.
```

---

## 9. Trade-offs accepted

| Trade-off                                                  | Mitigation                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| No pre-commit: humans can push unformatted code            | CI catches it; extra round trip acceptable for solo blog              |
| No Stop hook: agents can claim done with a type error      | CLAUDE.md instructs `npm run verify`; CI catches what the agent skips |
| cspell wordlist grows early                                | One-time cost; silent after first few weeks                           |
| textlint only lints `src/content/**/*.{md,mdx}`            | Intentional — prose quality matters on published content, not READMEs |
| `astro check` not in PostToolUse hook                      | Per-edit cost too high (5s); run manually or via CI                   |
| `prh-rules` and pattern rules from SmartHR preset disabled | Personal voice over company style; revisit if authoring for SmartHR   |
| `eslint-plugin-mdx` skipped                                | Revisit if MDX-specific linting becomes a felt gap                    |

---

## 10. Implementation order

Execute in this order. Each step is independent — you can stop after any step and still have a working intermediate state.

### Step 1 — Baseline config (editor + Prettier)

1. Create `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `.vscode/extensions.json`, `.vscode/settings.json`.
2. Install: `prettier prettier-plugin-astro prettier-plugin-tailwindcss`.
3. Add `format` / `format:check` scripts.
4. Run `npm run format` once to baseline the repo.
5. Commit: "Add Prettier + editor config."

### Step 2 — ESLint

1. Create `eslint.config.mjs`.
2. Install: `eslint typescript-eslint eslint-plugin-astro`.
3. Add `lint` / `lint:fix` scripts.
4. Run `npm run lint:fix` — address any remaining errors.
5. Commit: "Add ESLint with Astro + TypeScript plugins."

### Step 3 — Typecheck consolidation

1. Remove `typecheck` script (`tsc --noEmit`).
2. Confirm `check` script remains (`astro check`).
3. Run `npm run check` — address any hints.
4. Commit: "Consolidate typechecking on `astro check`."

### Step 4 — textlint

1. Create `.textlintrc.json`.
2. Install: `textlint @textlint/mdx textlint-rule-preset-ja-technical-writing textlint-rule-preset-smarthr textlint-rule-write-good textlint-rule-alex textlint-rule-unexpanded-acronym`.
3. Add `textlint` / `textlint:fix` scripts.
4. Run `npm run textlint:fix` — manually review unfixable findings on existing posts.
5. Commit: "Add textlint for JP + EN prose linting."

### Step 5 — cspell

1. Create `cspell.json` with initial wordlist.
2. Install: `cspell`.
3. Add `spell` script.
4. Run `npm run spell` — add legitimate proper nouns to `cspell.json` until clean.
5. Commit: "Add cspell for code + content spell-checking."

### Step 6 — `verify` + CI

1. Add `verify` script that chains all checks.
2. Create `.github/workflows/ci.yml`.
3. Push a test commit to confirm CI passes.
4. Commit: "Add `verify` script and CI workflow."

### Step 7 — Claude Code hook

1. Create `.claude/hooks/quality-check.sh`; make executable.
2. Create `.claude/settings.json` with PostToolUse hook.
3. Confirm `.claude/` is tracked (not in `.gitignore`).
4. Verify by editing a file via Claude Code and observing hook output.
5. Commit: "Add Claude Code PostToolUse hook for quality checks."

### Step 8 — `CLAUDE.md`

1. Add the "Quality tools" section to `CLAUDE.md`.
2. Commit: "Document quality tools in CLAUDE.md."

---

## 11. Open questions for future work

- **English spell-check via textlint instead of cspell.** If cspell proves too noisy, `textlint-rule-en-spell` could replace it for MDX-only coverage (losing code-side spell check).
- **Tailwind class linting.** `eslint-plugin-better-tailwindcss` may land v4 support; revisit if class-level bugs appear.
- **Stop hook with dirty-flag pattern.** If agents ship type errors despite CLAUDE.md, add a scoped Stop hook that runs `astro check` only when code files were touched this turn.
- **tsgo.** Revisit when Astro supports it natively and it exits preview.
