import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { talksLoader } from "~/content/talks-loader";

const localeLiteral = z.enum(["en", "ja"]);

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.mdx",
    base: "./src/content/posts",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      lang: localeLiteral,
      canonicalUrl: z.url().optional(),
    }),
});

const talks = defineCollection({
  loader: talksLoader(),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(200),
      event: z.string(),
      eventDate: z.coerce.date(),
      slidesUrl: z.url(),
      venue: z.string().optional(),
      videoUrl: z.url().optional(),
      lang: localeLiteral,
      // Derived by the loader from the og:image of slidesUrl (or fallback).
      // Marked optional so glob's initial populate doesn't reject; the loader
      // guarantees presence after post-processing.
      thumbnail: image().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({
    pattern: "**/index.mdx",
    base: "./src/content/pages",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    lang: localeLiteral,
  }),
});

export const collections = { posts, talks, pages };
