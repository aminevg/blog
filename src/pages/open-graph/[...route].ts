import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";
import { postSlug } from "~/lib/content";
import { SITE } from "~/config/site";

type Kind = "post" | "blog" | "talks" | "about" | "home";

type PageData = {
  title: string;
  description: string;
  kind: Kind;
  locale: "en" | "ja";
};

const pages: Record<string, PageData> = {};

const posts = await getCollection("posts");
for (const entry of posts) {
  const key = `${entry.data.lang}/blog/${postSlug(entry)}`;
  pages[key] = {
    title: entry.data.title,
    description: entry.data.description,
    kind: "post",
    locale: entry.data.lang,
  };
}

const aboutPages = await getCollection("pages");
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
  pages[`${locale}/blog`] = {
    title: locale === "en" ? "Blog" : "ブログ",
    description: SITE.description[locale],
    kind: "blog",
    locale,
  };
  pages[`${locale}/talks`] = {
    title: locale === "en" ? "Talks" : "登壇",
    description: SITE.description[locale],
    kind: "talks",
    locale,
  };
}

// Light-mode Tufte palette only. No dark alternate.
const BG: [number, number, number] = [253, 249, 240];
const FG: [number, number, number] = [22, 19, 17];
const FG_MUTED: [number, number, number] = [90, 82, 74];
const ACCENT: [number, number, number] = [122, 26, 26];

const SERIF_FAMILIES = [
  "EB Garamond",
  "Hiragino Mincho ProN",
  "Yu Mincho",
  "Noto Serif JP",
  "Georgia",
  "serif",
];

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page: PageData) => ({
    title: page.title,
    description: page.description,
    bgGradient: [BG, BG],
    border: {
      color: ACCENT,
      width: 8,
      side: "inline-start",
    },
    padding: 80,
    font: {
      title: {
        color: FG,
        size: 80,
        lineHeight: 1,
        weight: "Medium",
        families: SERIF_FAMILIES,
      },
      description: {
        color: FG_MUTED,
        size: 28,
        lineHeight: 1.4,
        weight: "Normal",
        families: SERIF_FAMILIES,
      },
    },
  }),
});
