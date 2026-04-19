# Blog implementation plan

A bilingual (English + Japanese) personal blog built with Astro 6 and Tailwind 4, hosting two resource types — blog posts and talk slides — with light/dark theming and native cross-document view transitions. This document captures every architectural decision made during planning; defer visual specifics to the per-variant design exploration (Section 13).

---

## 1. Tech stack

- **Astro 6** — static-only (no SSR adapter).
- **Tailwind CSS 4** — CSS-first configuration via `@theme` and `@custom-variant`.
- **TypeScript** — throughout (`.astro`, `.ts`, `.mdx`).
- **MDX** via `@astrojs/mdx` — for all posts, talks, and the about page.
- **Expressive Code** via `astro-expressive-code` — syntax highlighting + frames + copy button.
- **Cloudflare Workers** — deployment target (Workers Builds from GitHub).
- **Node.js 24 (LTS)** — pinned via `.nvmrc`.

**Skill reminder:** when implementing the 5 design variants (Section 13), use the `frontend-design` skill to generate distinctive production-grade interfaces. The skill produces the actual HTML/CSS per variant; this plan defines the shared infrastructure all variants sit on.

---

## 2. Project structure

```
.
├── plans/
├── public/
│   ├── robots.txt
│   └── (favicon/manifest scaffolding — artwork per variant)
├── src/
│   ├── assets/
│   │   └── fonts/                          # Latin variable font(s), per variant
│   ├── components/
│   │   ├── mdx/                            # Callout, Figure, Video, TweetEmbed, etc.
│   │   ├── layout/                         # Header, Footer, Head
│   │   └── ui/                             # ThemeToggle, LanguageSwitcher, etc.
│   ├── content/
│   │   ├── config.ts                       # Collections + schemas + custom talk loader
│   │   ├── posts/
│   │   │   ├── en/<slug>/index.mdx
│   │   │   └── ja/<slug>/index.mdx
│   │   ├── talks/
│   │   │   ├── en/<slug>/index.mdx
│   │   │   └── ja/<slug>/index.mdx
│   │   └── pages/
│   │       └── about/
│   │           ├── en/index.mdx
│   │           └── ja/index.mdx
│   ├── layouts/
│   ├── pages/
│   │   ├── index.astro                     # bare `/` redirect entry
│   │   ├── 404.astro                       # bilingual 404
│   │   └── [lang]/
│   │       ├── index.astro                 # home
│   │       ├── about.astro
│   │       ├── blog/
│   │       │   ├── index.astro             # full listing
│   │       │   └── [slug].astro            # post detail
│   │       ├── talks/
│   │       │   ├── index.astro
│   │       │   └── [slug].astro
│   │       ├── rss.xml.ts
│   │       └── llms.txt.ts
│   └── styles/
│       └── global.css                      # Tailwind imports, @theme tokens, custom variants
├── wrangler.jsonc
├── astro.config.mjs
├── tsconfig.json
├── package.json
└── .nvmrc
```

**Path alias:** `~/*` → `src/*` in `tsconfig.json` + Vite `resolve.alias`, so MDX imports stay readable.

---

## 3. Content model

### 3.1 Directory layout (Layout 2 — locale-first, folder-per-post)

Each post or talk is a folder under its locale directory, containing `index.mdx` plus colocated assets:

```
src/content/posts/en/my-post/
  index.mdx
  cover.jpg
  diagram.png
```

Translations pair by **same slug across locales** (same folder name under each locale dir). The language switcher (Section 5.3) asserts this pairing at build time.

Accepted tradeoff: images shared between EN and JA versions of the same post are duplicated (one copy under each locale folder). No cross-locale references. Authors keep both copies in sync manually.

### 3.2 `posts` collection schema

- `title: string`
- `description: string` (max 200 chars — for OG/Twitter truncation)
- `pubDate: Date` (sort key on cards and listings)
- `updatedDate: Date | undefined` (shown only on the article page, never on cards)
- `heroImage: image() | undefined` (optional Astro-optimized image, path relative to `index.mdx`, typically `./cover.jpg`)
- `lang: "en" | "ja"`
- `canonicalUrl: string | undefined` (for rel=canonical when mirroring from Zenn etc.)

**Not in v1:** `draft`, `tags`, `readingTime`, `author`, `ogImage` (OG is generated dynamically — see Section 9.4).

### 3.3 `talks` collection schema

- `title: string`
- `description: string` (max 200 — the abstract)
- `event: string` (conference/meetup name)
- `eventDate: Date` (when the talk was given; sort key)
- `slidesUrl: z.string().url()` (outbound link to Speaker Deck / PDF / etc.)
- `venue: string | undefined`
- `videoUrl: z.string().url() | undefined` (recording)
- `lang: "en" | "ja"`
- `thumbnail: image()` — **derived by the custom loader (Section 10), not author-set**. Marked optional in the raw schema to allow `glob()`'s initial populate; guaranteed after loader post-processing.

No `heroImage` field. Authors override the derived thumbnail by committing a file at the convention path (`src/content/talks/<locale>/<slug>/thumbnail.<ext>`) before the loader runs; otherwise the loader fetches one.

**Outbound-only in v1:** cards and detail pages link to `slidesUrl`; no iframe embed. Schema is forward-compatible with a future `type: "embed" | "deck"` discriminator for self-authored Astro/MDX decks.

### 3.4 `about` page content

- `src/content/pages/about/en/index.mdx` and `ja/index.mdx`.
- Editorial long-form prose. Schema: `title`, `description`, `lang`.

### 3.5 Inline images in post bodies

- Body images are colocated alongside `index.mdx` and referenced as `./diagram.png` in Markdown or `<Figure>`.
- Astro 6 auto-optimizes local images referenced via Markdown `![]()`: resize, WebP/AVIF generation, intrinsic dimensions, lazy-loading. No per-image author effort beyond standard syntax.
- MDX `<Figure>` component (in `src/components/mdx/`) wraps `<Image>` with a caption when needed.
- Remote image allowlist in `astro.config.mjs` starts empty; populate on demand.

---

## 4. MDX authoring

- `@astrojs/mdx` integration enabled; all post/talk/about files use `.mdx` (pure-prose posts are indistinguishable from plain Markdown).
- **Explicit per-component imports at the top of each MDX file** — no barrel file, no global registration. Example: `import Callout from '~/components/mdx/Callout.astro'`.
- Each `.astro` component in `src/components/mdx/` declares `export interface Props { ... }` so MDX IntelliSense surfaces prop types, autocomplete, hover info.
- MDX VS Code extension + Astro VS Code extension for full language-server support.

Initial MDX component library (build as needed, one file per component):
- `Callout` (info / warning / note / tip variants)
- `Figure` (captioned image)
- `Video` (YouTube / Vimeo embed wrapper)
- `TweetEmbed` (or future alternatives)

---

## 5. i18n & routing

### 5.1 Astro config

```
i18n: {
  locales: ["en", "ja"],
  defaultLocale: "en",
  routing: {
    prefixDefaultLocale: true,
    redirectToDefaultLocale: true,
  },
  // no `fallback` — missing translations 404 rather than cross-serve
}
```

- **Symmetric URLs:** every page lives under `/en/...` or `/ja/...`. Bare `/` redirects to `/en/`.
- **No fallback.** Requests to `/ja/<slug>` with no Japanese file return 404 (clean SEO, no surprise cross-locale content).

### 5.2 Page-locale routing

- `src/pages/[lang]/...` covers all localized routes.
- `getStaticPaths` queries each collection with `where: { lang }` and yields routes per entry.
- Slug derivation: `glob()` loader produces IDs like `en/my-post/index.mdx`; extract `lang` from the first segment and `slug` from the parent folder.

### 5.3 Language switcher

- Rendered in the site header alongside the theme toggle.
- At build time, for each post/talk, checks whether the sibling translation folder exists.
- If the target locale is missing: switcher shows the target-language label greyed out with **"Only in English" / "日本語のみ"** label. Link is not clickable.
- If present: switcher links to the exact paired URL in the other locale.

### 5.4 hreflang tags

- Shared `<Head>` component emits `<link rel="alternate" hreflang="en" ...>` and `hreflang="ja"` only when both translations exist.
- Always emit `hreflang="x-default"` pointing to the English version.

---

## 6. Dark mode

- **Tri-state:** `light` / `dark` / `system`. Default is `system` — respect `prefers-color-scheme` unless the user has explicitly overridden.
- **Persistence:** localStorage key `theme`. `"light"` / `"dark"` = explicit; absent = system.
- **FOUC prevention:** inline blocking script in `<head>` before CSS. Reads the localStorage key, resolves the effective theme (explicit or `matchMedia`), and sets `data-theme="dark"` or `data-theme="light"` on `<html>` before first paint.
- **Tailwind 4 wiring:** `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` in global CSS. Color tokens in `@theme` with overrides under `[data-theme=dark]`.
- **Toggle UI:** header button cycles light → dark → system → light; icon varies per state.

---

## 7. Typography

### 7.1 Strategy

- **Japanese: system stack only — no web font.** Avoids the multi-MB cost of CJK web fonts.
- **English: one variable Latin web font**, scoped via `unicode-range` to Latin + punctuation. Japanese pages don't download the Latin font.
- **Monospace:** system stack by default (can be swapped to JetBrains Mono per variant).

### 7.2 Verified stacks

**Bilingual fallback body font-family:**
```
system-ui, -apple-system, "Segoe UI", Roboto,
"Hiragino Sans", "Yu Gothic UI", Meiryo, "Noto Sans JP",
sans-serif
```

**Monospace stack:**
```
ui-monospace, "SF Mono", "Cascadia Code",
"JetBrains Mono", Consolas, Menlo, monospace
```

### 7.3 Loading

- `font-display: swap` on every web font.
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Latin variable font.
- Apply `size-adjust` / `ascent-override` / `descent-override` on the `@font-face` fallback if metrics diverge from the web font (prevents layout shift).

### 7.4 Per-variant

- Actual Latin typeface → picked during design-variant exploration (Section 13).
- Decision to add a display font for headings (Josh-style two-font pairing) → per variant.

---

## 8. View transitions

**Native cross-document View Transitions API only. No `<ClientRouter />`.**

- **Global opt-in:** `@view-transition { navigation: auto; }` in global CSS.
- **Root transition:** disabled — `::view-transition-old(root), ::view-transition-new(root) { animation: none; }`. Page body instant-swaps.
- **Named thumbnail morph:** `view-transition-name: thumb-<slug>` applied to:
  - The thumbnail element on card components (home latest-posts / latest-talks, and the blog/talks listings).
  - The hero image on the post/talk detail page.
  The browser morphs position and size across navigation.
- **Header stability:** `view-transition-name: site-header` on the nav element. Since the header is identical across pages, the default morph is imperceptible — effectively persists without requiring Astro's `transition:persist`.
- **Firefox fallback:** plain navigation, no animation. Acceptable graceful degradation.

Browser support: Chrome/Edge 126+, Safari 18.2+, iOS Safari 18.2+, Opera 112+ (~87.8% global per caniuse at time of planning).

---

## 9. Pages

### 9.1 Home (`/en/` and `/ja/`)

- Hero slot (content per design variant).
- **Latest posts** section — 5 most recent by `pubDate`, card grid / list per variant. "View all →" links to `/blog/`.
- **Latest talks** section — 3 most recent by `eventDate`. "View all →" links to `/talks/`.

### 9.2 Full listings

- `/en/blog/` and `/ja/blog/` — all posts for the locale, sorted by `pubDate` desc. Paginated if the archive grows long.
- `/en/talks/` and `/ja/talks/` — all talks for the locale, sorted by `eventDate` desc.

### 9.3 Detail pages

**Post detail** (`/[lang]/blog/[slug]/`):
- `heroImage` (if set), title, `pubDate`, `updatedDate` (if set), rendered MDX body.
- Language switcher reflects whether the sibling translation exists.
- `view-transition-name` on the hero image for the morph from the listing card.

**Talk detail** (`/[lang]/talks/[slug]/`):
- `thumbnail` (always present, via loader), title, `event`, `eventDate`, `venue`, abstract, rendered MDX body.
- Two primary buttons: **"View slides →"** (outbound to `slidesUrl`) and **"Watch recording →"** (outbound to `videoUrl`, if set).
- Markdown body is optional — minimal talk entries just have the metadata-driven header.

### 9.4 About (`/[lang]/about/`)

- Renders the corresponding `pages/about/<locale>/index.mdx` file.
- Editorial long-form prose. Shared page layout.

### 9.5 404

**Single bilingual `src/pages/404.astro`** — shows English and Japanese "Page not found" stacked with two "Home" buttons (`/en/`, `/ja/`). No per-locale 404s, no host-redirect config. Cloudflare Workers serves it for all unrouted requests via `not_found_handling: "404-page"` in `wrangler.jsonc`.

---

## 10. Custom content loader for talks (auto-fetched thumbnails)

The `talks` collection uses a custom Astro content loader that wraps the built-in `glob()` loader and enriches each entry with a resolved `thumbnail: ImageMetadata` at load time. Defined in `src/content/config.ts`.

**What the loader does, in order:**

1. Delegates to `glob({ pattern: "**/*.mdx", base: "./src/content/talks" })` to populate the store with parsed, schema-validated entries.
2. Iterates every entry.
3. For each entry, computes the convention path `src/content/talks/<locale>/<slug>/thumbnail.<ext>`.
4. If the file already exists at that path → skip (cache hit).
5. If it doesn't exist:
   - **CI mode** (`process.env.CI === "true"`): throw with an actionable error — `Talk thumbnail missing for <slug>. Run a local build to fetch and commit the file, then push.` CI build fails.
   - **Local mode**: fetch `slidesUrl`, parse `<meta property="og:image">` from the returned HTML, download the image, write to the target path. Log "fetched — commit before pushing." If the source doesn't yield an og:image (PDF, missing tag, 4xx) → copy the committed `src/content/talks/_fallback.jpg` to the target path. Log "used fallback — review if desired."
6. For each entry (after file existence is guaranteed), call `parseData` with `{ ...entry.data, thumbnail: "./thumbnail.<ext>" }` to run the schema's `image()` helper, which resolves the path to an `ImageMetadata` via Vite's asset pipeline.
7. Write the enriched entry back via `ctx.store.set`.

**Result:** after load, every talk entry has `data.thumbnail` as a proper `ImageMetadata`. Page templates use `entry.data.thumbnail` directly — no `import.meta.glob`, no branching on author-vs-derived.

**Dedup:** the loader also deduplicates fetches across locales. Since Speaker Deck thumbnails are language-agnostic, fetch once and copy into both `en/<slug>/` and `ja/<slug>/` folders.

**Dev ergonomics:** loudly log newly-fetched or fallback-used files so the author remembers to `git add` before pushing.

---

## 11. SEO, feeds, metadata, discoverability

### 11.1 Shared `<Head>` component

Every page renders through it. Emits:
- `<title>` — page title + site title.
- `<meta name="description">` — from frontmatter or a per-page override.
- `<link rel="canonical">` — page's own URL, or `canonicalUrl` frontmatter override for mirrored posts.
- `<link rel="alternate" hreflang="en|ja|x-default">` — only when both translations exist; always emit `x-default` → English URL.
- `<meta property="og:title|description|image|url|type">`.
- `<meta name="twitter:card|title|description|image">` — `twitter:card: summary_large_image`.
- Theme-color for iOS/Android tab bars (light + dark via `media` attribute).

### 11.2 Sitemap

- `@astrojs/sitemap` integration.
- Generates `/sitemap-index.xml` including both locale versions of each URL with `hreflang` alternates.

### 11.3 RSS

- `@astrojs/rss` integration.
- **Two feeds**, one per locale:
  - `/en/rss.xml` — mixed posts + talks in English, chronologically merged (posts by `pubDate`, talks by `eventDate`).
  - `/ja/rss.xml` — same for Japanese.
- Footer links to both feeds.

### 11.4 OG images

- **`astro-og-canvas`** integration, using its `OGImageRoute` helper (the Starlight community's recommended approach, since Starlight itself ships no built-in OG generator).
- Dynamic per-page PNG: title, date, site name, small author avatar. Rendered at build time.
- Default static `/og-default.png` for pages without a specific one (home, about).

### 11.5 llms.txt

- **Hand-rolled via a static Astro endpoint** (`src/pages/[lang]/llms.txt.ts`), not a plugin. Pattern: query the posts and talks collections for the locale, emit llmstxt.org-format Markdown.
- Per-locale: `/en/llms.txt`, `/ja/llms.txt`.
- Format: site title + description + "Posts" section (title + URL + short description per entry) + "Talks" section (same).
- Skip the `llms-small.txt` / `llms-full.txt` variants — we're not a docs site.

### 11.6 robots.txt

- Hand-written static file in `public/robots.txt`, allows all crawlers, points to `/sitemap-index.xml`.

### 11.7 Favicon & web manifest

- Scaffolding in `public/`: `favicon.ico`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `site.webmanifest`.
- Specific artwork chosen per design variant.

---

## 12. Code blocks (Expressive Code)

Configuration in `astro.config.mjs`, modeled on Starlight's approach:

- **Dual themes** — dark + light. Default pair: **Night Owl** (Sarah Drasner). Can be swapped per design variant (GitHub, Rose Pine, Vitesse, etc.).
- **`themeCssSelector`** wired to our `[data-theme='dark']` / `[data-theme='light']` attributes — automatic light/dark switching with the site theme, no extra JS.
- **`customizeTheme` callback** overrides UI chrome (tab bg, border, scrollbar, terminal title bar, button colors) to pull from our own CSS variables. Code token colors still come from the syntax theme; only the frame integrates with the site design system.
- **`styleOverrides`**:
  - `codeFontFamily: var(--font-mono)`
  - `uiFontFamily: var(--font-body)` (tabs/titles in body typography)
  - `codeFontSize`, `codeLineHeight` via CSS variables
  - `frameBoxShadowCssValue: "none"` — flat, embedded-in-flow look
  - Active-tab accent underline: `tab.activeBorder: transparent`, `tab.activeBorderTop: var(--accent)`
  - Scrollbar colors semi-transparent neutral
- **`getBlockLocale`** tied to Astro's page locale so EC's built-in UI strings (copy-button aria-label, etc.) render in `en` or `ja` correctly.
- **`cascadeLayer: "components"`** so site CSS can override cleanly.
- **Features enabled:** copy button (default on), line highlights, diff syntax. Line numbers off by default (per-block `showLineNumbers` override available).

---

## 13. Design variants (5 candidates)

Five directions spanning typographic voice, color temperature, density, hero treatment, card treatment, and motion character. Variants share all infrastructure above — differ only in visual design.

**When implementing each variant, use the `frontend-design` skill.** The skill produces distinctive production-grade interfaces rather than generic AI aesthetics.

1. **"Editorial"** — serif body (Fraunces / Source Serif), warm neutral palette (cream + muted accent), spacious short line-lengths, minimal name-card hero, borderless text-forward cards with small thumbnail right-aligned, still motion.
2. **"Brutalist dev"** — monospace in meta + headings, grotesque sans body, strict grid, sharp corners, monochrome high-contrast + one intense accent, minimal/no hero, compact info-dense cards, still motion.
3. **"Magazine"** — serif display headings (Playfair / Fraunces Display), sans body, cream/off-white bg, burgundy or terracotta accent, optional drop caps, multi-column listings, elaborate editorial hero, image-forward cards, subtle motion.
4. **"Modern product"** — Geist or Inter throughout, cool gray-blue neutral + one saturated accent, crisp card borders with subtle shadows, name-card hero with gradient accent, thumbnail-top card grid, subtle hover choreography.
5. **"Playful"** — friendly rounded sans (Nunito / Bricolage Grotesque), saturated accent (coral, teal, mustard), rounded card corners, expressive hover (card lifts, subtle tilt), small illustrative motif in hero, more chromatic dark mode, expressive motion.

**Per-variant concrete artifacts:**
- Latin web font file(s) in `src/assets/fonts/`.
- Tailwind `@theme` color tokens (light + dark overrides under `[data-theme=dark]`).
- Expressive Code theme pair.
- Favicon / OG default image artwork.
- Hero component implementation.
- Card component styling.
- Optional hover/motion CSS beyond the thumbnail view-transition.

---

## 14. Deployment

- **Cloudflare Workers** via Workers Builds (GitHub integration).
- **No adapter** — the site is fully static, so `@astrojs/cloudflare` is not installed.
- **`wrangler.jsonc`** at repo root with minimum config: `name`, `compatibility_date`, `assets.directory: "./dist"`, `assets.not_found_handling: "404-page"`.
- **Build command:** `astro build`. **Output:** `./dist`.
- **PR previews:** automatic via Workers Builds preview URLs (matches the user's PR-based posting workflow).
- **`CI=true`** is set in Workers Builds; the talks loader uses it to enforce "thumbnail must be committed" in CI.
- **Custom domain:** placeholder in `site:` of `astro.config.mjs`, swapped when a real domain is attached via the Workers dashboard.
- **Node version:** `.nvmrc` pinned to 24 (current LTS).

---

## 15. Analytics

- **Cloudflare Web Analytics**, enabled in the Workers/Cloudflare dashboard. Tiny beacon script (< 1KB), no cookies, GDPR-clean. Zero-config.
- No Google Analytics.

---

## 16. Out of scope for v1 (explicit deferrals)

Each of these is deferred with a rationale and a sketch of how to add it later:

- **Tags / tag pages.** Personal blog launching with a handful of posts — tag pages would be near-empty. Add a `tags: string[]` field to the posts schema and generate `/[lang]/tags/[tag]/` routes when the archive is richer.
- **Search.** Handful of posts doesn't warrant index infrastructure. Add **Pagefind extended** (`npx pagefind_extended`) when the archive passes ~30-40 entries. Accept the known Japanese tokenization limitations (word segmentation only, no inflection handling). If Japanese-search quality becomes a real UX gap, swap to self-hosted Meilisearch with `lindera-jp`.
- **Reading time indicators.** Adds visual noise; often inaccurate for code-heavy posts.
- **`draft` flag.** PR workflow serves as the draft gate.
- **Comments.** No plan.
- **Talk embeds (iframes).** v1 is outbound-only. When self-authored decks become a thing, add a `type: "embed" | "deck"` discriminator to the talks schema.
- **Google Analytics / marketing attribution.** No.

---

## 17. Implementation phases

Suggested sequencing. Each phase is mergeable in a PR.

1. **Foundation** — Astro 6 + Tailwind 4 + TypeScript scaffolding. `.nvmrc`, `tsconfig.json`, `wrangler.jsonc`. Dark mode primitives (tri-state toggle, FOUC script, `data-theme` plumbing). Tailwind `@custom-variant dark`. Typography baseline (bilingual fallback stack, placeholder Latin font).
2. **i18n routing** — `[lang]` dynamic routes. `i18n` config with symmetric URLs, no fallback. Bare-`/` redirect. Language switcher component (initially without the greyed-out-missing logic).
3. **Content collections & schemas** — posts + talks + about collections with the schemas from Section 3. Layout 2 on-disk structure. MDX integration. Path alias `~/*`.
4. **Talks loader** — custom content loader (Section 10). Commit a `_fallback.jpg` placeholder. Test with one talk entry.
5. **Pages & layouts** — home, full listings, post detail, talk detail, about, bilingual 404. Basic markup, not yet styled beyond the Tailwind defaults.
6. **Expressive Code** — integration with Starlight-informed config (Section 12). Default Night Owl theme pair.
7. **View transitions** — `@view-transition`, named thumbnail morph, header stability, Firefox fallback test.
8. **Metadata & feeds** — shared `<Head>`, hreflang logic, sitemap, RSS, robots, llms.txt endpoint, OG generation via `astro-og-canvas`.
9. **Deployment** — connect GitHub repo to Workers Builds. Verify CI `CI=true` picked up by the talks loader. Confirm PR preview URLs work. Enable Cloudflare Web Analytics.
10. **Design variant 1** — pick one of the 5 directions (Section 13), use the `frontend-design` skill to produce the first polished variant. Iterate.
11. **Remaining variants** — generate variants 2-5 in parallel branches. Compare. Choose one as the canonical production design (or merge elements).
12. **Polish & launch** — real favicon/OG artwork, custom domain, content migration if any.

---

## 18. Dependencies (summary)

**Astro integrations:**
- `@astrojs/mdx`
- `@astrojs/sitemap`
- `@astrojs/rss`
- `astro-expressive-code`
- `astro-og-canvas`

**Dev & tooling:**
- `tailwindcss@4` + Vite plugin
- `typescript`
- `wrangler` (Cloudflare CLI for overrides)
- `@types/node`

**No runtime deps added for:**
- Frontmatter parsing (loader uses Astro's `glob` delegate)
- i18n (Astro built-in)
- Analytics (Cloudflare injects beacon in dashboard)
- Dark mode (plain inline script + CSS)
- View transitions (native browser API)

**Plugins explicitly NOT used:**
- `@astrojs/cloudflare` — not needed for static-only.
- `starlight-llms-txt` — Starlight-specific; rolled our own endpoint.
- `<ClientRouter />` — using native cross-document view transitions instead.
- Any barrel file — explicit imports only.
