import type { APIRoute, APIContext } from "astro";
import { ImageResponse } from "@vercel/og";
import { fontData } from "astro:assets";
import { outDir } from "astro:config/server";
import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import { postSlug } from "~/lib/content";
import { SITE, type Locale } from "~/config/site";
import { t } from "~/i18n/ui";

type Kind = "post" | "blog" | "talks" | "about" | "home";

interface PageData {
  title: string;
  description: string;
  kind: Kind;
  locale: Locale;
  pubDate?: Date;
}

const BG = "#fdf9f0";
const FG = "#161311";
const FG_MUTED = "#5a524a";
const FG_SUBTLE = "#8f857b";
const ACCENT = "#7a1a1a";

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 80;
const BORDER = 8;

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type Style = "normal" | "italic";

// Satori (inside @vercel/og) can't parse woff2 or variable fonts, so pick the
// TTF emitted alongside woff2 by astro.config.mjs.
async function loadFontBinary(
  url: string,
  context: APIContext,
): Promise<ArrayBuffer | Buffer> {
  if (import.meta.env.DEV) {
    const res = await fetch(new URL(url, context.url.origin));
    if (!res.ok) throw new Error(`Font ${url}: ${res.status}`);
    return res.arrayBuffer();
  }
  return readFile(new URL(`.${url}`, outDir));
}

async function loadFonts(context: APIContext) {
  const family = async (cssVariable: string, name: string) => {
    const entries = fontData[cssVariable as keyof typeof fontData];
    if (!entries || entries.length === 0) {
      throw new Error(
        `No font data for ${cssVariable} (${name}). Check the fonts array in astro.config.mjs — the cssVariable must match and weights/styles must be configured.`,
      );
    }
    return Promise.all(
      entries.map(async (entry) => {
        const ttfSrc =
          entry.src.find((s) => "url" in s && s.format === "truetype") ??
          entry.src.find((s) => "url" in s);
        if (!ttfSrc || !("url" in ttfSrc)) {
          throw new Error(`No usable font source for ${name} ${entry.weight}`);
        }
        return {
          name,
          data: await loadFontBinary(ttfSrc.url, context),
          weight: Number(entry.weight) as Weight,
          style: entry.style as Style,
        };
      }),
    );
  };
  const [serif, sans, jp] = await Promise.all([
    family("--font-serif-web", "EB Garamond"),
    family("--font-sans-web", "IBM Plex Sans"),
    family("--font-serif-jp", "Noto Serif JP"),
  ]);
  return [...serif, ...sans, ...jp];
}

// Memoize across OG requests: TTFs are read once and reused for every image.
// In dev, `context` from the first call is captured — fine because every
// route runs against the same dev server origin.
let fontsPromise: ReturnType<typeof loadFonts> | null = null;
function getFonts(context: APIContext) {
  return (fontsPromise ??= loadFonts(context));
}

function monthLabel(date: Date, locale: Locale): string {
  if (locale === "ja") {
    return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

const OG_KICKER: Record<Exclude<Kind, "home">, Record<Locale, string>> = {
  post: { en: "ESSAYS", ja: "記事" },
  blog: { en: "BLOG", ja: "ブログ" },
  talks: { en: "TALKS", ja: "登壇" },
  about: { en: "COLOPHON", ja: "プロフィール" },
};

function kickerFor(page: PageData): string | null {
  if (page.kind === "home") return null;
  const label = OG_KICKER[page.kind][page.locale];
  if (page.kind === "post" && page.pubDate) {
    return `${monthLabel(page.pubDate, page.locale)}  ·  ${label}`;
  }
  return label;
}

type StyleObj = Record<string, string | number>;
type Child = OgNode | string;
interface OgNode {
  type: string;
  props: { style?: StyleObj; children?: Child | Child[] };
}
const el = (
  type: string,
  style: StyleObj,
  children?: Child | Child[],
): OgNode => ({ type, props: { style, children } });

function template(page: PageData, brand: string): OgNode {
  const kicker = kickerFor(page);
  const isHome = page.kind === "home";

  const top: Child[] = [];
  if (kicker) {
    top.push(
      el(
        "div",
        {
          display: "flex",
          fontFamily: "IBM Plex Sans",
          fontWeight: 500,
          fontSize: 28,
          color: FG_SUBTLE,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 48,
        },
        kicker,
      ),
    );
  }
  top.push(
    el(
      "div",
      {
        display: "flex",
        fontFamily: "EB Garamond",
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: isHome ? 96 : 84,
        color: FG,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        marginBottom: 32,
      },
      page.title,
    ),
  );
  if (page.description) {
    top.push(
      el(
        "div",
        {
          display: "flex",
          fontFamily: "EB Garamond",
          fontWeight: 400,
          fontSize: 32,
          color: FG_MUTED,
          lineHeight: 1.4,
          maxWidth: 900,
        },
        page.description,
      ),
    );
  }

  return el(
    "div",
    {
      display: "flex",
      width: WIDTH,
      height: HEIGHT,
      background: BG,
    },
    [
      el("div", {
        display: "flex",
        width: BORDER,
        height: HEIGHT,
        background: ACCENT,
      }),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: PADDING,
          height: HEIGHT,
        },
        [
          el("div", { display: "flex", flexDirection: "column" }, top),
          el(
            "div",
            {
              display: "flex",
              fontFamily: "IBM Plex Sans",
              fontWeight: 500,
              fontSize: 22,
              color: FG_SUBTLE,
              letterSpacing: "0.14em",
            },
            brand,
          ),
        ],
      ),
    ],
  );
}

async function collectPages(): Promise<Record<string, PageData>> {
  const pages: Record<string, PageData> = {};

  const [posts, aboutPages] = await Promise.all([
    getCollection("posts"),
    getCollection("pages"),
  ]);
  for (const entry of posts) {
    pages[`${entry.data.lang}/blog/${postSlug(entry)}`] = {
      title: entry.data.title,
      description: entry.data.description,
      kind: "post",
      locale: entry.data.lang,
      pubDate: entry.data.pubDate,
    };
  }

  for (const entry of aboutPages) {
    pages[`${entry.data.lang}/about`] = {
      title: entry.data.title,
      description: entry.data.description,
      kind: "about",
      locale: entry.data.lang,
    };
  }

  for (const locale of SITE.locales) {
    pages[`${locale}/home`] = {
      title: SITE.title,
      description: SITE.subtitle[locale],
      kind: "home",
      locale,
    };
    const strings = t(locale);
    pages[`${locale}/blog`] = {
      title: strings.listings.postsTitle,
      description: SITE.description[locale],
      kind: "blog",
      locale,
    };
    pages[`${locale}/talks`] = {
      title: strings.listings.talksTitle,
      description: SITE.description[locale],
      kind: "talks",
      locale,
    };
  }

  return pages;
}

export async function getStaticPaths() {
  const pages = await collectPages();
  return Object.entries(pages).map(([route, data]) => ({
    params: { route: `${route}.png` },
    props: data,
  }));
}

export const GET: APIRoute = async (context) => {
  const fonts = await getFonts(context);
  const host = (context.site ?? new URL("https://blog.aminevg.dev")).host;
  const brand = `${SITE.author.name.toUpperCase()}  ·  ${host.toUpperCase()}`;
  return new ImageResponse(
    template(context.props as PageData, brand) as unknown as never,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
};
