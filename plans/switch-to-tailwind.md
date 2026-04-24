# Switch to Tailwind

## 1. Goal & scope

Migrate every `<style>` block in `src/` to utility-first Tailwind v4. Tailwind and `@tailwindcss/vite` are already installed; this plan is about converting how styling is expressed, not adopting a new tool.

Design is preserved. Where Tailwind's default scale doesn't match a value exactly and the nearest named utility is within ~5%, the nearest utility wins. Larger divergences get a named token in `@theme`. Arbitrary values (`text-[0.95rem]`, `-mr-[21rem]`) are last resort and only used where no native utility and no reusable token exist.

This is not a redesign. Typography, palette, spacing rhythm, layout are all ported verbatim (with minor perception-level nudges where a named Tailwind utility approximates the original).

Not in scope:

- Breakpoint-based responsive (typography stays fluid via clamp-backed tokens; one layout breakpoint at 62rem survives for sidenotes).
- Content model changes (posts, talks schema, i18n strings).
- Any change documented in `switch-to-tufte.md` that isn't already in the current worktree.
- Re-evaluating MDX component designs.

## 2. Philosophy & rules

**Pragmatic utilities-first.** Utilities in markup handle ordinary property-level rules (padding, color, flex, font-family). CSS in `@layer base` handles document-level concerns Tailwind expresses awkwardly: base element typography, `::selection` (moved to `<body>` utilities below), focus rings via `@utility`, `a { color: inherit }` safety net.

**Scoped when possible, global when necessary.** No Astro `<style is:global>` anywhere after this migration. Where a component needs CSS (exactly one file: none, after Sidenote goes full Tailwind), a scoped `<style>` is used. Cross-component styling contracts use `@utility` or inline arbitrary variants; `:global(...)` is not needed anywhere.

**Preference order for expressing a rule**:

1. Native Tailwind utility (e.g., `text-sm`, `antialiased`, `font-features-['sups']`)
2. Utility fed by a named `@theme` token (e.g., `text-hero` backed by `--text-hero`)
3. Arbitrary utility value (e.g., `leading-[1.5]`)
4. Arbitrary property syntax (e.g., `[font-variant:small-caps]`) — escape hatch
5. `@utility` registration in `global.css` — only when a pattern repeats and has a name worth giving

**Primitive components for repeated patterns.** A `<Link>` component handles every anchor (color-inherit, hover-oxblood, focus-ring). A `<CardLink>` component owns the whole-card hover-highlight pattern used by the three listings.

**JS hooks via data attributes, not class names.** Classes do styling; `data-*` attributes flag DOM nodes for JS. This only matters where JS is present — currently only in Sidenote.astro after the script moves there.

## 3. Theme changes

### 3.1 Palette token renames

Utility names like `bg-bg`, `text-fg`, `accent-accent` read awkwardly because the semantic-token name collides with the utility-family prefix. Rename to palette-descriptive names so utilities read as `bg-paper text-ink accent-oxblood`.

| Current                    | New                             | Utility reads as  |
| -------------------------- | ------------------------------- | ----------------- |
| `--color-bg` (cream paper) | `--color-paper`                 | `bg-paper`        |
| `--color-fg` (ink)         | `--color-ink`                   | `text-ink`        |
| `--color-fg-muted`         | `--color-ink-muted`             | `text-ink-muted`  |
| `--color-fg-subtle`        | `--color-ink-subtle`            | `text-ink-subtle` |
| `--color-rule`             | `--color-rule` (unchanged)      | `border-rule`     |
| `--color-accent` (oxblood) | `--color-oxblood`               | `accent-oxblood`  |
| `--color-highlight`        | `--color-highlight` (unchanged) | `bg-highlight`    |
| `--color-surface`          | `--color-surface` (unchanged)   | `bg-surface`      |

Both light and dark blocks in `global.css` update to the new names. No value changes.

### 3.2 Typography tokens (new)

Fluid display sizes live as named tokens, not inline arbitrary `text-[clamp(...)]`. Typography is fluid (clamp-backed) across the whole site; layout is the only thing that uses a breakpoint.

```css
@theme {
  --text-hero: clamp(2.75rem, 6vw, 4.5rem); /* Masthead title */
  --text-display: clamp(2.25rem, 5vw, 3.5rem); /* Post title */
  --text-page-title: clamp(2rem, 5vw, 3rem); /* 404 title */
  --text-standing-title: clamp(2rem, 5vw, 2.75rem); /* About h1 */
  --text-entry-title: clamp(
    1.4rem,
    3vw,
    1.875rem
  ); /* Home + blog + talks entry titles */
}
```

Blog and talks entry titles use the same token; home entries are unified to it (§9.5).

### 3.3 Spacing tokens (new)

BaseLayout's fluid page padding also becomes named tokens:

```css
@theme {
  --spacing-page-y: clamp(2.5rem, 5vw, 4rem);
  --spacing-page-x: clamp(1.25rem, 4vw, 2rem);
}
```

Used as `px-page-x pt-page-y pb-12 mx-auto max-w-[60rem]` on the page wrapper.

### 3.4 Breakpoint reset

Tailwind's default breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) are deliberately wiped. The site doesn't use them — typography is fluid, layout uses one bespoke threshold. Removing defaults makes accidental `md:something` fail at build time.

```css
@theme {
  --breakpoint-*: initial;
  --breakpoint-desktop: 62rem;
}
```

`desktop:` and `max-desktop:` are the only viewport-based variants available site-wide. Both are used only inside `Sidenote.astro`.

### 3.5 Body text size

The site's reading size (currently 1.1875rem / 19px on `body` via inheritance) moves to `.tufte-prose` at `1.125rem` (`text-lg` in Tailwind's default scale, ≈ -5% perceptual shift from 19→18px). Other pages with body-size text that currently inherit from `<body>` get `text-lg` on the specific paragraph elements. The `<body>` element no longer sets `font-size` or `line-height`; those propagate through `.tufte-prose` or per-element utilities.

### 3.6 Focus ring

Universal keyboard-focus ring becomes a named utility:

```css
@utility focus-ring {
  &:focus-visible {
    outline: 2px solid var(--color-oxblood);
    outline-offset: 2px;
    border-radius: 2px;
  }
}
```

Applied via the `Link` component (covers every anchor) and manually on non-link interactive elements (currently only the Sidenote button). The old `:where(a, button, …):focus-visible` block in `global.css` is removed.

## 4. Font config change

EB Garamond weight **600** (normal + italic) is added. `font-synthesis: weight` is dropped from `html`.

The Tufte plan's §3.2 stance ("no bold of EB Garamond is loaded; strong maps to semibold via font-synthesis acceptable") is reversed here. The design uses real semibold glyphs instead of stroke-synthesized bold. `.tufte-prose :where(strong) { font-weight: 600; }` now hits a real 600 face with correct kerning and glyph shapes.

`astro.config.mjs` diff:

```diff
  {
    provider: fontProviders.fontsource(),
    name: "EB Garamond",
    cssVariable: "--font-serif-web",
-   weights: [400, 500],
+   weights: [400, 500, 600],
    styles: ["normal", "italic"],
    ...
  }
```

Payload cost: +2 faces (600 normal, 600 italic), ~60 KB at Latin + Latin-extended subsets.

## 5. Base CSS

### 5.1 What stays in `@layer base`

```css
html {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-feature-settings: "kern", "liga", "calt", "onum";
  font-variant-numeric: oldstyle-nums;
  text-rendering: optimizeLegibility;
}

a {
  color: inherit;
}

a:hover {
  color: var(--color-oxblood);
}
```

- `html` keeps document-level typography features that have no utility equivalent (`font-feature-settings`, `font-variant-numeric`, `text-rendering`).
- `-webkit-font-smoothing` and `-moz-osx-font-smoothing` are removed; `antialiased` on `<body>` replaces them.
- `font-synthesis: weight` is removed (§4).
- `a { color: inherit }` + `a:hover` act as a safety net for any anchor that doesn't go through the Link component or the MDX remap. The Link component duplicates this behavior; the base rule catches the edge cases.

### 5.2 What moves to `<body>` utilities

```html
<body
  class="accent-oxblood selection:bg-highlight selection:text-ink min-h-screen antialiased"
></body>
```

- `min-height: 100vh` → `min-h-screen`
- `accent-color: var(--color-oxblood)` → `accent-oxblood`
- Font smoothing (webkit + moz) → `antialiased` (one utility emits both vendor-prefixed rules)
- `::selection { background: var(--color-highlight); color: var(--color-ink) }` → `selection:bg-highlight selection:text-ink` (Tailwind's `selection:` variant cascades — selection on body applies to all text descendants)
- `body { font-size: ...; line-height: ... }` is **not** set (§3.5)

### 5.3 What's deleted from `global.css`

- `.visually-hidden` rule (use `sr-only` — byte-identical)
- `::selection` rule (moved to body utilities)
- `:where(a, button, ...):focus-visible` rule (replaced by `@utility focus-ring`)
- `-webkit-font-smoothing` + `-moz-osx-font-smoothing` on `html`
- `font-synthesis: weight` on `html`

## 6. The `.tufte-prose` component block

Replaces the hand-rolled `.prose` rule in post detail and about. Uses `:where()` to zero element-selector specificity so per-element utility overrides win without `!important`.

```css
@layer components {
  .tufte-prose {
    font-size: 1.125rem;
    line-height: 1.6;
  }

  .tufte-prose :where(p) {
    margin: 0 0 1.25rem;
  }

  .tufte-prose :where(h2) {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 500;
    font-size: 1.5rem;
    margin: 2.5rem 0 0.75rem;
    color: var(--color-ink);
  }

  .tufte-prose :where(h3) {
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 500;
    font-size: 1.25rem;
    margin: 2rem 0 0.5rem;
    color: var(--color-ink);
  }

  .tufte-prose :where(a) {
    text-decoration: underline;
    text-decoration-color: var(--color-rule);
    text-underline-offset: 0.2em;
  }

  .tufte-prose :where(a):hover {
    text-decoration-color: var(--color-oxblood);
  }

  .tufte-prose :where(strong) {
    font-weight: 600;
    color: var(--color-ink);
  }

  .tufte-prose :where(blockquote) {
    border-left: 2px solid var(--color-rule);
    padding-left: 1.25rem;
    font-style: italic;
    color: var(--color-ink-muted);
    margin: 1.5rem 0;
  }

  .tufte-prose :where(hr) {
    border: none;
    border-top: 1px solid var(--color-rule);
    margin: 2.5rem 0;
  }

  .tufte-prose :where(ul, ol) {
    margin: 0 0 1.25rem;
    padding-left: 1.25rem;
  }

  .tufte-prose :where(li) {
    margin-bottom: 0.375rem;
    line-height: 1.6;
  }

  .tufte-prose :where(:not(pre) > code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: var(--color-surface);
    padding: 0 0.25em;
    border-radius: 2px;
  }
}
```

Applied to post body (`<div class="post__body tufte-prose">` — or drop `.post__body` if no other rule needs it) and about body (which drops its bespoke block entirely).

Colors and hover-color for anchors inside prose are handled by the `Link` component via the MDX `{ a: Link }` remap (§7.3). `.tufte-prose :where(a)` handles only text-decoration.

The class name is `tufte-prose` (not `prose`) to avoid any future collision with `@tailwindcss/typography` if someone installs it.

## 7. New primitive components

### 7.1 `Link.astro`

```astro
---
// src/components/ui/Link.astro
// Universal anchor wrapper. Inherits parent color, oxblood on hover,
// keyboard focus ring. Accepts all standard <a> attributes.
import type { HTMLAttributes } from "astro/types";

type Props = HTMLAttributes<"a">;
---

<a class="hover:text-oxblood focus-ring text-inherit" {...Astro.props}
  ><slot /></a
>
```

Used directly in all `.astro` components that render anchors (Masthead, Footer, listings, 404, post detail back-link, talks external links).

### 7.2 `CardLink.astro`

Whole-card anchor with internal `group/card` contract and a hover-highlighted title. Accepts all standard `<a>` attributes; external-link behavior (`target`, `rel`) is passed through as native attrs.

```astro
---
// src/components/ui/CardLink.astro
// Whole-card link with hover-highlight on its title. Used by the home,
// blog listing, and talks listing. Accepts all standard <a> attributes.
import type { HTMLAttributes } from "astro/types";

type Props = HTMLAttributes<"a">;

const { class: className, ...rest } = Astro.props;
---

<a
  {...rest}
  class:list={["group/card block text-inherit no-underline", className]}
>
  <slot name="meta" />
  <h2
    class="text-entry-title text-ink mb-[0.45rem] font-serif leading-[1.2] font-medium tracking-[-0.01em]"
  >
    <span
      class="group-hover/card:from-highlight group-hover/card:to-highlight group-hover/card:bg-linear-to-b group-hover/card:box-decoration-clone group-hover/card:bg-size-[100%_0.3em] group-hover/card:bg-position-[0_85%] group-hover/card:bg-no-repeat"
    >
      <slot name="title" />
    </span>
  </h2>
  <slot name="content" />
</a>
```

Call-site shape (identical across home, blog, talks):

```astro
<li class="entry">
  <CardLink href={href} aria-label={title} target="_blank" rel="noopener">
    <p slot="meta">...</p>
    <Fragment slot="title">{title}</Fragment>
    <p slot="content">...</p>
  </CardLink>
</li>
```

Internal links drop `target` and `rel`; spread handles that naturally.

### 7.3 MDX `{ a: Link }` remap

At every MDX render site, pass the Link component as the `a` override so markdown-authored links get the same styling as direct `<Link>` calls:

```astro
---
import Link from "~/components/ui/Link.astro";
import { render } from "astro:content";

const { Content } = await render(entry);
---

<Content components={{ a: Link }} />
```

Applied in:

- `src/pages/[lang]/blog/[...slug].astro`
- `src/pages/[lang]/about.astro`

(Talks listing no longer renders `<Content />` — §9.4 — so no remap there.)

## 8. MDX component updates

### 8.1 `Callout.astro`

Full utility rewrite. No `<style>` block. Margin-collapse on slotted MDX children uses arbitrary variants.

```astro
<aside
  class="border-rule text-ink-muted my-7 border-l-2 py-1 pl-5 italic [&>:first-child]:mt-0 [&>:last-child]:mb-0"
>
  <slot />
</aside>
```

The `[&>:first-child]:mt-0 [&>:last-child]:mb-0` pair targets direct descendant children without needing `:global()` — replaces the current `:global(> :first-child)` rules.

### 8.2 `Sidenote.astro`

Full Tailwind rewrite. All CSS counter machinery, pseudo-element counter content, and state-dependent display rules expressed via utilities and arbitrary-value escape hatches (unavoidable — CSS counters have no utility). Script moves from `BaseLayout.astro` to `Sidenote.astro` (Astro deduplicates it automatically). JS hooks via `data-sidenote-root`; styling hooks (the old BEM class names) are dropped.

```astro
<span data-sidenote-root class="group relative [counter-increment:sidenote]"
  ><button
    type="button"
    aria-label="Sidenote"
    aria-expanded="false"
    class="text-oxblood desktop:pointer-events-none inline cursor-pointer appearance-none"
    ><sup
      class="font-features-['sups'] text-sm before:content-[counter(sidenote)]"
    ></sup></button
  ><span
    role="note"
    class="border-rule text-ink-muted max-desktop:hidden max-desktop:group-[.is-open]:block desktop:float-right desktop:clear-right desktop:w-72 desktop:m-0 desktop:mb-2 desktop:-mr-84 desktop:p-0 desktop:pl-4 desktop:border-l desktop:border-rule desktop:bg-transparent my-3 block border-l-2 bg-[color-mix(in_oklab,var(--color-surface)_70%,transparent)] py-2 pr-0 pl-4 font-serif text-sm leading-[1.5] italic"
    ><sup
      class="text-oxblood mr-1 font-features-['sups'] not-italic before:content-[counter(sidenote)]"
    ></sup>
    <slot /></span
  ></span
>

<script>
  const mql = window.matchMedia("(min-width: 62rem)");

  document.querySelectorAll("[data-sidenote-root]").forEach((root) => {
    const btn = root.querySelector("button");
    if (!btn) return;

    const sync = () => {
      const visible = mql.matches || root.classList.contains("is-open");
      btn.setAttribute("aria-expanded", String(visible));
    };

    btn.addEventListener("click", () => {
      root.classList.toggle("is-open");
      sync();
    });

    mql.addEventListener("change", sync);
    sync();
  });
</script>
```

Notable utilities:

- `[counter-increment:sidenote]` — CSS counter increment, no utility.
- `font-features-['sups']` — native Tailwind utility for OpenType features (not arbitrary property).
- `before:content-[counter(sidenote)]` — pseudo-element content with dynamic counter value, via `content-[...]` with counter function.
- `bg-[color-mix(in_oklab,var(--color-surface)_70%,transparent)]` — arbitrary background using `color-mix()`.
- `leading-[1.5]` — unitless line-height; Tailwind v4 has no named utility for unitless fractions.
- `-mr-84` — 84 × 0.25rem = 21rem, uses the default `--spacing: 0.25rem`.

The `[counter-reset:sidenote]` directive goes on the `<article>` element in post detail, as an arbitrary utility (§9.7).

### 8.3 `Figure.astro` — deleted

Zero current usages across all `.astro` and `.mdx` in `src/`. Reinstate if and when a post first embeds an image. The Tailwind-utilities version of the component has already been drafted in this conversation and can be recovered from git history if needed.

## 9. Per-file migration notes

### 9.1 `BaseLayout.astro`

- Delete the entire `<style>` block (skip-link + `.page` + `.page__main` all become utilities).
- Delete the `<script is:inline>` block (moves to `Sidenote.astro` per §8.2).
- `<body>` gets the utilities listed in §5.2.
- Skip-link: `<a href="#main" class="absolute -left-[9999px] top-0 z-[100] bg-oxblood px-4 py-2 font-sans text-paper focus-visible:left-4 focus-visible:top-4">Skip to content</a>`. Keeps the skip-link as a raw `<a>` with utilities rather than routing through the `Link` component — its position-absolute offscreen behavior would conflict with `Link`'s focus-ring defaults.
- Page wrapper: `<div class="mx-auto max-w-[60rem] px-page-x pt-page-y pb-12">`.
- `<main>`: `<main id="main" class="min-h-[40vh]">`.

### 9.2 `Masthead.astro`

All utility-migratable. `<style>` block deleted.

- Title (`.masthead__title`): `font-serif font-medium italic text-hero tracking-[-0.01em] leading-[0.95] mb-3`.
- Subtitle: `text-xl text-ink-muted max-w-[34ch] mb-6`.
- Nav container: `font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-muted flex flex-wrap gap-[0.65rem] items-baseline`.
- Separator spans: `text-ink-subtle`.
- Nav anchors become `<Link>` components + additional utilities: `no-underline border-b border-transparent pb-[0.1rem] transition-colors duration-150 hover:border-ink aria-[current=page]:text-ink aria-[current=page]:border-oxblood`.
- Language link: `font-serif italic normal-case tracking-normal text-[0.95rem] font-normal`.

`aria-[current=page]:…` is arbitrary-variant syntax because `aria-current` isn't in Tailwind v4's default `aria-*` variant set. Verify the exact value match (`page`) at implementation time.

### 9.3 `Footer.astro`

All utility-migratable. `<style>` block deleted.

- Container: `mt-16 pt-6 border-t border-rule font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-muted`.
- Nav: `flex flex-wrap gap-[0.65rem] items-baseline`.
- Anchors become `<Link>` with additional utilities: `no-underline text-ink-muted border-b border-transparent pb-[0.1rem] transition-colors duration-150 hover:text-ink hover:border-ink`.
- Separator spans: `text-ink-subtle`.

### 9.4 `[lang]/talks/index.astro`

- Each entry uses `<CardLink>`.
- The `<div class="entry__abstract prose"><Content /></div>` is replaced with `<p class="text-[1.025rem] text-ink-muted max-w-[44em]">{description}</p>` (slot="content").
- `render()` + `Promise.all` in the frontmatter is removed; `talksWithContent` goes away.
- Side effect: the MDX body of each talk file becomes unused. Optional follow-up (not this PR): convert `.mdx` → `.md` and clean up bodies. Tracked in §13.
- `.listing__title`, `.entries`, `.entry`, `.entry__link`, `.entry__title`, `.entry__meta`, `.entry__description`, `.entry__abstract` CSS deleted; utilities replace them at markup level. Specifically:
  - `.listing__title` → `font-serif italic font-medium text-2xl mb-5 text-ink border-b border-rule pb-2`.
  - `.entries` → `list-none m-0 p-0`.
  - `.entry` → `py-6 border-b border-rule last:border-b-0`.
  - `.entry__meta` → `font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-[0.45rem]`.
  - `.entry__description` → `text-[1.025rem] text-ink-muted m-0 max-w-[44em]`.

### 9.5 `[lang]/index.astro` (home)

- `<h1 class="visually-hidden">` → `<h1 class="sr-only">`.
- Preamble paragraph: `<p class="text-[1.125rem] text-ink-muted max-w-[32rem] m-0"><em>{preamble}</em></p>`.
- Section title demoted from `<h2 class="home-section__title">` to `<p class="font-serif italic font-medium text-2xl mb-5 text-ink border-b border-rule pb-2">`. Visually identical; heading hierarchy is now cleaner (no two sibling `h2` levels).
- Entries use `<CardLink>` (same shape as blog/talks, `<h2>` inside `CardLink`). The `--text-home-entry` token is not introduced — home uses `text-entry-title` like the other listings.
- "View all" link: `<p class="font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] mt-4 m-0"><Link href={...} class="text-ink-muted no-underline border-b border-transparent pb-[0.1rem] transition-colors duration-150 hover:text-ink hover:border-ink">→ {strings.home.viewAllPosts}</Link></p>`.
- `<style>` block deleted. `.entry__link:hover` highlight rule gone (baked into `CardLink`).

### 9.6 `[lang]/blog/index.astro`

- Each entry uses `<CardLink>`.
- `.listing__title`, `.entries`, `.entry`, `.entry__*` rewritten as utilities (§9.4 shows the same values).
- `<style>` block deleted. `.entry__link:hover` highlight rule gone (baked into `CardLink`).

### 9.7 `[lang]/blog/[...slug].astro` (post detail)

- Back-link: `<p class="font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] mb-6"><Link href={...} class="text-ink-muted no-underline border-b border-transparent pb-[0.1rem] transition-colors duration-150 hover:text-oxblood hover:border-oxblood">← {strings.post.backToBlog}</Link></p>`.
- `<article class="post">` → `<article class="[counter-reset:sidenote] relative">`. The `.post` class goes away entirely; counter-reset is wired inline.
- Header block (`.post__header`, `.post__kicker`, `.post__title`, `.post__lede`) — utilities:
  - `<header class="mb-8">`
  - Kicker: `<p class="font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-3">`
  - Title: `<h1 class="font-serif italic font-medium text-display tracking-[-0.01em] leading-[1.05] text-ink mb-4">`
  - Lede: `<p class="font-serif text-xl leading-[1.5] text-ink-muted max-w-[44em] m-0">`
- Body: `<div class="tufte-prose relative max-w-[32rem]"><Content components={{ a: Link }} /></div>`. Drops `.post__body` class; the `max-w-[32rem]` and `relative` utilities do the work.
- Footer (`.post__footer`):
  - `<footer class="mt-12 pt-5 border-t border-rule font-serif italic text-ink-muted text-[0.95rem] max-w-[32rem]">`
  - Paragraphs inside: `<p class="my-[0.35rem]">`
  - Anchors via Link; `Link` already has the right colors, add `underline decoration-rule hover:decoration-oxblood hover:text-oxblood` for the underlined-link styling.
- `<style is:global>` block deleted.

### 9.8 `[lang]/about.astro`

- `<article class="prose">` → `<article class="tufte-prose">`. The bespoke prose block in about's `<style is:global>` is deleted; the shared `.tufte-prose` block handles all child element styling.
- About's current `line-height: 1.65` (vs prose's 1.6) is not preserved — the 3% difference is imperceptible; unifying reduces surface.
- About's h1 uses `<h1 class="font-serif italic font-medium text-standing-title tracking-[-0.01em] leading-[1.15] text-ink m-0">` (outside `.tufte-prose` so uses the page-title token, not h2 token).
- Header wrapper: `<header class="mb-10">`.
- MDX render: `<Content components={{ a: Link }} />`.
- `<style is:global>` block deleted.

### 9.9 `404.astro`

- All utility-migratable. `<style>` block deleted.
- Each `<section class="not-found">` → `<section class="my-8">` (with the `lang` attr preserved for accessibility).
- Kicker: `font-sans text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-subtle mb-3`.
- Title: `font-serif italic font-medium text-page-title tracking-[-0.01em] leading-[1.05] text-ink mb-3`.
- Body paragraph: `text-lg text-ink-muted m-0 mb-4 max-w-[32rem]`. (Adds `text-lg` to each of the two — EN and JA — since they currently inherit the now-removed body font-size, per §3.5.)
- CTA paragraph: `text-lg m-0`. Its link uses `<Link>` with the underlined-link styling.
- HR between sections: `<hr class="border-0 border-t border-rule my-10" />`.

## 10. Files deleted / simplified

| Path                                                                                   | Change                                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/components/mdx/Figure.astro`                                                      | Deleted (zero current usages)                                                      |
| `src/styles/global.css` `.visually-hidden` rule                                        | Deleted (use Tailwind `sr-only`; one call site in `[lang]/index.astro:42` updated) |
| `src/styles/global.css` `::selection` rule                                             | Deleted (replaced by `selection:` utilities on `<body>`)                           |
| `src/styles/global.css` `:where(…):focus-visible` rule                                 | Deleted (replaced by `@utility focus-ring`)                                        |
| `src/styles/global.css` `-webkit-font-smoothing` + `-moz-osx-font-smoothing` on `html` | Deleted (replaced by `antialiased` on `<body>`)                                    |
| `src/styles/global.css` `font-synthesis: weight` on `html`                             | Deleted (real bold face loaded — §4)                                               |
| `src/layouts/BaseLayout.astro` `<style>` block                                         | Deleted entirely                                                                   |
| `src/layouts/BaseLayout.astro` `<script is:inline>` block                              | Deleted (moved to `Sidenote.astro`)                                                |
| `src/pages/[lang]/about.astro` `<style is:global>` block                               | Deleted (adopts `.tufte-prose`)                                                    |
| `src/pages/[lang]/blog/[...slug].astro` `<style is:global>` block                      | Deleted (uses utilities + `.tufte-prose`)                                          |
| `src/pages/404.astro` `<style>` block                                                  | Deleted                                                                            |
| `src/pages/[lang]/blog/index.astro` `<style>` block                                    | Deleted                                                                            |
| `src/pages/[lang]/talks/index.astro` `<style>` block                                   | Deleted                                                                            |
| `src/pages/[lang]/index.astro` `<style>` block                                         | Deleted                                                                            |
| `src/components/layout/Masthead.astro` `<style>` block                                 | Deleted                                                                            |
| `src/components/layout/Footer.astro` `<style>` block                                   | Deleted                                                                            |
| `src/components/mdx/Callout.astro` `<style>` block                                     | Deleted                                                                            |
| `src/components/mdx/Sidenote.astro` `<style is:global>` block                          | Deleted                                                                            |
| Optional follow-up                                                                     | `src/content/talks/*/index.mdx` → `.md` (MDX body now unused per §9.4)             |

Net result: **zero `<style>` blocks remain in `src/`** after this migration.

## 11. Implementation phases

Delivered as **one PR** containing the five phases below as logical sections (separate commits). Each phase leaves the site in a working, visually-verifiable state so reviewers can `git checkout` any commit and see the progression.

### Phase 1 — Theme + primitives

Additive only — no existing markup changes rendering yet.

- Rename palette tokens in `global.css` (bg→paper, fg→ink, etc.) — both light and dark `@theme` blocks.
- Add typography tokens (`--text-hero`, `--text-display`, `--text-page-title`, `--text-standing-title`, `--text-entry-title`).
- Add spacing tokens (`--spacing-page-y`, `--spacing-page-x`).
- Add breakpoint reset: `--breakpoint-*: initial;` + `--breakpoint-desktop: 62rem;`.
- Add `@utility focus-ring` block.
- Add `.tufte-prose` block under `@layer components`.
- Update `astro.config.mjs` to load EB Garamond weight 600.
- Remove `-webkit-font-smoothing`, `-moz-osx-font-smoothing`, `font-synthesis: weight` from `html` in `global.css`.
- Delete `.visually-hidden` rule; swap `[lang]/index.astro:42` to `sr-only`.
- Create `src/components/ui/Link.astro`.
- Create `src/components/ui/CardLink.astro`.

Verify: site renders identically to before (palette names are theme-internal; existing CSS variables resolve identically). New utilities / primitives exist but aren't used yet. `bun run verify` passes.

### Phase 2 — MDX components

- Rewrite `Callout.astro` to utilities (§8.1).
- Rewrite `Sidenote.astro` to utilities with `data-sidenote-root` + local script (§8.2).
- Delete `src/layouts/BaseLayout.astro` `<script is:inline>` block (now in Sidenote).
- Delete `src/components/mdx/Figure.astro`.

Verify: post pages that use `<Sidenote>` render correctly in both narrow (inline disclosure) and wide (gutter) viewports. Callouts render with margin-collapsed children. No build errors from missing Figure imports.

### Phase 3 — Layout shell

- Rewrite `Masthead.astro` to utilities (§9.2). Use `<Link>` for anchors.
- Rewrite `Footer.astro` to utilities (§9.3). Use `<Link>` for anchors.
- Rewrite `BaseLayout.astro` (§9.1): delete `<style>`, add body utilities, utility-only skip-link + page wrapper + main.

Verify: every page shows the correct masthead and footer; nav anchors have keyboard focus rings; language switcher still works; skip-link appears on keyboard focus.

### Phase 4 — Pages

- Rewrite `[lang]/blog/index.astro` (§9.6). Use `<CardLink>`.
- Rewrite `[lang]/talks/index.astro` (§9.4). Use `<CardLink>`; drop `<Content />` in favor of `<p>{description}</p>`.
- Rewrite `[lang]/index.astro` (§9.5). Demote section titles; use `<CardLink>`.
- Rewrite `[lang]/blog/[...slug].astro` (§9.7). Use `.tufte-prose`; apply MDX `{ a: Link }`; `[counter-reset:sidenote]` on `<article>`.
- Rewrite `[lang]/about.astro` (§9.8). Adopt `.tufte-prose`; drop bespoke prose block; apply MDX `{ a: Link }`.
- Rewrite `404.astro` (§9.9). Apply `text-lg` to the four isolated paragraphs.

Verify: every page × narrow/wide × light/dark × EN/JA renders correctly. Hover highlights fire on all three listings. Talks show the short description, not the MDX body.

### Phase 5 — Cleanup + verify

- Search for orphaned class names in `global.css` or leftover selectors in any file. Delete.
- Confirm no `<style>` blocks remain in `src/` (grep `<style`).
- Confirm no `:global(` remains in `src/`.
- Run `bun run verify` (format, lint, textlint, spell, typecheck).
- Final Chrome MCP sweep across all pages (§12).

## 12. Verification

Use **Chrome via the `claude-in-chrome` MCP tools** to visually verify the site at each phase (not just at the end). Matches the convention set by `switch-to-tufte.md` §17 and the project-wide UI-verification mandate in `CLAUDE.md`.

### 12.1 Page × axis matrix

Load each of these in Chrome and verify rendering at minimum:

- Home
- Blog listing
- Talks listing
- At least one post detail (ideally `field-notes-on-sre` since it has real content)
- About
- 404 (visit any nonsense URL)

Each across:

- Light mode (OS preference)
- Dark mode (OS preference toggled — `prefers-color-scheme` responds without reload)
- Narrow viewport (~375px)
- Wide viewport (≥62rem to exercise sidenote gutter)
- English (`/en/`) and Japanese (`/ja/`)

### 12.2 Functional checks

- **Sidenote**: click the superscript on narrow viewport → body reveals inline; click again → collapses. Tab to superscript and press Enter → same behavior. Resize viewport from narrow to wide — sidenote moves into the gutter without JS errors. `aria-expanded` reflects visible state at all widths.
- **Listing hover**: hover over any entry on home/blog/talks → warm-yellow band appears under the title. Hover leaves → band disappears.
- **Keyboard focus**: Tab through every interactive element on at least one page. Every anchor and button gets the oxblood focus ring.
- **Skip-link**: load any page, press Tab — skip-link appears; Enter navigates to `#main`.
- **Language switcher**: click between EN/JA from the masthead on multiple pages.
- **Link hover**: hover over any inline anchor — color transitions to oxblood smoothly (`transition-colors duration-150`).
- **Selection**: drag-select text on any page — highlight is warm yellow, text stays readable.

### 12.3 Pre-close commands

Before declaring the PR ready:

```bash
bun run verify   # format, lint, textlint, spell, typecheck
```

CI will block merges on failures; catch them locally.

## 13. Out of scope / deferred

- **`fluid.tw` plugin** — viable alternative to named clamp tokens; would let us write `~text-5xl/7xl` instead of `text-hero`. Deferred because introducing a plugin adds a dependency in a small-dependency codebase; revisit only if the typography tokens prove annoying to maintain.
- **Breakpoint-based responsive typography** — fully rejected in §1, noted here for the record. Fluid clamp tokens are the single source of truth.
- **Talks `.mdx` → `.md` cleanup** — once `<Content />` is dropped from the listing (§9.4), the MDX body of each talk is unused. Converting to `.md` and trimming the body is a natural follow-up PR. Not blocking this migration.
- **Re-adding `Figure.astro`** — the component is deleted now because it's unused. If a future post wants a captioned image, reinstate with the Tailwind-utilities version drafted during planning (recoverable from this conversation or git history).
- **Additional breakpoints** — the site uses exactly one layout breakpoint (`desktop` at 62rem). If future layouts need another threshold, add a new `--breakpoint-*` token; don't reinstate Tailwind's defaults wholesale.
- **Collapsing 604-style prose across about and post** — about and post both use `.tufte-prose`. If a future design wants them to diverge again, the split point is clear.
- **`@tailwindcss/typography` plugin** — evaluated in planning (vs hand-rolled `.tufte-prose`); chose hand-rolled because the plugin's defaults conflict with Tufte's (headings, blockquote smart quotes, inline-code backticks). Deferred indefinitely.
- **Unifying transition duration with a `@theme` token** — one value (`duration-150`) used in four places; token would be premature abstraction.

## 14. Small decisions left for implementation-time

- **`aria-current` variant syntax**: `aria-[current=page]:text-ink` works but verify the exact match value (`page` vs unquoted). If Tailwind emits a `aria-current-page` named variant in a future release, switch to the shorter form.
- **`Link` component + skip-link reconciliation**: the skip-link uses `absolute -left-[9999px]` offscreen positioning and needs a bespoke focus-visible reveal. Routing it through `<Link>` would add `focus-ring` utility that conflicts with the skip-link's own focus styling. Keeping it as a raw `<a>` with inline utilities is the call (§9.1); reconsider only if the skip-link style is redesigned.
- **Post-detail back-link styling**: the plan uses `<Link>` with additional `hover:text-oxblood hover:border-oxblood` on top of Link's own `hover:text-oxblood focus-ring`. The hover rules overlap (both target text-oxblood); one could be dropped. Minor bikeshed; take the clearer-reading form at implementation.
- **Image `sizes` hint in `Figure.astro`** — moot since Figure is deleted. If reinstated, decide whether `(min-width: 48rem) 42rem, 100vw` still applies or if the max-width has changed.
- **Talks MDX body handling post-phase-4** — do authors still write the body (for possible future use) or is it empty? Deferred to the cleanup follow-up (§13).
- **`font-features-['sups']` vs register `font-feature-*` custom utility** — native wins; confirmed in planning. Revisit only if more OpenType features get added.
