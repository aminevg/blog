export const SITE = {
  title: "Amine Ilidrissi",
  subtitle: {
    en: "Notes on software, operations, and the long hours between them.",
    ja: "ソフトウェアと運用、そしてその合間の長い時間についてのノート。",
  },
  description: {
    en: "Notes on software, SRE, and life between Paris and Tokyo — by Amine Ilidrissi.",
    ja: "パリと東京の間で書く、ソフトウェア・SRE・日々のノート。",
  },
  author: {
    name: "Amine Ilidrissi",
    url: "https://aminevg.dev",
    email: "amine.ilidrissi@3-shake.com",
  },
  social: {
    x: "aminevg",
    github: "aminevg",
  },
  locales: ["en", "ja"] as const,
  defaultLocale: "en" as const,
  home: {
    postsCount: 5,
    talksCount: 3,
  },
} as const;

export type Locale = (typeof SITE.locales)[number];

export function isLocale(value: string): value is Locale {
  return (SITE.locales as readonly string[]).includes(value);
}
