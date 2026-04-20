import { writeFile, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Loader, LoaderContext } from "astro/loaders";
import { glob } from "astro/loaders";

// Project-root relative base for talk MDX files.
const TALKS_BASE = "./src/content/talks";
const FALLBACK_PATH = path.join(process.cwd(), "src/content/talks/_fallback.jpg");
const THUMB_EXT_CANDIDATES = ["jpg", "jpeg", "png", "webp"] as const;

// Our glob IDs look like "en/my-talk/index" or "en/my-talk" — normalize.
function parseLocaleAndSlug(id: string): { locale: string; slug: string } | null {
  const parts = id.split("/");
  if (parts.length < 2) return null;
  const [locale, slug] = parts;
  if (locale !== "en" && locale !== "ja") return null;
  return { locale, slug };
}

function thumbDir(locale: string, slug: string): string {
  return path.join(process.cwd(), TALKS_BASE, locale, slug);
}

async function findExistingThumbnail(locale: string, slug: string): Promise<string | null> {
  const dir = thumbDir(locale, slug);
  for (const ext of THUMB_EXT_CANDIDATES) {
    const candidate = path.join(dir, `thumbnail.${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function extFromContentType(contentType: string | null, fallbackUrl: string): string {
  const ct = contentType?.toLowerCase() ?? "";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  // Guess from URL extension.
  const urlExt = path.extname(new URL(fallbackUrl).pathname).slice(1).toLowerCase();
  if ((THUMB_EXT_CANDIDATES as readonly string[]).includes(urlExt)) return urlExt;
  return "jpg";
}

async function extractOgImage(html: string, pageUrl: string): Promise<string | null> {
  const match = html.match(
    /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
  );
  if (!match?.[1]) return null;
  try {
    return new URL(match[1], pageUrl).toString();
  } catch {
    return null;
  }
}

async function fetchThumbnailBytes(
  slidesUrl: string,
  logger: LoaderContext["logger"],
): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    const res = await fetch(slidesUrl, {
      headers: { "user-agent": "aminevg-blog-talks-loader/1.0" },
    });
    if (!res.ok) {
      logger.warn(`talks-loader: ${slidesUrl} returned ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      const ab = await res.arrayBuffer();
      return {
        bytes: new Uint8Array(ab),
        ext: extFromContentType(contentType, slidesUrl),
      };
    }
    const html = await res.text();
    const imageUrl = await extractOgImage(html, slidesUrl);
    if (!imageUrl) {
      logger.warn(`talks-loader: no og:image on ${slidesUrl}`);
      return null;
    }
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      logger.warn(`talks-loader: og:image ${imageUrl} returned ${imgRes.status}`);
      return null;
    }
    const ab = await imgRes.arrayBuffer();
    return {
      bytes: new Uint8Array(ab),
      ext: extFromContentType(imgRes.headers.get("content-type"), imageUrl),
    };
  } catch (err) {
    logger.warn(`talks-loader: fetch error for ${slidesUrl}: ${(err as Error).message}`);
    return null;
  }
}

async function writeThumbnail(
  locale: string,
  slug: string,
  bytes: Uint8Array,
  ext: string,
): Promise<string> {
  const dir = thumbDir(locale, slug);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `thumbnail.${ext}`);
  await writeFile(target, bytes);
  return target;
}

async function copyFallback(locale: string, slug: string): Promise<string> {
  const dir = thumbDir(locale, slug);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, "thumbnail.jpg");
  await copyFile(FALLBACK_PATH, target);
  return target;
}

// Type guard for the entry data shape — narrowed from the loader context.
type TalkEntryData = {
  title: string;
  description: string;
  event: string;
  eventDate: Date;
  slidesUrl: string;
  venue?: string;
  videoUrl?: string;
  lang: "en" | "ja";
  thumbnail?: unknown;
};

export function talksLoader(): Loader {
  const base = glob({
    pattern: "**/index.mdx",
    base: TALKS_BASE,
  });

  return {
    name: "talks-with-auto-thumbnails",
    async load(context: LoaderContext) {
      // Step 1 — populate the store with parsed + schema-validated entries.
      await base.load(context);

      const { store, logger, parseData, generateDigest } = context;
      const entries = Array.from(store.entries());

      // Step 2 — precompute pairings across locales so we dedup fetches.
      // Key: slug. Value: slidesUrl to fetch once.
      const slidesBySlug = new Map<string, string>();
      for (const [id, entry] of entries) {
        const parsed = parseLocaleAndSlug(id);
        if (!parsed) continue;
        const data = entry.data as TalkEntryData;
        if (!slidesBySlug.has(parsed.slug)) {
          slidesBySlug.set(parsed.slug, data.slidesUrl);
        }
      }

      // Cache fetched thumbnail bytes keyed by slug (dedup across locales).
      const fetchCache = new Map<string, { bytes: Uint8Array; ext: string } | "fallback">();

      for (const [id, entry] of entries) {
        const parsed = parseLocaleAndSlug(id);
        if (!parsed) {
          logger.warn(`talks-loader: unrecognized entry id ${id}`);
          continue;
        }
        const { locale, slug } = parsed;
        const data = entry.data as TalkEntryData;

        let existing = await findExistingThumbnail(locale, slug);

        if (!existing) {
          if (process.env.CI === "true") {
            throw new Error(
              `Talk thumbnail missing for ${locale}/${slug}. Run a local build to fetch and commit the file, then push.`,
            );
          }

          // Check cache (populated by sibling locale), else fetch.
          let cached = fetchCache.get(slug);
          if (!cached) {
            const fetched = await fetchThumbnailBytes(data.slidesUrl, logger);
            cached = fetched ?? "fallback";
            fetchCache.set(slug, cached);
          }

          if (cached === "fallback") {
            existing = await copyFallback(locale, slug);
            logger.info(`talks-loader: used fallback for ${locale}/${slug} — review if desired`);
          } else {
            existing = await writeThumbnail(locale, slug, cached.bytes, cached.ext);
            logger.info(
              `talks-loader: fetched thumbnail for ${locale}/${slug} — commit before pushing`,
            );
          }
        }

        // Step 3 — resolve the thumbnail path relative to the entry's MDX file
        // so the image() schema helper turns it into ImageMetadata.
        const thumbnailRelative = `./${path.basename(existing)}`;
        const mdxFilePath = entry.filePath ?? path.join(TALKS_BASE, locale, slug, "index.mdx");

        const enrichedData = await parseData({
          id,
          data: { ...data, thumbnail: thumbnailRelative },
          filePath: mdxFilePath,
        });

        // The glob base-load already stored a digest; if we pass it back
        // unchanged, store.set short-circuits and keeps the un-enriched data.
        // Re-hash so the enriched version overwrites.
        const digest = generateDigest({
          data: enrichedData,
          body: entry.body,
          filePath: mdxFilePath,
        });

        store.set({
          ...entry,
          id,
          data: enrichedData,
          filePath: mdxFilePath,
          digest,
        });
      }
    },
  };
}
