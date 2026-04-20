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
      latestPosts: "Latest posts",
      latestTalks: "Recent talks",
      viewAllPosts: "View all posts",
      viewAllTalks: "View all talks",
    },
    listings: {
      postsTitle: "Blog",
      talksTitle: "Talks",
      postsDescription: "Writing on software, SRE, and adjacent curiosities.",
      talksDescription: "Conference talks and meetup slides.",
    },
    post: {
      published: "Published",
      updated: "Updated",
      readingAlsoIn: "Also available in Japanese",
    },
    talk: {
      viewSlides: "View slides",
      watchRecording: "Watch recording",
      atEvent: "at",
      on: "on",
    },
    languageSwitcher: {
      toEnglish: "English",
      toJapanese: "日本語",
      onlyAvailableInEnglish: "Only in English",
      onlyAvailableInJapanese: "日本語のみ",
    },
    theme: {
      light: "Light theme",
      dark: "Dark theme",
      system: "System theme",
      toggleLabel: "Toggle theme",
    },
    feed: {
      rss: "RSS",
    },
    notFound: {
      title: "Page not found",
      body: "The page you're looking for doesn't exist.",
      home: "Home",
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
      latestPosts: "最新の記事",
      latestTalks: "最近の登壇",
      viewAllPosts: "すべての記事",
      viewAllTalks: "すべての登壇",
    },
    listings: {
      postsTitle: "ブログ",
      talksTitle: "登壇",
      postsDescription: "ソフトウェア・SRE・周辺領域のメモ。",
      talksDescription: "カンファレンスや勉強会で話した内容。",
    },
    post: {
      published: "公開",
      updated: "更新",
      readingAlsoIn: "English version available",
    },
    talk: {
      viewSlides: "スライドを見る",
      watchRecording: "録画を見る",
      atEvent: "＠",
      on: "／",
    },
    languageSwitcher: {
      toEnglish: "English",
      toJapanese: "日本語",
      onlyAvailableInEnglish: "Only in English",
      onlyAvailableInJapanese: "日本語のみ",
    },
    theme: {
      light: "ライトテーマ",
      dark: "ダークテーマ",
      system: "システム設定",
      toggleLabel: "テーマを切り替え",
    },
    feed: {
      rss: "RSS",
    },
    notFound: {
      title: "ページが見つかりません",
      body: "お探しのページは存在しません。",
      home: "ホーム",
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
