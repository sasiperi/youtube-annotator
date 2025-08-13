// src/utils/openYouTubeLink.ts
import { App, Notice, TFile } from "obsidian";
import { VIEW_TYPE_YOUTUBE_ANNOTATOR } from "../constants";
import { YouTubeView } from "../views/YouTubeView";
import { formatHMS } from "./Time";

/** Local helpers (kept here so we don't touch your other files) */
function extractVideoIdFromUrl(href: string): string | null {
  const m =
    href.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) ||
    href.match(/youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function parseTimeToSeconds(t: string): number | null {
  if (/^\d+$/.test(t)) return Number(t); // plain seconds
  const re = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
  const m = t.match(re);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const total = h * 3600 + min * 60 + s;
  return Number.isFinite(total) ? total : null;
}

function extractStartSecondsFromUrl(href: string): number | null {
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(`https://${href}`);
    const tParam = url.searchParams.get("t");
    if (!tParam) return null;
    return parseTimeToSeconds(tParam);
  } catch {
    const m = href.match(/[?&#]t=([^&#]+)/i);
    return m ? parseTimeToSeconds(m[1]) : null;
  }
}

/**
 * Open a YouTube link in the right-side YouTube Annotator view.
 * Optionally attach videoId/originalUrl to current note frontmatter (off by default).
 */
export async function openYouTubeLinkInSideView(
  app: App,
  href: string,
  opts?: { attachToFrontmatter?: boolean }
): Promise<boolean> {
  const videoId = extractVideoIdFromUrl(href);
  if (!videoId) return false;

  // Open (or create) right leaf and set the view
  const right = app.workspace.getRightLeaf(false) || app.workspace.getRightLeaf(true);
  if (!right) return false;

  await right.setViewState({
    type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
    state: { videoId },
    active: true,
  });
  app.workspace.revealLeaf(right);

  // Optionally attach to current note's YAML
  if (opts?.attachToFrontmatter) {
    const file = app.workspace.getActiveFile();
    if (file instanceof TFile && file.extension === "md") {
      await app.fileManager.processFrontMatter(file, (fm) => {
        fm.videoId = videoId;
        fm.originalUrl = href;
      });
    }
  }

  // Seek to start time if ?t= is present (retry until player ready)
  const start = extractStartSecondsFromUrl(href);
  if (start != null) {
    for (let i = 0; i < 8; i++) {
      const leaf = app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).first();
      const view = leaf?.view as YouTubeView | undefined;
      if (view?.playerWrapper?.isPlayerReady()) {
        view.playerWrapper.seekTo(start, true);
        new Notice(`⏩ ${formatHMS(start)}`, 1500);
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  } else {
    new Notice("Opened video in side view", 1000);
  }

  return true;
}
