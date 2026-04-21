import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "~/config/site";

// Content collection IDs use the glob pattern "**/index.mdx" with base pointing
// at the locale-prefixed directory. So an entry id looks like "en/my-slug/index".
// We strip the "/index" suffix and split locale/slug.

export type PostEntry = CollectionEntry<"posts">;
export type TalkEntry = CollectionEntry<"talks">;

// Astro's glob loader strips the trailing "/index" segment — our entry ids are
// already shaped like "en/my-post" or "ja/my-talk". Split locale and slug.
export function extractLocaleAndSlug(id: string): {
  locale: Locale;
  slug: string;
} {
  const [locale, ...rest] = id.split("/");
  return { locale: locale as Locale, slug: rest.join("/") };
}

export function postSlug(entry: PostEntry): string {
  return extractLocaleAndSlug(entry.id).slug;
}

export function talkSlug(entry: TalkEntry): string {
  return extractLocaleAndSlug(entry.id).slug;
}

export async function getPosts(locale: Locale): Promise<PostEntry[]> {
  const all = await getCollection("posts", ({ data }) => data.lang === locale);
  return all.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

export async function getTalks(locale: Locale): Promise<TalkEntry[]> {
  const all = await getCollection("talks", ({ data }) => data.lang === locale);
  return all.sort(
    (a, b) => b.data.eventDate.getTime() - a.data.eventDate.getTime(),
  );
}

export async function postExists(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const all = await getCollection("posts");
  return all.some(
    (entry) => entry.data.lang === locale && postSlug(entry) === slug,
  );
}

export async function talkExists(
  locale: Locale,
  slug: string,
): Promise<boolean> {
  const all = await getCollection("talks");
  return all.some(
    (entry) => entry.data.lang === locale && talkSlug(entry) === slug,
  );
}
