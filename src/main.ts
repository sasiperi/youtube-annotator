// main.ts starts here 
import { Plugin, App, WorkspaceLeaf, Notice, parseYaml, TFolder, normalizePath, MarkdownView, TFile } from "obsidian";
import {
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  //VIEW_TYPE_YOUTUBE_PLAYER,
  //VIEW_TYPE_YOUTUBE_SPLIT,
  PLUGIN_ID,
  SAVED_TIME_ANCHOR_PREFIX,
} from "./constants";
import {
  YoutubeAnnotatorSettingTab,
  DEFAULT_SETTINGS,
  YoutubeAnnotatorSettings,
} from "./settings";
import { YouTubeView } from "./views/YouTubeView";
import { registerCommands } from "./commands";
import { YoutubePromptModal } from "./modal/YoutubePromptModal";
import { createNoteFromTemplate } from "./utils/createNoteFromTemplate";
import { generateDateTimestamp } from "./utils/date-timestamp";
import { formatHMS } from "../src/utils/Time";
import { EditorView } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { extractVideoIdFromFrontmatter } from "./utils/extractVideoId";


export default class YoutubeAnnotatorPlugin extends Plugin {
  settings: YoutubeAnnotatorSettings = DEFAULT_SETTINGS;

public async activateView(videoId?: string) {
  let leaf = this.app.workspace.getRightLeaf(false);
  if (!leaf) leaf = this.app.workspace.getRightLeaf(true);
  if (!leaf) return;

  await leaf.setViewState({
    type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
    state: { videoId },
    active: true,
  });
  this.app.workspace.revealLeaf(leaf);
}



  async onload() {
    this.addRibbonIcon("play-circle", "Open YouTube Annotator", () => {
      this.openModal();
    });

    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.registerView(
      VIEW_TYPE_YOUTUBE_ANNOTATOR,
      (leaf) => new YouTubeView(leaf, this)
    );

    this.registerEvent(
    this.app.workspace.on("file-open", async (file) => {
    if (!(file instanceof TFile) || file.extension !== "md") return;

    const vid = extractVideoIdFromFrontmatter(file, this.app.metadataCache);
    if (!vid) return;

    // Detach any existing YouTube views
    this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).forEach((l) => l.detach());

    await this.activateView(vid);
  })
);
  this.app.workspace.onLayoutReady(async () => {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) return;
    const vid = extractVideoIdFromFrontmatter(file, this.app.metadataCache);
    if (vid) await this.activateView(vid);
  });

//===================== READING MODE HANDLER =======================
const anchorPrefix = `#${SAVED_TIME_ANCHOR_PREFIX}`;

const readingClickHandler = async (event: MouseEvent) => {
  //Run ONLY when the active Markdown view is in Reading mode
  const mv = this.app.workspace.getActiveViewOfType(MarkdownView);
  if (!mv || mv.getMode() !== "preview") return;

  // Allow modifier keys to bypass
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const a = (event.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
  if (!a) return;

  const href = (a.getAttribute("href") || a.getAttribute("data-href") || "").trim();
  if (!href.startsWith(`#${SAVED_TIME_ANCHOR_PREFIX}`)) return;

  event.preventDefault();
  event.stopPropagation();
  (event as any).stopImmediatePropagation?.();

  const seconds = Number(href.slice(1 + SAVED_TIME_ANCHOR_PREFIX.length));
  if (!Number.isFinite(seconds)) return;

  const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).first();
  const view = leaf?.view as YouTubeView | undefined;

  if (view?.playerWrapper?.isPlayerReady()) {
    view.playerWrapper.seekTo(seconds, true);
    new Notice(`To ${formatHMS(seconds)}`);
  } else {
    new Notice("Player not ready || open.");
  }
};


// Capture phase so we beat default anchor behavior
this.app.workspace.containerEl.addEventListener("click", readingClickHandler, true);
this.register(() =>
  this.app.workspace.containerEl.removeEventListener("click", readingClickHandler, true)
);

//===================== LIVE PREVIEW MODE HANDLER =======================
const anchorPrefixLP = `#${SAVED_TIME_ANCHOR_PREFIX}`;

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

function pickSecondsFromText(e: MouseEvent, view: EditorView, prefix: string): number | null {
  const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
  if (pos == null) return null;
  const line = view.state.doc.lineAt(pos);
  const rel = pos - line.from;
  const text = line.text;

  const re = new RegExp(`${prefix.replace("#", "\\#")}(\\d+)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index, end = start + m[0].length;
    if (rel >= start && rel <= end) {
      const secs = Number(m[1]);
      return Number.isFinite(secs) ? secs : null;
    }
  }
  return null;
}

const handleLP = (e: MouseEvent, view: EditorView): boolean => {
  // Ensure we’re actually in a Markdown editor (LP/Source)
  const mv = this.app.workspace.getActiveViewOfType(MarkdownView);
  if (!mv) return false;

  // Let modifier keys bypass
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  let seconds: number | null = null;
  const href = pickHrefFromDom(e);

  if (href?.startsWith(anchorPrefixLP)) {
    seconds = Number(href.slice(anchorPrefixLP.length));
  } else {
    seconds = pickSecondsFromText(e, view, anchorPrefixLP); // inline markdown case
  }
  if (seconds == null) return false;

  e.preventDefault();
  e.stopPropagation();
  (e as any).stopImmediatePropagation?.();

  const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).first();
  const yt = leaf?.view as YouTubeView | undefined;
  if (yt?.playerWrapper?.isPlayerReady()) {
    yt.playerWrapper.seekTo(seconds, true);
    new Notice(`To ${formatHMS(seconds)}`);
  } else {
    new Notice(`Play in view & try again.`);
  }
  return true;
};

this.registerEditorExtension(
  Prec.highest(
    EditorView.domEventHandlers({
      click: (e, view) => handleLP(e, view),
      mousedown: (e, view) => handleLP(e, view),
      auxclick: (e, view) => handleLP(e, view),
    })
  )
);


  this.addSettingTab(new YoutubeAnnotatorSettingTab(this.app, this));
    registerCommands(this);
    //console.log(`[${PLUGIN_ID}] initialized`);
  }

  async openModal() {
  const modal = new YoutubePromptModal(
    this.app,
    async (
      videoId: string,
      originalUrl: string,
      videoAuthor: string,
      videoTitle: string
    ) => {
      //console.log("Video ID from modal:", videoId);

      // Step 1: Create note
      try {
        await createNoteFromTemplate(
          this.app,
          this.settings,
          videoAuthor,
          videoTitle,
          videoId,
          originalUrl
        );
        //console.log("Note created successfully");
      } catch (err) {
        //console.error("Failed to create note:", err);
        new Notice("Note creation failed. Check template path or folder.");
      }

      // Step 2: Detach any existing views
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR);
      for (const leaf of leaves) {
        await leaf.detach();
      }

      await this.activateView(videoId);
    }
  );

  modal.open();
}


  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)
      .forEach((leaf) => leaf.detach());

    //console.log(`[${PLUGIN_ID}] unloaded`);
  }
}

// main.ts ends here