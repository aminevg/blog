import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";
import { postSlug, talkSlug } from "~/lib/content";
import { SITE } from "~/config/site";

type PageData = {
  title: string;
  description: string;
  kind: "post" | "talk" | "page";
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

const talks = await getCollection("talks");
for (const entry of talks) {
  const key = `${entry.data.lang}/talks/${talkSlug(entry)}`;
  pages[key] = {
    title: entry.data.title,
    description: entry.data.description,
    kind: "talk",
    locale: entry.data.lang,
  };
}

const aboutPages = await getCollection("pages");
for (const entry of aboutPages) {
  const key = `${entry.data.lang}/about`;
  pages[key] = {
    title: entry.data.title,
    description: entry.data.description,
    kind: "page",
    locale: entry.data.lang,
  };
}

for (const locale of SITE.locales) {
  pages[`${locale}/home`] = {
    title: SITE.title,
    description: SITE.description[locale],
    kind: "page",
    locale,
  };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page: PageData) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [247, 244, 238],
      [237, 228, 215],
    ],
    border: {
      color: [123, 45, 38],
      width: 8,
      side: "inline-start",
    },
    padding: 80,
    font: {
      title: {
        color: [26, 21, 18],
        size: 64,
        weight: "SemiBold",
        families: [
          "Fraunces",
          "Source Serif 4",
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "Noto Serif JP",
          "Georgia",
          "serif",
        ],
      },
      description: {
        color: [79, 71, 62],
        size: 28,
        families: [
          "Source Serif 4",
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "Noto Serif JP",
          "Georgia",
          "serif",
        ],
      },
    },
  }),
});
