import type { Locale } from "~/config/site";

// Helpers to build locale-prefixed paths without scattering string templates.

export function localeHome(locale: Locale): string {
  return `/${locale}/`;
}

export function localeAbout(locale: Locale): string {
  return `/${locale}/about/`;
}

export function localeBlog(locale: Locale): string {
  return `/${locale}/blog/`;
}

export function localeTalks(locale: Locale): string {
  return `/${locale}/talks/`;
}

export function postUrl(locale: Locale, slug: string): string {
  return `/${locale}/blog/${slug}/`;
}

export function talkUrl(locale: Locale, slug: string): string {
  return `/${locale}/talks/${slug}/`;
}

export function rssUrl(locale: Locale): string {
  return `/${locale}/rss.xml`;
}

export function llmsUrl(locale: Locale): string {
  return `/${locale}/llms.txt`;
}
