import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { SITE } from "~/config/site";
import type { Locale } from "~/config/site";
import { getPosts, getTalks, postSlug } from "~/lib/content";
import { postUrl } from "~/lib/paths";

export async function getStaticPaths() {
  return SITE.locales.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = async ({ params, site }) => {
  const locale = params.lang as Locale;
  const origin = (site ?? new URL("https://blog.aminevg.dev")).origin;

  const posts = await getPosts(locale);
  const talks = await getTalks(locale);

  const items = [
    ...posts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `${origin}${postUrl(locale, postSlug(entry))}`,
      categories: ["post"],
    })),
    ...talks.map((entry) => ({
      title: `[Talk] ${entry.data.title}`,
      description: entry.data.description,
      pubDate: entry.data.eventDate,
      link: entry.data.slidesUrl,
      categories: ["talk"],
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${SITE.title} — ${locale.toUpperCase()}`,
    description: SITE.description[locale],
    site: site ?? "https://blog.aminevg.dev",
    items,
    customData: `<language>${locale}</language>`,
  });
};
