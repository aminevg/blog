# Switch from npm to Bun

Migrate the blog's toolchain from npm + Node to Bun as the package manager, task runner, **and** runtime for all tools where evidence supports it. Mixed fallback is allowed: a tool that misbehaves under Bun's runtime stays on Node runtime without reverting the rest of the migration. This document captures the decisions reached through grilling and their rationale; skip to Section 7 for the step-by-step implementation order.

---

## 1. Goal & scope

**Why**: faster installs and faster per-script startup. Bun documents `bun run` startup at ~6ms vs npm's ~170ms on Linux ([bun docs](https://bun.sh/docs/cli/run)); the Claude Code hook `quality-check.sh` invokes four `npm run` subcommands after every edit, so that overhead is felt every turn. Install speedups are secondary but welcome.

**Scope**: everything under Bun — package manager, task runner, and runtime for every tool. ESLint, Prettier, textlint, cspell, `astro check`, `astro build`, `astro dev` all invoked via `bun --bun x <tool>` so that Bun's `--bun` flag overrides the Node shebang in `node_modules/.bin/*`. This is the most ambitious of the three scopes considered; scope (1) (PM only) and scope (2) (PM + Astro runtime only) were rejected because the user explicitly opted into running everything under Bun with per-tool flagging for tools that misbehave.

**Out of scope**:

- **Cloudflare Workers deploy path**. Workers is not configured yet; when it is, set the build command to `bun run build` and `BUN_VERSION=<pin>` in the dashboard. Auto-detection of lockfile → package manager is **not** documented for Workers Builds ([build image docs](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)), so the build command must be explicit.
- **Bun version pinning**. Intentionally skipped. CI's `setup-bun@v2` falls back to `latest` when neither `packageManager` nor `engines.bun` nor `bun-version`/`bun-version-file` is set. Devs install whatever Bun they have. Accept the drift tradeoff for simplicity; revisit if versions diverge painfully.
- **Rewrites to existing plan docs** (`plans/implementation.md`, `plans/quality-tools.md`). They reference `npm` as historical artifacts; not live docs.

---

## 2. Runtime-forcing mechanism

Plain `bun run eslint .` **does not** run ESLint under Bun. Bun resolves `eslint` to `node_modules/.bin/eslint`, which is a Node-shebang'd JS file, and by default Bun honors the shebang and spawns Node. To actually run a tool under Bun's runtime, use `bun --bun x <tool>` (the `--bun` flag on `bunx` forces Bun even when a Node shebang is present — [docs](https://bun.sh/docs/cli/bunx)).

**Convention**: every leaf script in `package.json` that invokes a binary uses `bun --bun x <tool>`. Aggregate scripts (e.g., `verify`) chain `bun run <sub-script>` — the `--bun` lives in the leaves. The Claude Code hook calls `bun run <script>`; no `--bun` needed at that layer because the leaves enforce it.

**Rejected alternatives**:

- **Global env-var runtime switch**: no such switch exists in Bun.
- **Shebang rewriting**: brittle; `bun install` would revert it.
- **Wrapper scripts**: unnecessary indirection.

---

## 3. Per-tool fallback policy

**Fallback = mixed config**. If a tool fails the correctness or performance gate under Bun's runtime (see Section 5), its script drops the `--bun` flag and becomes `bun x <tool>` — Node shebang honored, Node runs that one tool, the rest of the migration stands. This requires keeping Node available locally and in CI until we've confirmed nothing uses it.

**"Flag for review" means the user makes the final call per flagged tool.** The implementation is not a single non-stop push; it hits a checkpoint after benchmarks + correctness diffs are in, and waits on user decisions before finalizing.

---

## 4. CI structure

`.github/workflows/ci.yml` moves from `actions/setup-node@v4` + `npm ci` + `npm run <task>` to:

```yaml
- uses: actions/checkout@v4
- uses: oven-sh/setup-bun@v2
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
- run: bun install --frozen-lockfile
- run: bun run ${{ matrix.task }}
```

**Kept**: the task matrix (`format:check | lint | textlint | spell | check | build`) — parallel failures, clear signal on which gate broke.

**`setup-node` kept initially**: supports the mixed-fallback path (Section 3). If post-checkpoint nothing is flagged, `setup-node` and `.nvmrc` both get removed in the same PR — no need for a follow-up.

**`bun install --frozen-lockfile`**: equivalent of `npm ci`. Prevents silent lockfile mutations in CI.

**Cache**: `setup-bun@v2` caches Bun's global install cache when a lockfile is present. No explicit `cache:` input needed.

---

## 5. Benchmark + correctness matrix (ephemeral)

Run before the checkpoint. **Not committed** — results go in the commit message and/or a comment on the eventual PR. No benchmark harness scripts added to the repo.

**Machine identity captured inline**: OS, CPU, RAM, Bun version, Node version, npm version. Results without machine context are meaningless.

**Variants compared** (for each command):

- **Baseline**: `npm` + Node (current state, from a second clean checkout or before Bun changes are applied).
- **V1**: `bun install` + `bun run` (no `--bun` → Node runtime). Isolates how much win comes from Bun-as-PM alone.
- **V2**: `bun install` + `bun --bun x` (Bun runtime). The target state.

**Commands benchmarked with `hyperfine`** (`--warmup 3 --runs 10`, cold installs `--prepare 'rm -rf node_modules' --runs 5`):

| Command                   | Why                           |
| ------------------------- | ----------------------------- |
| `install` (cold)          | install speed, empty cache    |
| `install` (warm)          | no-op install speed           |
| `astro build`             | production build, deploy path |
| `astro check`             | typecheck                     |
| `format:check`            | Prettier full-repo            |
| `lint`                    | ESLint full-repo              |
| `textlint`                | textlint on MDX               |
| `spell`                   | cspell full-repo              |
| `verify`                  | aggregate gate                |
| `format:file` on 1 MDX    | hook latency                  |
| `lint:file` on 1 `.astro` | hook latency                  |
| `textlint:file` on 1 MDX  | hook latency                  |
| `spell:file` on 1 file    | hook latency                  |
| full `quality-check.sh`   | end-to-end per-edit hook cost |

**`astro dev` is not benchmarked** — just smoke-tested that it starts and serves `/en/` under `bun --bun x astro dev`. Measuring time-to-ready reliably would require a custom harness; not worth it here.

**File targets for file-level benches**: pinned to a specific longest MDX under `src/content/blog/<locale>/` and a representative `.astro` under `src/pages/`, chosen at run time and recorded in the results.

**Correctness diff** (blocking): stdout capture of `lint`, `textlint`, `spell` in V1 and V2, diffed against baseline. Any divergence in diagnostics set → flag.

**Pass/fail thresholds**:

1. **Correctness (blocking)**: same exit code, same diagnostics set. Any delta = flag.
2. **No crashes / stack traces** during runs.
3. **Performance (soft)**: V2 should not be **>20% slower** than the best baseline/V1 number for that command. Slower-by-a-lot → flag.

---

## 6. Checkpoint & finalization

**Checkpoint after benchmarks + correctness**: per-tool table reported to user — passes under Bun runtime? perf delta vs baseline? recommended final config. User makes per-flagged-tool calls.

**Possible outcomes**:

- **Nothing flagged**: drop `actions/setup-node@v4` and `.nvmrc` in the same commit as the Bun switch. Final state is Bun-everywhere, no Node installed on CI.
- **Some tools flagged**: those scripts become `bun x <tool>` (Node runtime for that one tool). Keep `setup-node` and `.nvmrc`. PR description calls out which tools and why.

After user decisions land, finalize the branch; do **not** open a PR — the user will open it.

---

## 7. Step-by-step implementation order

1. **Install Bun** locally (`curl -fsSL https://bun.sh/install | bash`). Record version.
2. **`bun install`** → generates `bun.lock`. Delete `package-lock.json`.
3. **Rewrite `package.json` scripts** — every binary-invoking leaf uses `bun --bun x <tool>`; aggregate `verify` uses `bun run <sub-script>`.
4. **Rewrite `.claude/hooks/quality-check.sh`** — replace four `npm run --silent X -- "$FILE"` with `bun run X "$FILE"`.
5. **Update `CLAUDE.md:11`** — `npm run verify` → `bun run verify`.
6. **Update `.github/workflows/ci.yml`** per Section 4.
7. **Run benchmark + correctness matrix** (Section 5). Capture machine identity, numbers, and correctness diffs.
8. **Checkpoint** — report to user; wait for per-flagged-tool decisions.
9. **Apply user decisions**: flagged tools → `bun x` (no `--bun`). Unflagged tools stay on `bun --bun x`.
10. **If nothing flagged**: delete `.nvmrc`, drop `setup-node` step from CI.
11. **Commit** with benchmark summary in message. Do not open PR.

---

## 8. Sources

- Astro Bun recipe: <https://docs.astro.build/en/recipes/bun/>
- Bun ecosystem / Astro guide: <https://bun.sh/guides/ecosystem/astro>
- `bunx --bun` flag: <https://bun.sh/docs/cli/bunx>
- `bun run` startup claim: <https://bun.sh/docs/cli/run>
- Bun install speed claim: <https://bun.sh/docs/cli/install>
- `bun.lock` text-format default (v1.2+): <https://bun.sh/docs/install/lockfile>
- `oven-sh/setup-bun@v2`: <https://github.com/oven-sh/setup-bun>
- Cloudflare Workers Builds image (Bun + `BUN_VERSION`): <https://developers.cloudflare.com/workers/ci-cd/builds/build-image/>
- Cloudflare Workers Builds configuration (build command override): <https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>
- `astro-og-canvas` uses `canvaskit-wasm` (no native canvas bindings): <https://github.com/delucis/astro-og-canvas/blob/latest/packages/astro-og-canvas/package.json>
