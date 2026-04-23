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
  const origin = site?.origin ?? "https://blog.aminevg.dev";

  const [posts, talks] = await Promise.all([
    getPosts(locale),
    getTalks(locale),
  ]);

  const lines: string[] = [];
  lines.push(`# ${SITE.title}`);
  lines.push("");
  lines.push(`> ${SITE.description[locale]}`);
  lines.push("");

  const postsHeading = locale === "ja" ? "## 記事" : "## Posts";
  lines.push(postsHeading);
  lines.push("");
  for (const entry of posts) {
    const url = `${origin}${postUrl(locale, postSlug(entry))}`;
    lines.push(`- [${entry.data.title}](${url}): ${entry.data.description}`);
  }
  lines.push("");

  const talksHeading = locale === "ja" ? "## 登壇" : "## Talks";
  lines.push(talksHeading);
  lines.push("");
  for (const entry of talks) {
    lines.push(
      `- [[Talk] ${entry.data.title}](${entry.data.slidesUrl}): ${entry.data.description}`,
    );
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
