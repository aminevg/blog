# Switch to Tufte

## 1. Goal & scope

Port the existing **Tufte design exploration** at `src/pages/design-explorations/tufte.astro` to be the canonical, site-wide design, and in the same pass:

- Delete the entire `design-explorations/` directory — no more variants.
- Remove **hero images** from posts and talks everywhere (schema, files, loaders, rendering).
- **Drop talk detail pages** entirely; talks become data-only entries rendered inline on `/talks/`.
- Redesign **OG images** in the Tufte palette — typographic, no embedded thumbnails.
- Convert the **theme toggle** to system-preference-only (no toggle UI).

The exploration stays the design reference. This plan describes the port, the content-model fallout, and the supporting infrastructure work; it does not relitigate the aesthetic (palette, fonts, layout, sidenote mechanic). Where the exploration is silent — post detail pages, 404, OG images — sections below specify the voice.

Not in scope: renaming routes (URLs stay `/blog/…`, `/about/…`); adding tags/categories; content TOC; pagination; analytics; any new page type.

## 2. What gets deleted

### 2.1 Files / directories

| Path                                                          | Reason                                             |
| ------------------------------------------------------------- | -------------------------------------------------- |
| `src/pages/design-explorations/` (entire directory — 6 files) | Exploration superseded by canonical design         |
| `src/pages/[lang]/talks/[...slug].astro`                      | No more talk detail pages                          |
| `src/components/layout/Hero.astro`                            | Replaced by the masthead (§5)                      |
| `src/components/layout/ThemeScript.astro`                     | No theme toggle (§4.3)                             |
| `src/components/ui/ThemeToggle.astro`                         | No theme toggle (§4.3)                             |
| `src/components/ui/TalkCard.astro`                            | Talks render inline on `/talks/` (§10.4)           |
| `src/components/mdx/Video.astro`                              | Dropped — authors use `<Figure>` + a Markdown link |
| `src/components/mdx/TweetEmbed.astro`                         | Dropped — authors use Markdown blockquotes         |
| `src/content/talks-loader.ts`                                 | No thumbnails to fetch                             |
| `src/content/talks/_fallback.jpg`                             | Unused after loader removal                        |
| `src/content/posts/*/cover.jpg`                               | All existing post hero images                      |
| `src/content/talks/*/thumbnail.*`                             | All existing talk thumbnails                       |

### 2.2 Frontmatter fields to remove

- Posts: `heroImage`
- Talks: `thumbnail` (and the field drops out of the schema entirely)

### 2.3 CSS/JS to remove from `src/styles/global.css`

- `view-transition-name: thumb-post-*` and `thumb-talk-*` rules (nothing to morph)
- Dark-theme overrides keyed to `[data-theme="dark"]` — replaced by `prefers-color-scheme` (§4.3)
- Any `@theme` tokens referring to thumbnail/card image chrome

### 2.4 i18n strings to remove (`src/i18n/ui.ts`)

- `theme.light`, `theme.dark`, `theme.system`, `theme.toggleLabel` — no toggle
- `talk.viewSlides`, `talk.watchRecording`, `talk.atEvent`, `talk.on` — repurpose or remove depending on §10.4 final copy
- `post.readingAlsoIn` — dropped (translation is reached via the masthead language switcher; no "Also in …" row in the post footer)

## 3. Typography & fonts

### 3.1 Faces used

| Use                            | Font                                               | Notes                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body + display (Latin)         | **EB Garamond**                                    | Serif, text figures, small caps. Italic for all display (masthead title, post titles, section titles).                                                                                                     |
| Kicker / meta / nav (Latin)    | **IBM Plex Sans**                                  | Small-caps sans for `FEB 3, 2026`, section labels, nav links, footer links, card metadata.                                                                                                                 |
| Body + display (Japanese)      | System mincho cascade → Noto Serif JP web fallback | `"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", serif`. `@font-face` declares Noto Serif JP with `local()` first so it loads only on devices lacking system mincho (Android, bare Linux). |
| Kicker / meta / nav (Japanese) | System sans                                        | `"Hiragino Sans", "Yu Gothic", "Noto Sans CJK JP", sans-serif`. No web-font download.                                                                                                                      |
| Monospace                      | System stack                                       | `ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas, Menlo, monospace`. No web-font download.                                                                                            |

### 3.2 Weights loaded

- EB Garamond: 400 regular, 400 italic, 500 italic (display italic — used for masthead / titles / section headings).
- IBM Plex Sans: 500 regular.
- Noto Serif JP: 400 regular (Android fallback only).

No bold of EB Garamond is loaded; `**strong**` in prose maps to semibold via `font-synthesis` acceptable (explicitly allow in CSS: `font-synthesis: weight;`). Same for IBM Plex Sans bold.

### 3.3 Loading via Astro's font API

Use `astro:fonts` (stable in Astro 6.x). Declare each face with Google Fonts provider, specify weights, styles, subsets (Latin basic + Latin extended for EB Garamond; Japanese for Noto Serif JP). Astro self-hosts the files, injects `<link rel="preload">` on pages that need them, and writes `@font-face` with `size-adjust`, `ascent-override`, and `descent-override` to reduce CLS.

```js
// astro.config.mjs
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  // ...
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "EB Garamond",
        cssVariable: "--font-serif",
        weights: [400, 500],
        styles: ["normal", "italic"],
        subsets: ["latin", "latin-ext"],
      },
      {
        provider: fontProviders.google(),
        name: "IBM Plex Sans",
        cssVariable: "--font-sans",
        weights: [500],
        styles: ["normal"],
        subsets: ["latin", "latin-ext"],
      },
      {
        provider: fontProviders.google(),
        name: "Noto Serif JP",
        cssVariable: "--font-serif-jp",
        weights: [400],
        styles: ["normal"],
        subsets: ["japanese"],
        fallbacks: ["Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "serif"],
      },
    ],
  },
});
```

### 3.4 Feature flags & details

Global on all serif prose:

```css
html {
  font-family:
    var(--font-serif), "Hiragino Mincho ProN", "Yu Mincho", YuMincho,
    var(--font-serif-jp), serif;
  font-feature-settings: "kern", "liga", "calt", "onum"; /* old-style nums */
  font-variant-numeric: oldstyle-nums;
  text-rendering: optimizeLegibility;
}
```

Small-caps kicker / meta:

```css
.kicker,
.meta,
nav a,
.footer a {
  font-family:
    var(--font-sans), "Hiragino Sans", "Yu Gothic", "Noto Sans CJK JP",
    sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 500;
}
```

## 4. Palette & tokens

### 4.1 Light mode (primary)

Ported verbatim from the exploration (`src/pages/design-explorations/tufte.astro`):

| Token               | Value                       | Use                                                       |
| ------------------- | --------------------------- | --------------------------------------------------------- |
| `--color-bg`        | `#fdf9f0`                   | Page background (warm cream)                              |
| `--color-fg`        | `#161311`                   | Body text                                                 |
| `--color-fg-muted`  | `#5a524a`                   | Meta, description, captions                               |
| `--color-fg-subtle` | `#8f857b`                   | Kickers, dividers                                         |
| `--color-rule`      | `#c9bfad`                   | Thin rules, borders, sidenote left border                 |
| `--color-accent`    | `#7a1a1a`                   | Oxblood — sidenote numbers, OG left bar, link hover       |
| `--color-highlight` | `rgba(237, 214, 157, 0.55)` | Warm yellow hover underline on titles                     |
| `--color-surface`   | `#f3ecd9`                   | Slightly darker cream — code block bg, tinted inline code |

### 4.2 Dark mode (system-preference only)

Derived dark Tufte palette. Still "paper at night," not pure black.

| Token               | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| `--color-bg`        | `#1a1614` (deep warm near-black)                        |
| `--color-fg`        | `#e8e1d0` (cream ink)                                   |
| `--color-fg-muted`  | `#a89f8d`                                               |
| `--color-fg-subtle` | `#756e5f`                                               |
| `--color-rule`      | `#3a332d`                                               |
| `--color-accent`    | `#c77670` (muted oxblood — must remain legible on dark) |
| `--color-highlight` | `rgba(237, 214, 157, 0.18)`                             |
| `--color-surface`   | `#231e1a`                                               |

### 4.3 Mode switching

No toggle. System preference only.

```css
/* Light is the default. Dark overrides via media query. */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1614;
    /* ...all dark tokens... */
  }
}
```

Delete `ThemeScript.astro`, `ThemeToggle.astro`. Remove `[data-theme="dark"]` attribute manipulation from any remaining code. The `<html>` element no longer needs `data-theme`. FOUC prevention is moot (system preference applies synchronously via media query).

## 5. Masthead & navigation

Replaces the current `Header.astro` entirely. Created as `src/components/layout/Masthead.astro`; rendered by `BaseLayout.astro` on every page, non-sticky, scrolls off naturally.

### 5.1 Structure

```astro
<header class="masthead">
  <h1 class="masthead__title">
    <a href={homeHref}>Amine Ilidrissi</a>
  </h1>
  <p class="masthead__subtitle">
    <em>{subtitle}</em>
  </p>
  <nav class="masthead__nav">
    <a href={blogHref}>Blog</a>
    <span class="masthead__sep" aria-hidden="true">·</span>
    <a href={talksHref}>Talks</a>
    <span class="masthead__sep" aria-hidden="true">·</span>
    <a href={aboutHref}>About</a>
    {
      otherLocaleHref && (
        <>
          <span class="masthead__sep" aria-hidden="true">
            ·
          </span>
          <a href={otherLocaleHref} class="masthead__lang">
            {locale === "en" ? "日本語" : "English"}
          </a>
        </>
      )
    }
  </nav>
</header>
```

- No kicker ("vol. four, no. iii") — fiction in prototype, cut for production.
- Nav labels unchanged: Blog / Talks / About.
- Language switcher is part of the nav, not a separate UI widget.
- `aria-current="page"` on the nav link matching the current route.
- Grey out the language link and set `aria-disabled="true"` when no translation exists (same logic as current `LanguageSwitcher` — copied into the nav).

### 5.2 Style (ported from exploration)

- Title: italic EB Garamond, 500 weight, `clamp(2.75rem, 6vw, 4.5rem)`, `line-height: 0.95`.
- Subtitle: muted italic serif, `max-width: 34ch`.
- Nav: IBM Plex Sans small-caps, `letter-spacing: 0.14em`, inline, flex-wrap.
- Thin 1px rule in `--color-rule` below masthead, 2rem bottom margin.

### 5.3 Subtitle copy

Deferred to implementation. Default placeholder: `"Notes on software, operations, and the long hours between them."` (from the exploration). Confirm or replace before first commit.

## 6. Footer

Minimal, left-aligned, thin `--color-rule` top border.

```astro
<footer class="footer">
  <nav class="footer__nav" aria-label="Social and syndication">
    <a href="https://x.com/<handle>" target="_blank" rel="me noopener">X</a>
    <span aria-hidden="true">·</span>
    <a href="https://github.com/<handle>" target="_blank" rel="me noopener"
      >GitHub</a
    >
    <span aria-hidden="true">·</span>
    <a href={rssHref}>RSS</a>
  </nav>
</footer>
```

- Links in IBM Plex Sans small-caps, muted color.
- No typography colophon line (explicit decision).
- No copyright, no license line, no build timestamp.
- RSS href is per-locale (`/en/rss.xml` on English pages, `/ja/rss.xml` on Japanese pages).
- `rel="me"` on X and GitHub enables IndieAuth / webmention identity verification at zero cost.

Exact X and GitHub handles: read from `src/config/site.ts` (add `social.x` and `social.github` fields).

## 7. Layout: body column + sidenote gutter

### 7.1 Max-widths

- Default page `max-width`: 60rem (unchanged from today's BaseLayout for listings, home, 404, about).
- Post detail: body column `max-width: 32rem`, right sidenote gutter `22rem` (absolute-positioned sidenotes), only on viewports `>= 62rem`. Below that, body goes to full width and sidenotes fold inline.

### 7.2 Structure

```astro
<article class="post">
  <header class="post__header">...</header>
  <div class="post__body prose">
    <Content />
  </div>
  <footer class="post__footer">...</footer>
</article>
```

```css
.post {
  max-width: 60rem;
  margin: 0 auto;
  padding: ...;
}
.post__body {
  max-width: 32rem;
  position: relative;
}
@media (min-width: 62rem) {
  .post__body {
    padding-right: 0;
  }
  /* sidenote absolute-positions itself at `right: -22rem` relative to its paragraph */
}
```

Listings (`/blog/`, `/talks/`) and about use the 60rem page max-width without the narrow-body treatment — sidenotes don't appear outside post bodies.

## 8. Sidenote primitive

### 8.1 Authoring

```mdx
import { Sidenote } from "~/components/mdx/Sidenote.astro";

Most paging issues are alert-design issues.<Sidenote>The 3am rule — if the
same alert pages you twice in a week, the alert is wrong before the service
is.</Sidenote>
```

Component registered in `src/content.config.ts` (or passed via MDX `components` prop) so authors can use `<Sidenote>` without per-file import. One primitive only — no `<Marginnote>` for unnumbered variants.

### 8.2 Rendered HTML

```html
<span class="sidenote">
  <details class="sidenote__disclosure">
    <summary class="sidenote__ref"><sup>3</sup></summary>
    <aside class="sidenote__body" role="note">
      <sup>3</sup> The 3am rule — if the same alert pages you twice in a week,
      the alert is wrong before the service is.
    </aside>
  </details>
</span>
```

- Auto-numbered via CSS counter on `article.post`:
  ```css
  .post {
    counter-reset: sidenote;
  }
  .sidenote {
    counter-increment: sidenote;
  }
  .sidenote__ref sup::before {
    content: counter(sidenote);
  }
  .sidenote__body sup::before {
    content: counter(sidenote);
  }
  ```
  Component doesn't receive a number prop; the slot is just the note body.
- `<summary>` disclosure triangle reset: `summary { list-style: none; } summary::-webkit-details-marker, summary::marker { display: none; }`.

### 8.3 Behavior

- **Wide (`>= 62rem`):** Sidenote body always visible, absolute-positioned in the right gutter (`right: -22rem; width: 18rem`). `[open]` is set at render time via JS (§8.4). `<summary>` is visible (renders the `<sup>N</sup>`) but has `pointer-events: none` and CSS `display: block !important` on the body so stray keyboard toggles can't hide the body. Cannot be closed. (Tufte canon: marginalia are peripherally available, not dismissible.)
- **Narrow (`< 62rem`):** `<details>` default behavior — closed, showing only `<summary>` as a clickable superscript. Tapping it opens the disclosure; the body shows inline after the summary as a small indented aside (thin `--color-rule` left border, tinted background). Tapping again closes.

### 8.4 Viewport sync

Small inline script in `BaseLayout.astro`:

```html
<script is:inline>
  const syncSidenotes = () => {
    const wide = window.matchMedia("(min-width: 62rem)").matches;
    document.querySelectorAll(".sidenote__disclosure").forEach((d) => {
      d.open = wide;
    });
  };
  syncSidenotes();
  window.addEventListener("resize", syncSidenotes);
</script>
```

Runs synchronously in the document; no FOUC because the CSS-based fallback is correct either way (closed on narrow is the default; JS only forces open on wide, matching the CSS).

### 8.5 Placement constraints

- Sidenotes only appear inside post bodies (`.post__body`). Never on listings, home, about, or 404.
- Inside a sidenote: inline markdown (links, emphasis, inline code). Block elements inside sidenotes are not supported.
- Sidenote content is set in italic EB Garamond, `font-size: 0.95rem`, `line-height: 1.5`, muted color. Superscript marker in oxblood accent.

## 9. Content model changes

### 9.1 Posts

`src/content.config.ts`:

```diff
 const posts = defineCollection({
   loader: glob({ pattern: "**/index.mdx", base: "./src/content/posts" }),
   schema: ({ image }) =>
     z.object({
       title: z.string(),
       description: z.string().max(200),
       pubDate: z.coerce.date(),
       updatedDate: z.coerce.date().optional(),
-      heroImage: image().optional(),
       lang: z.enum(["en", "ja"]),
       canonicalUrl: z.url().optional(),
     }),
 });
```

All existing `src/content/posts/*/index.mdx` get the `heroImage:` frontmatter line stripped. `cover.jpg` files deleted from each post folder.

### 9.2 Talks

Flattened to a `.md` file with a short `description` in frontmatter and the multi-paragraph abstract in the body (so inline markdown — links, emphasis, inline code — renders through Astro's content pipeline on the talks listing). Schema:

```ts
const talks = defineCollection({
  loader: glob({ pattern: "**/index.md", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200), // short summary for RSS, llms.txt, OG, meta
    event: z.string(),
    eventDate: z.coerce.date(),
    slidesUrl: z.url(),
    venue: z.string().optional(),
    videoUrl: z.url().optional(),
    lang: z.enum(["en", "ja"]),
  }),
});
```

Each talk file is `src/content/talks/<locale>/<slug>/index.md`. Example:

```yaml
---
title: "Platform engineering in 2026"
description: "What a platform team actually owns — and what it should refuse to own — after two years of watching the pattern settle."
event: "SRE Next"
eventDate: 2026-02-14
venue: "Tokyo"
slidesUrl: "https://speakerdeck.com/example/platform-engineering-2026"
videoUrl: "https://www.youtube.com/watch?v=example"
lang: en
---
What a platform team actually owns — and what it should refuse to own — after two years of watching the pattern settle.

Notes from two years of watching platform teams coalesce at mid-sized companies. Where the interface lands. Which decisions to delegate. And how to avoid the "gold-plated internal framework" trap.
```

Migration:

- Rename existing `.mdx` → `.md`, keep prose body as the abstract, extract a short one-line summary into the `description` frontmatter, strip `thumbnail` (if present).
- Delete `src/content/talks/*/thumbnail.*`, `src/content/talks/_fallback.jpg`.
- Delete `src/content/talks-loader.ts` and switch to the plain `glob()` loader.
- Update `TalkEntry` type in `src/lib/content.ts` to match the new schema.

### 9.3 Pages

No schema changes. About continues to live at `src/content/pages/about/<locale>/index.mdx`.

## 10. Pages

All pages render through `BaseLayout.astro`, which renders Masthead (§5), a single `<main>` slot, and Footer (§6).

### 10.1 Home — `[lang]/index.astro`

```
[Masthead]

[Preamble paragraph]  ← one short paragraph introducing the site,
                        muted italic serif, max 32rem. Home only.

Blog                   ← section title, italic EB Garamond, thin rule under
[5–6 most recent post entries]  ← PostCard structure (§10.2)
  → view all essays

Talks                  ← section title
[3–4 most recent talks inline]  ← same structure as /talks/ listing (§10.4)
  → view all talks

[Footer]
```

- No `§ 01` / `§ 02` section numbering.
- Preamble copy deferred to implementation; ~1 sentence introducing the site.
- "view all" links go to `/<lang>/blog/` and `/<lang>/talks/`.

### 10.2 Blog listing — `[lang]/blog/index.astro`

List of all posts (all locales for the current language, newest first). Each entry:

```html
<article class="entry">
  <a href="/en/blog/field-notes-on-sre/" aria-label="Field notes on SRE">
    <p class="entry__meta">FEB 3, 2026</p>
    <h3 class="entry__title">Field notes on SRE</h3>
    <p class="entry__description">
      A year of being the on-call for a system that wasn't supposed to have one.
    </p>
  </a>
</article>
```

- Whole card is one `<a>` with `aria-label="{title}"` narrowing the SR name (Astro-starter pattern, verified Q19e).
- Meta kicker: just the date (no reading time, no updated indicator on listings).
- Title hover: warm underline via `background-image` gradient trick (ported from exploration).
- Thin `--color-rule` bottom border between entries; last entry has no border.
- No `<Sidenote>` usage on listings (sidenotes only inside post bodies).

### 10.3 Post detail — `[lang]/blog/[...slug].astro`

```
[Masthead]

← Essays                                    ← small-caps sans back-link

FEB 3, 2026                                 ← small-caps kicker
Field notes on SRE                          ← italic EB Garamond, display
A year of being the on-call for a system    ← lede — description, muted serif
that wasn't supposed to have one.

[Body — prose with sidenotes in right gutter,
 code blocks, figures]

────                                        ← thin rule separator

Updated Mar 14, 2026                        ← if updatedDate set
First published on Zenn ↗                   ← if canonicalUrl set

[Footer]
```

- Back-link: small-caps IBM Plex Sans, muted color, hover to accent. `← Essays` (label unchanged to match Blog/Talks/About nav — should probably read `← Blog` for label consistency; confirm at implementation).
- Date kicker above title.
- Description rendered as lede between title and body, muted body serif, max 44em width. Also emitted as `<meta name="description">` and OG description.
- `updatedDate` and "First published on Zenn" live in the article footer, not the header. Each is optional, conditional on frontmatter. Translations are reached through the masthead language switcher (which falls back to the other-locale home when a direct translation is absent), so no "Also in …" row appears in the footer.
- `canonicalUrl`, when set, also emits `<link rel="canonical">` in head (existing behavior).
- No next/prev navigation, no related posts, no TOC, no byline.

### 10.4 Talks listing — `[lang]/talks/index.astro`

List of all talks for the current language, newest first. There is no talk detail page.

```html
<article class="talk-entry">
  <a href="{slidesUrl}" target="_blank" rel="noopener" aria-label="{title}">
    <p class="talk-entry__meta">SRE NEXT · TOKYO · FEB 14, 2026</p>
    <h3 class="talk-entry__title">Platform engineering in 2026</h3>
    <div class="talk-entry__abstract"><content /></div>
    <p class="talk-entry__action">View slides ↗</p>
  </a>
  {videoUrl && (
  <p class="talk-entry__recording">
    <a href="{videoUrl}" target="_blank" rel="noopener">Watch recording ↗</a>
  </p>
  )}
</article>
```

- Whole card = one `<a>` to slides URL, `aria-label={title}`. "View slides ↗" lives visually inside the card as a secondary affordance but is part of the single wrapping anchor.
- "Watch recording ↗" is a separate `<a>` _outside_ the wrapping anchor (still inside `<article>`) — nested interactives not allowed; recording is a secondary destination and deserves its own focusable link.
- Meta kicker: `EVENT · VENUE · DATE` (venue conditional). Small-caps IBM Plex Sans.
- Abstract is rendered as paragraphs (MD multiline) in muted body serif.
- Thin `--color-rule` bottom border between entries.

### 10.5 About — `[lang]/about.astro`

```
[Masthead]

About                                        ← italic EB Garamond title
                                               (no kicker — standing page)

[MDX body from src/content/pages/about/<locale>/index.mdx]

[Footer]
```

- Title-only header. No date kicker, no description lede line.
- MDX body is free-form prose. Contact info, typography/tooling colophon, whatever the author wants to include. The layout imposes no sections.
- `<Sidenote>` is available but not required.

### 10.6 404 — `404.astro`

```
[Masthead — English nav, /en/ home link]

NOT FOUND                                     ← small-caps kicker
Out of bounds                                 ← italic EB Garamond title
The page you wanted doesn't exist here.       ← italic muted serif, one line
Back to the home page.                        ← plain link to /en/

────                                          ← thin rule

見つかりません                                 ← Japanese version stacked below
このページは存在しません。
ホームに戻る
```

- Bilingual stacked — EN first, thin rule, JA second.
- Masthead is the English variant (nav links to `/en/blog/`, etc.). Readers who wanted JA can language-switch from the masthead.
- No OG image generated for 404 (no one should be sharing a 404).

## 11. MDX components

### 11.1 `<Sidenote>`

See §8. New component. `src/components/mdx/Sidenote.astro`.

### 11.2 `<Callout>` — simplified

Collapse to one variant. No color-coded hues, no icons, no kicker label.

```astro
---
// src/components/mdx/Callout.astro
---

<aside class="callout">
  <slot />
</aside>

<style>
  .callout {
    margin: 1.75rem 0;
    padding: 0.25rem 0 0.25rem 1.25rem;
    border-left: 2px solid var(--color-rule);
    font-style: italic;
    color: var(--color-fg-muted);
  }
  .callout :global(> :first-child) {
    margin-top: 0;
  }
  .callout :global(> :last-child) {
    margin-bottom: 0;
  }
</style>
```

Authors emphasize with `**bold**` in the prose if they need a "Note:" or "Caveat:" label.

### 11.3 `<Figure>` — restyled

Flush image (no border, no rounded corners), italic serif caption below, optional `number` prop for numbered figures.

```astro
---
// src/components/mdx/Figure.astro
import { Image } from "astro:assets";
import type { ImageMetadata } from "astro";

export interface Props {
  src: ImageMetadata | string;
  alt: string;
  caption?: string;
  number?: number;
  widths?: number[];
  sizes?: string;
}

const { src, alt, caption, number, widths, sizes } = Astro.props;
const isMetadata = typeof src !== "string";
---

<figure class="figure">
  {
    isMetadata ? (
      <Image
        src={src}
        alt={alt}
        widths={widths ?? [400, 800, 1200]}
        sizes={sizes ?? "(min-width: 48rem) 42rem, 100vw"}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    )
  }
  {
    caption && (
      <figcaption>
        {number && <span class="figure__number">Figure {number}.</span>}{" "}
        <em>{caption}</em>
      </figcaption>
    )
  }
</figure>

<style>
  .figure {
    margin: 2rem 0;
  }
  .figure :global(img) {
    width: 100%;
    height: auto;
    display: block;
  }
  .figure figcaption {
    margin-top: 0.625rem;
    font-family: var(--font-serif);
    font-size: 0.95rem;
    color: var(--color-fg-muted);
    line-height: 1.5;
  }
  .figure__number {
    font-style: normal;
    font-variant: small-caps;
    letter-spacing: 0.04em;
    color: var(--color-fg-subtle);
  }
</style>
```

### 11.4 `<Video>` and `<TweetEmbed>`

Deleted. Authors substitute:

- Video: `<Figure src={poster} alt="..." caption="..." />` plus a Markdown link to the video.
- Tweet: Markdown blockquote with attribution line; author transcribes the tweet text.

## 12. Code blocks (Expressive Code)

### 12.1 Themes

- Light: **Rose Pine Dawn**
- Dark: **Rose Pine Moon**

Both ship in `expressive-code`'s theme bundle. Configure in `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";

export default defineConfig({
  integrations: [
    expressiveCode({
      themes: ["rose-pine-dawn", "rose-pine-moon"],
      themeCssSelector: (theme) =>
        theme.name === "rose-pine-moon"
          ? "@media (prefers-color-scheme: dark)"
          : ":root",
      // ...frame styles (next)
    }),
  ],
});
```

(Exact API may require a small `customizeTheme` callback or `styleOverrides` block — verify against `astro-expressive-code` 0.41 docs at implementation.)

### 12.2 Frame

Retune EC frame tokens to Tufte palette:

```js
styleOverrides: {
  borderColor: "var(--color-rule)",
  borderRadius: "2px",
  borderWidth: "1px",
  codeBackground: "var(--color-surface)",
  codeFontFamily: "var(--font-mono), ui-monospace, monospace",
  codeFontSize: "0.9rem",
  codeLineHeight: "1.55",
  frameBoxShadowCssValue: "none",
  uiFontFamily: "var(--font-sans), sans-serif",
  uiFontSize: "0.72rem",
  uiFontWeight: "500",
  // filename tab in small-caps:
  frameTabBarBackground: "var(--color-surface)",
  frameTabBorderColor: "var(--color-rule)",
}
```

No rounded corners (2px is visual floor, not ornament). No shadow. File name label in small-caps IBM Plex Sans to match the kicker voice.

### 12.3 Line numbers, copy button, diff markers

- Line numbers: off by default. Authors opt in per block via `{showLineNumbers=true}` meta string.
- Copy button: visible on hover only.
- Diff markers (`+`/`-`): use accent + muted-accent; verify readability at implementation.

### 12.4 Inline code

```css
:not(pre) > code {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.9em;
  background: var(--color-surface);
  padding: 0 0.25em;
  border-radius: 2px;
}
```

## 13. OG images

### 13.1 Technology

Stay with `astro-og-canvas`. Font array must include both Latin (EB Garamond, IBM Plex Sans) and Japanese (mincho — Hiragino Mincho ProN, Yu Mincho, Noto Serif JP; plus Japanese sans fallback for kickers) so bilingual pages render glyphs for both scripts.

### 13.2 Layout (1200×630)

```
┌─────────────────────────────────────────────────┐
┃                                                 ┃
┃   FEB 3, 2026  ·  ESSAYS                       ┃  ← kicker,
┃                                                 ┃    small-caps IBM Plex Sans,
┃                                                 ┃    var(--color-fg-subtle), 28px
┃   Field notes on                                ┃  ← title,
┃   SRE                                           ┃    italic EB Garamond,
┃                                                 ┃    80px, line-height 0.95,
┃                                                 ┃    var(--color-fg)
┃   A year of being the on-call for a            ┃
┃   system that wasn't supposed to have one.     ┃  ← lede,
┃                                                 ┃    EB Garamond roman, 28px,
┃                                                 ┃    var(--color-fg-muted)
┃                                                 ┃
┃                                                 ┃
┃   AMINE ILIDRISSI  ·  BLOG.AMINEVG.DEV         ┃  ← brand line,
┃                                                 ┃    small-caps IBM Plex Sans,
┃                                                 ┃    var(--color-fg-subtle), 22px
└─────────────────────────────────────────────────┘
  ↑ 8px oxblood #7a1a1a left border, full height
```

- Flat cream background (`#fdf9f0`), no gradient.
- Left border 8px, full height, `#7a1a1a`.
- 80px padding on all sides except left border.
- Light-mode palette only (one variant — OG has no dark alternate).

### 13.3 Kickers per page type

| Page          | Kicker text                                                  |
| ------------- | ------------------------------------------------------------ |
| Post          | `{DATE}  ·  ESSAYS`                                          |
| Talks listing | `TALKS`                                                      |
| About         | `COLOPHON`                                                   |
| Home          | (no kicker — site name _is_ the title; subtitle is the lede) |
| 404           | (no OG generated)                                            |

### 13.4 Routes

Current `src/pages/open-graph/[...route].ts` generates routes like `/open-graph/<lang>/blog/<slug>.png`, `/open-graph/<lang>/talks/<slug>.png`, `/open-graph/<lang>/about.png`, `/open-graph/<lang>/home.png`.

Changes:

- Keep: post routes, about, home, talks **listing** (new).
- Remove: per-talk routes (`/open-graph/<lang>/talks/<slug>.png`) — no talk detail URL, no OG target.

Also: `public/og-default.png` can stay as a fallback, but it is rarely hit if every `BaseLayout` instance passes an `ogImage` prop. Regenerate `og-default.png` to match the Tufte design (cream + left border + "Amine Ilidrissi" italic title + site subtitle).

## 14. Outbound plumbing

### 14.1 RSS — `[lang]/rss.xml.ts`

- Posts: `<link>` to internal URL (`https://blog.aminevg.dev/<lang>/blog/<slug>/`), same as today.
- Talks: `<link>` to `slidesUrl` (external). `<description>` is the talk `description` (the short one-liner in frontmatter). `<title>` prefixed with a small marker: `"[Talk] Platform engineering in 2026"` to distinguish in aggregator feeds.
- Order: mixed, sorted by date (`pubDate` for posts, `eventDate` for talks).

### 14.2 llms.txt — `[lang]/llms.txt.ts`

- Posts: list with internal URL.
- Talks: list with `slidesUrl` as the URL, label prefixed with `[Talk]`.
- Structure per llmstxt.org format.

### 14.3 Sitemap — `@astrojs/sitemap`

`astro.config.mjs` uses the sitemap integration. After talk detail pages are deleted, the sitemap will naturally no longer emit those URLs (no route exists). No config change required; just verify after the refactor that the generated `sitemap-0.xml` contains:

- Home (both locales)
- `/blog/`, `/talks/`, `/about/` listings (both locales)
- Every post detail URL (both locales, as they exist)
- No `/talks/<slug>/` URLs

### 14.4 Head metadata — `Head.astro`

- `<link rel="canonical">` — uses `canonicalUrl` from post frontmatter if set, else current URL.
- `<link rel="alternate" hreflang="...">` — only posts and standing pages emit these (talks have no per-locale URL anymore since they route externally).
- `<meta property="og:image">` — points to the per-page OG route; for pages without a generated OG (404), use default.

## 15. i18n

### 15.1 Strings updates — `src/i18n/ui.ts`

Remove:

- `theme.*`

Keep:

- `nav.*` (home/blog/talks/about — labels unchanged)
- `home.*` — may need minor copy tweak for section titles (no `§ 01` numbering)
- `listings.*`
- `post.*` — `published`, `updated`, `firstPublishedOn`, `backToBlog` stay (`readingAlsoIn` removed)
- `talk.*` — prune unused fields; keep `viewSlides`, `watchRecording`, `atEvent`, `on` if used on the new flattened listing
- `languageSwitcher.*`
- `feed.rss`
- `notFound.*` — keep; content moves into `404.astro` directly

### 15.2 Japanese layout parity

- JP pages use the same masthead, same body column structure, same sidenote mechanism.
- No Latin old-style figures or small caps applied to JP glyphs (CSS `font-feature-settings` is a no-op on CJK glyphs anyway).
- Mincho cascade resolves per-glyph: Latin words inside JP sentences render in EB Garamond, JP glyphs in mincho. Verify no noticeable size drift in mixed runs; if present, tune via `size-adjust` on the `@font-face` for Noto Serif JP.

## 16. Implementation phases

One PR per phase. Each phase ends in a working, visually-verifiable state — no broken intermediate commits.

### Phase 1 — Palette, fonts, and token cleanup

- Switch `global.css` `@theme` tokens to Tufte palette (light + dark via `prefers-color-scheme`).
- Configure `astro:fonts` with EB Garamond + IBM Plex Sans + Noto Serif JP.
- Delete `ThemeScript.astro`, `ThemeToggle.astro`, theme-related i18n strings, `[data-theme]` handling.
- Verify: every page renders in Tufte palette; dark mode follows OS; no FOUC.

### Phase 2 — Masthead, footer, BaseLayout

- Create `Masthead.astro`, wire into `BaseLayout.astro`; delete `Header.astro`, `Hero.astro`.
- Rewrite `Footer.astro` (X / GitHub / RSS, thin rule, small-caps sans).
- Add `social.x` and `social.github` to `src/config/site.ts`.
- Verify: masthead and footer appear on every page, layout is clean in EN and JA.

### Phase 3 — Listings (blog + talks flatten)

- Rewrite `PostCard.astro` as Astro-starter-style whole-card `<a aria-label={title}>`.
- Delete `TalkCard.astro`; inline new talk-entry markup in `[lang]/talks/index.astro`.
- Migrate talks content from `.mdx` + MDX bodies to `.md` + markdown body; add a short `description` field; drop `thumbnail`.
- Delete `talks-loader.ts`, `_fallback.jpg`, all `thumbnail.*` files; revert talks collection to plain `glob()` loader.
- Delete `src/pages/[lang]/talks/[...slug].astro`.
- Update talks schema in `content.config.ts` and `TalkEntry` type in `lib/content.ts`.
- Verify: `/blog/` and `/talks/` listings render correctly; talk entries link to slides; recording link is accessible outside the card anchor.

### Phase 4 — Post detail + sidenote primitive

- Rewrite `[lang]/blog/[...slug].astro` with new anatomy (§10.3).
- Create `Sidenote.astro` + supporting CSS + viewport-sync script.
- Remove `heroImage` from post schema and MDX frontmatter; delete all `cover.jpg`.
- Remove view-transition rules for post/talk thumbnails from `global.css`.
- Update `src/content/posts/*/index.mdx` to use `<Sidenote>` where it fits (one or two per post to validate).
- Verify: post detail renders title + lede + body with sidenotes in right gutter on wide; inline disclosure on narrow; `updatedDate` and `canonicalUrl` show in footer when set; cannot close sidenote on wide.

### Phase 5 — Home + about + 404

- Rewrite `[lang]/index.astro` (masthead + preamble + Blog section + Talks section).
- Rewrite `[lang]/about.astro` (title-only header).
- Rewrite `404.astro` (bilingual stacked).
- Confirm masthead subtitle copy and home preamble copy with user; paste into place.
- Verify: home scrollable cleanly; about renders MDX; 404 readable in both languages.

### Phase 6 — MDX components

- Simplify `Callout.astro` to single variant.
- Restyle `Figure.astro` (flush image, italic caption, optional `number` prop).
- Delete `Video.astro` and `TweetEmbed.astro`.
- Sweep existing post MDX for uses of deleted components; replace with Figure + Markdown link (Video) or blockquote (TweetEmbed).
- Verify: existing posts build and render correctly.

### Phase 7 — Expressive Code retune

- Update `astro.config.mjs` EC config: Rose Pine Dawn + Rose Pine Moon, Tufte frame styleOverrides.
- Verify: code blocks in existing posts (field-notes-on-sre has some) read well on cream and on dark, inline code is subtle.

### Phase 8 — OG images

- Rewrite `src/pages/open-graph/[...route].ts` with Tufte layout (§13).
- Remove per-talk OG routes; add talks-listing OG.
- Regenerate `public/og-default.png` in Tufte design.
- Verify: OG preview at `/open-graph/en/blog/<slug>.png` renders correctly in EN and JA; left border prominent; type crisp; brand line present.

### Phase 9 — Outbound plumbing verify

- Confirm RSS emits talks with external `<link>` and `[Talk]` title prefix.
- Confirm llms.txt emits talks with external URLs.
- Confirm sitemap excludes talk detail URLs.
- Confirm `<link rel="canonical">` and `<link rel="alternate" hreflang>` behavior is correct.

### Phase 10 — Design-explorations purge & final cleanup

- Delete `src/pages/design-explorations/` (all 6 files).
- Delete any orphaned CSS, images, types, or i18n strings.
- Run `bun run verify` and fix all issues.
- Visual pass via Chrome (§17) across every page in light/dark × narrow/wide × EN/JA.

## 17. Verification

Use **Chrome via the `claude-in-chrome` MCP tools** (tabs_context_mcp, tabs_create_mcp, navigate, read_page, javascript_tool) to visually verify each page after each phase — not just after the final phase. CLAUDE.md requires UI verification before claiming done; this plan reinforces Chrome specifically.

### 17.1 Page × axis matrix

At minimum, load each page in:

- Light mode (OS preference)
- Dark mode (OS preference toggled)
- Narrow viewport (~375px, mobile)
- Wide viewport (~1280px+, sidenote gutter visible)
- English (`/en/`) and Japanese (`/ja/`)

Pages to check:

- Home
- Blog listing
- At least one post detail (with sidenotes, with `updatedDate`, with `canonicalUrl`)
- Talks listing (verify slides link and separate recording link both click through; verify `aria-label` narrows SR name — test with VoiceOver rotor or NVDA link-list on at least one listing)
- About
- 404 (visit a nonsense URL)

### 17.2 Functional checks

- Sidenote disclosure: tap on narrow opens the aside inline; tap again closes. Keyboard Enter on focused summary same. On wide, sidenote is always visible; keyboard Enter on summary does nothing (CSS force-shows body).
- Viewport resize: drag viewport from wide to narrow and back; sidenotes toggle their `[open]` state correctly (JS sync works).
- Language switcher: link greyed out + `aria-disabled` when no translation exists.
- Footer links: X, GitHub open in new tab with correct handle; RSS downloads/opens the feed.
- OG images: fetch `/open-graph/en/blog/<slug>.png` directly in a browser and verify the render.
- View-transitions: navigate from `/blog/` to a post and back; no broken morph (nothing left that tries to morph after thumbnails are gone).

### 17.3 Verify commands

Before closing each phase: `bun run verify` (format, lint, textlint, spell, typecheck). CI blocks on these anyway; catch them locally first.

## 18. Out of scope / deferred

Listed here so the boundary is explicit. None of these are needed for v1; some may never be needed.

- **Site-level "hide all marginalia" reader-mode toggle** — one evening to add if the Tufte margins ever feel loud in practice (§Q6 A1).
- **`<Marginnote>`** (unnumbered margin aside) — single primitive `<Sidenote>` is sufficient (§Q4).
- **Per-post drop cap** — all-or-nothing-or-opt-in debated in Q17, landed on "none" (§Q17).
- **Reading time on listings or detail pages** (§Q19a).
- **`updatedDate` on listings** — shown only on post detail footer (§Q19c).
- **Next / previous post navigation** — not included (§Q20f).
- **Table of contents on long posts** — not included; can be added per-post if any single post grows over ~4000 words (§Q20g).
- **Byline / author on posts** — personal blog, author is the site (§Q20h).
- **Per-talk OG images** — no detail URL to serve them from (§Q11, §13.4).
- **Route renames** (`/blog/` → `/essays/`, `/about/` → `/colophon/`) — labels stay "Blog / Talks / About", routes unchanged (§Q15).
- **License / copyright notice** — not in footer (§Q23). Add only if a legal reason arises.
- **Tags / categories** on posts — no schema support today, not being added now.
- **Comments, webmentions, replies** — none.
- **Analytics** — none (plan §16 of `implementation.md` deferred this already).

## 19. Small decisions left for implementation-time

Copy and microcontent the author chooses before or during each phase:

- **Masthead subtitle** (every page). Default: _"Notes on software, operations, and the long hours between them."_ from the exploration. Confirm or replace in Phase 2.
- **Home preamble copy** (home only). One short paragraph introducing the site. Draft in Phase 5.
- **About page prose** — bio + contact + any optional colophon paragraph. Drafted in Phase 5.
- **X and GitHub handles** in `src/config/site.ts` — Phase 2.
- **Back-link label on post detail** — currently sketched as "← Essays" in §10.3, but with nav labels staying "Blog / Talks / About" (§Q15), the label should probably read "← Blog" for consistency. Confirm in Phase 4.
- **Recording-link position on talk entries** — sketched as a separate `<a>` outside the main card anchor; verify the visual weight is right in Phase 3, adjust if the recording feels orphaned.
