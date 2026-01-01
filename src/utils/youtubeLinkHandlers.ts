// src/handlers/youtubeLinkHandlers.ts
import { App, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { isYouTubeUrl } from "../utils/timestamphandlers";
import { openYouTubeLinkInSideView } from "../utils/openYouTubeLink";

// Grab href from DOM (works when LP renders actual <a>)
function pickHrefFromDom(e: MouseEvent): string | null {
  const path = (e.composedPath?.() ?? []) as HTMLElement[];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.tagName === "A") {
      const h = node.getAttribute("href") || node.getAttribute("data-href");
      if (h) return h.trim();
    }
    const dh = node.getAttribute?.("data-href");
    if (dh) return dh.trim();
  }
  const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
  return a ? (a.getAttribute("href") || a.getAttribute("data-href") || "").trim() : null;
}

// Fallback: scan the line under the cursor for a YT URL when there is no <a>
function pickYouTubeUrlFromText(e: MouseEvent, view: EditorView): string | null {
  const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
  if (pos == null) return null;
  const line = view.state.doc.lineAt(pos);
  const rel = pos - line.from;
  const text = line.text;

  const urlRe = /https?:\/\/[^\s)]+|(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s)]+/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (rel >= start && rel <= end) {
      const candidate = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
      return isYouTubeUrl(candidate) ? candidate : null;
    }
  }
  return null;
}

// Reading mode: open any YouTube link in the side player
function readingClickHandler(app: App) {
  return async (event: MouseEvent) => {
    const mv = app.workspace.getActiveViewOfType(MarkdownView);
    if (!mv || mv.getMode() !== "preview") return; // only Reading mode
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const a = (event.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
    if (!a) return;

    const href = (a.getAttribute("href") || a.getAttribute("data-href") || "").trim();
    if (!href || !isYouTubeUrl(href)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    await openYouTubeLinkInSideView(app, href, { attachToFrontmatter: false });
  };
}

// Live Preview / Source: intercept before CM6 navigates
function livePreviewHandler(app: App) {
  return (e: MouseEvent, view: EditorView): boolean => {
    const mv = app.workspace.getActiveViewOfType(MarkdownView);
    if (!mv || mv.getMode() !== "source") return false; // only editor modes
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

    // Try real DOM href first
    let href = pickHrefFromDom(e);
    if (!href) {
      // Fallback to inline text under cursor (no <a>)
      href = pickYouTubeUrlFromText(e, view);
    }
    if (!href || !isYouTubeUrl(href)) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    // Open & seek
    openYouTubeLinkInSideView(app, href, { attachToFrontmatter: false });
    return true;
  };
}

export function registerYouTubeLinkHandlers(app: App, register: (cb: () => void) => void) {
  // Reading mode – capture phase to beat default link nav
  const reading = readingClickHandler(app);
  app.workspace.containerEl.addEventListener("click", reading, true);
  register(() => app.workspace.containerEl.removeEventListener("click", reading, true));

  // Live Preview – catch early (mousedown) and also click/auxclick
  const lp = livePreviewHandler(app);
  const ext = Prec.highest(
    EditorView.domEventHandlers({
      mousedown: (e, view) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
        return lp(e, view);
      },
      click: (e, view) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
        return lp(e, view);
      },
      auxclick: (e, view) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
        return lp(e, view);
      },
    })
  );
  return ext;
}
