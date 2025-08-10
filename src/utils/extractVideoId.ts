// src/utils/extractVideoId.ts
import { MetadataCache, TFile } from "obsidian";

/** Return a YouTube videoId from frontmatter (supports multiple keys & URL shapes). */
export function extractVideoIdFromFrontmatter(file: TFile, cache: MetadataCache): string | null {
  const fm = cache.getFileCache(file)?.frontmatter;
  if (!fm) return null;

  const url: string | undefined =
    (fm.originalUrl as string) ||
    (fm.youtube as string) ||
    (fm.url as string);

  if (!url) return null;

  // Covers: watch?v=, youtu.be/, shorts/, embed/
  const m =
    url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) ||
    url.match(/youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/);

  return m?.[1] ?? null;
}