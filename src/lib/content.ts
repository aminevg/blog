import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "~/config/site";

export type PostEntry = CollectionEntry<"posts">;
export type TalkEntry = CollectionEntry<"talks">;

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
