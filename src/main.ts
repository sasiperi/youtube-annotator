// main.ts starts here 
import { Plugin, App, WorkspaceLeaf, Notice, parseYaml, TFolder, normalizePath, MarkdownView, TFile, addIcon } from "obsidian";
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
import { registerTimestampHandlers } from "./utils/timestamphandlers"
import { registerTypingPauseResume } from "./utils/typingPauseResume";
import { registerYouTubeLinkHandlers } from "./utils/youtubeLinkHandlers";


export default class YoutubeAnnotatorPlugin extends Plugin {
  settings: YoutubeAnnotatorSettings = DEFAULT_SETTINGS;

public async activateView(videoId?: string, opts: { focus?: boolean } = {}) {
  const { focus = false } = opts;
  const leaf = this.getOrCreateYouTubeLeaf(true);
  if (!leaf) return;

  await leaf.setViewState({
    type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
    state: { videoId },
    active: !!focus,
  });

  // Only reveal if you explicitly want to focus the player
  if (focus) this.app.workspace.revealLeaf(leaf);
}
// ⬇️ Track the last-focused Markdown editor
  lastMdLeaf: WorkspaceLeaf | null = null;

/** Reuse the existing YouTube leaf. Prefer a pinned one. Create on the right only if missing. */
private getOrCreateYouTubeLeaf(preferPinned = true): WorkspaceLeaf | null {
  const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR);
  if (leaves.length) {
    if (preferPinned) {
      const pinned = leaves.find((l) => (l as any).pinned);
      if (pinned) return pinned;
    }
    return leaves[0];
  }

  // None exists yet → create at the right, but don’t force focus
  return this.app.workspace.getRightLeaf(true);
}

/** Prefer the last-focused Markdown editor; else the active one; else any markdown leaf. */
getPreferredMarkdownLeaf(): WorkspaceLeaf | null {
  // Is our cached leaf still part of the workspace?
  const openMdLeaves = this.app.workspace.getLeavesOfType("markdown");
  const stillOpen = this.lastMdLeaf
    ? openMdLeaves.includes(this.lastMdLeaf)
    : false;

  if (this.lastMdLeaf && stillOpen) {
    return this.lastMdLeaf;
  }

  // Fallbacks
  const active = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf ?? null;
  if (active) return active;

  const any = openMdLeaves.first() ?? null;
  return any;
}

async onload() {

  //===================== ADD ICON TO RIBBON =======================
addIcon(
  "yt-annotator",
  // Simple, clean triangle-in-rounded-rect (uses currentColor for theme)
  `<svg viewBox="0 0 24 24" aria-hidden="true">
     <rect x="2" y="4" rx="4" ry="4" width="20" height="16" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M10 9l5 3-5 3V9z" fill="currentColor"/>
   </svg>`
);    

  this.addRibbonIcon("yt-annotator", "Open YouTube Annotator", () => {
    this.openModal();
  });
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

  this.registerView(
    VIEW_TYPE_YOUTUBE_ANNOTATOR,
    (leaf) => new YouTubeView(leaf, this)
  );

  this.registerEvent(
    this.app.workspace.on("file-open", async (file) => {
    // Only care about markdown files
    if (!file || file.extension !== "md") return;

    // Get videoId from the note's frontmatter
    const videoId = extractVideoIdFromFrontmatter(file, this.app.metadataCache);
    if (!videoId) return;

    // If a YouTube view already exists…
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).first();
    if (existing) {
      // …and it’s pinned, leave it alone (keep size/minimized state)
      if ((existing as any).pinned) return;

      // Otherwise, reuse the leaf and just swap the videoId
      await existing.setViewState({
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: { videoId },
        active: true,
      });
      this.app.workspace.revealLeaf(existing);
      return;
    }

    // Track the last-focused Markdown editor so toolbar actions know where to insert
  this.registerEvent(
    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (!leaf) return;
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        this.lastMdLeaf = leaf;
      }
    })
  );

    // No existing YT leaf — open (or create) one on the right
    const right = this.app.workspace.getRightLeaf(false) || this.app.workspace.getRightLeaf(true);
    if (!right) return; // Safety — should never happen, but TS is happy

    await right.setViewState({
      type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
      state: { videoId },
      active: true,
    });
    this.app.workspace.revealLeaf(right);

  })
);

  this.app.workspace.onLayoutReady(async () => {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) return;
    const vid = extractVideoIdFromFrontmatter(file, this.app.metadataCache);
    if (vid) await this.activateView(vid);
  });

 
 //===================== AUTO-PAUSE DURING NOTE TAKING  ======================= 

  
// Register Reading-mode and LP handlers
  const lpExtension = registerTimestampHandlers(this.app, (dispose) => this.register(dispose));
  this.registerEditorExtension(lpExtension);


  registerTypingPauseResume(this.app, this.settings, (cb) => this.register(cb))

  const ytExternalLink = registerYouTubeLinkHandlers(this.app, (cb) => this.register(cb));
  this.registerEditorExtension(ytExternalLink);

//===================== INITIALIZE PLUGIN =======================
  this.addSettingTab(new YoutubeAnnotatorSettingTab(this.app, this));
    registerCommands(this);
    //console.log(`[${PLUGIN_ID}] initialized`);
  }
//===================== LOAD PROMOT MODAL TO ACCEPT YOUTUBE LINKS =======================
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

//===================== SAVE =======================
  async saveSettings() {
    await this.saveData(this.settings);
  }

//===================== THINGS TO OFFLOAD AT THE CLOSE =======================  
  onunload() {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)
      .forEach((leaf) => leaf.detach());

    //console.log(`[${PLUGIN_ID}] unloaded`);
  }
}

// main.ts ends here