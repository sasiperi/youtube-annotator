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
import { registerTimestampHandlers } from "./utils/timestamphandlers"
import { registerTypingPauseResume } from "./utils/typingPauseResume";

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
//===================== ADD ICON TO RIBBON =======================
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

 
 //===================== AUTO-PAUSE DURING NOTE TAKING  ======================= 

  
// Register Reading-mode and LP handlers
  const lpExtension = registerTimestampHandlers(this.app, (dispose) => this.register(dispose));
  this.registerEditorExtension(lpExtension);


  registerTypingPauseResume(this.app, this.settings, (cb) => this.register(cb))


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