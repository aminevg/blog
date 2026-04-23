import type { Locale } from "~/config/site";

// Strings used across the chrome. Keep in sync between locales.
export const UI = {
  en: {
    nav: {
      home: "Home",
      blog: "Blog",
      talks: "Talks",
      about: "About",
    },
    home: {
      latestPosts: "Blog",
      latestTalks: "Talks",
      viewAllPosts: "view all essays",
      viewAllTalks: "view all talks",
    },
    listings: {
      postsTitle: "Blog",
      talksTitle: "Talks",
      postsDescription: "Writing on software, SRE, and adjacent curiosities.",
      talksDescription: "Conference talks and meetup slides.",
    },
    post: {
      backToBlog: "Blog",
      published: "Published",
      updated: "Updated",
      firstPublishedOn: "First published on",
    },
    talk: {
      watchRecording: "Watch recording",
    },
    languageSwitcher: {
      toEnglish: "English",
      toJapanese: "日本語",
      onlyAvailableInEnglish: "Only in English",
      onlyAvailableInJapanese: "日本語のみ",
    },
    feed: {
      rss: "RSS",
    },
    notFound: {
      kicker: "Not found",
      title: "Out of bounds",
      body: "The page you wanted doesn't exist here.",
      home: "Back to the home page",
    },
  },
  ja: {
    nav: {
      home: "ホーム",
      blog: "ブログ",
      talks: "登壇",
      about: "プロフィール",
    },
    home: {
      latestPosts: "ブログ",
      latestTalks: "登壇",
      viewAllPosts: "すべての記事を見る",
      viewAllTalks: "すべての登壇を見る",
    },
    listings: {
      postsTitle: "ブログ",
      talksTitle: "登壇",
      postsDescription: "ソフトウェア・SRE・周辺領域のメモ。",
      talksDescription: "カンファレンスや勉強会で話した内容。",
    },
    post: {
      backToBlog: "ブログ",
      published: "公開",
      updated: "更新",
      firstPublishedOn: "初出：",
    },
    talk: {
      watchRecording: "録画を見る",
    },
    languageSwitcher: {
      toEnglish: "English",
      toJapanese: "日本語",
      onlyAvailableInEnglish: "Only in English",
      onlyAvailableInJapanese: "日本語のみ",
    },
    feed: {
      rss: "RSS",
    },
    notFound: {
      kicker: "見つかりません",
      title: "ページがありません",
      body: "このページは存在しません。",
      home: "ホームに戻る",
    },
  },
} as const satisfies Record<Locale, unknown>;

export type UIStrings = (typeof UI)[Locale];

export function t(locale: Locale): UIStrings {
  return UI[locale];
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ja" : "en";
}
