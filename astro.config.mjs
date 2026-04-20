import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import tailwindcss from "@tailwindcss/vite";

// Expressive Code config lives in src/config/expressive-code.ts so it can share
// the site design tokens; see Section 12 of plans/implementation.md.
import { expressiveCodeOptions } from "./src/config/expressive-code.ts";

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the production domain once attached in Cloudflare.
  site: "https://blog.aminevg.dev",
  trailingSlash: "always",
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
    // Remote image allowlist starts empty; populate on demand.
    remotePatterns: [],
  },
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
