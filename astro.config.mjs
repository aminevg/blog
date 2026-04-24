import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import tailwindcss from "@tailwindcss/vite";

import { expressiveCodeOptions } from "./src/config/expressive-code.ts";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.aminevg.dev",
  build: {
    format: "directory",
  },
  i18n: {
    locales: ["en", "ja"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  image: {
    remotePatterns: [],
  },
  // Fontsource serves single-weight static files; Google's provider returns
  // variable-font WOFF2, which satori (inside @vercel/og) can't parse. Both
  // woff2 (for the site) and ttf (for OG rendering) are emitted so the OG
  // route can pick the TTF via Astro's `fontData` API.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "EB Garamond",
      cssVariable: "--font-serif-web",
      weights: [400, 500, 600],
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      formats: ["woff2", "ttf"],
      fallbacks: [
        "Hiragino Mincho ProN",
        "Yu Mincho",
        "YuMincho",
        "Noto Serif JP",
        "serif",
      ],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Sans",
      cssVariable: "--font-sans-web",
      weights: [500],
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
      formats: ["woff2", "ttf"],
      fallbacks: [
        "Hiragino Sans",
        "Yu Gothic",
        "Noto Sans CJK JP",
        "system-ui",
        "sans-serif",
      ],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Noto Serif JP",
      cssVariable: "--font-serif-jp",
      weights: [400],
      styles: ["normal"],
      subsets: ["japanese"],
      formats: ["woff2", "ttf"],
      fallbacks: ["Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "serif"],
    },
  ],
  integrations: [
    expressiveCode(expressiveCodeOptions),
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          ja: "ja",
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": new URL("./src/", import.meta.url).pathname,
      },
    },
  },
});
