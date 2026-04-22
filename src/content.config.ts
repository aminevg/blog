import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const localeLiteral = z.enum(["en", "ja"]);

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.mdx",
    base: "./src/content/posts",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    lang: localeLiteral,
    canonicalUrl: z.url().optional(),
    canonicalSource: z.string().optional(),
  }),
});

const talks = defineCollection({
  loader: glob({
    pattern: "**/index.md",
    base: "./src/content/talks",
  }),
  schema: z.object({
    title: z.string(),
    abstract: z.string(),
    event: z.string(),
    eventDate: z.coerce.date(),
    slidesUrl: z.url(),
    venue: z.string().optional(),
    videoUrl: z.url().optional(),
    lang: localeLiteral,
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
