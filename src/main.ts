import {
  Plugin,
  App,
  WorkspaceLeaf,
} from "obsidian";
import {
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  VIEW_TYPE_YOUTUBE_PLAYER,
  VIEW_TYPE_YOUTUBE_SPLIT,
  PLUGIN_ID,
} from "./constants";
import { YoutubeAnnotatorSettingTab, DEFAULT_SETTINGS, YoutubeAnnotatorSettings, } from "./settings";
import { YOUTUBE_VIEW_TYPE, YouTubeView } from "./views/YouTubeView";
import { registerCommands } from "./commands";
import { YoutubePromptModal } from "./modal/YoutubePromptModal";
import { YouTubePlayerModal } from "./modal/YouTubePlayerModal";

export default class YoutubeAnnotatorPlugin extends Plugin {
  settings: YoutubeAnnotatorSettings = DEFAULT_SETTINGS;

  public async activateView(videoId?: string) {
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: videoId ? { videoId } : {},
        active: true,
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  
  async onload() {
    // this logic is to add icon to ribbon
      this.addRibbonIcon("play-circle", "Open YouTube Annotator", () => {
      this.openModal();
    });

    // Load settings
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Register views
    this.registerView(
      YOUTUBE_VIEW_TYPE,
      (leaf) => new YouTubeView(leaf)
    );

    this.registerView(
      VIEW_TYPE_YOUTUBE_ANNOTATOR,
      (leaf) => new YouTubeView(leaf)
    );

    // Add setting tab
    this.addSettingTab(new YoutubeAnnotatorSettingTab(this.app, this));

    // Register commands
    registerCommands(this);

    // Register modals (if needed elsewhere)
    this.registerDomEvent(document, "click", (evt) => {
      // placeholder logic — define how/when to open modal
    });

    console.log(`[${PLUGIN_ID}] initialized`);
  }

  // async activateView() {
  //   const newLeaf = this.app.workspace.getRightLeaf(false);
  //   await leaf?.setViewState({
  //     type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
  //     active: true,
  //   });
  //   if (leaf) this.app.workspace.revealLeaf(leaf);

  // }

async openModal() {
  const modal = new YoutubePromptModal(this.app, async (videoId: string, originalUrl: string) => {
    console.log("✅ Video ID from modal:", videoId);

    // Detach any existing YouTube annotator views
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR);
    for (const leaf of leaves) {
      await leaf.detach();
    }

    // ✅ Always use the RIGHT view pane (not center)
    const newLeaf = this.app.workspace.getRightLeaf(false);
if (newLeaf) {
  await newLeaf.setViewState({
    type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
    state: { videoId },
    active: true,
    });
    this.app.workspace.revealLeaf(newLeaf); // ✅ now safe
    }

  });

  modal.open();
}



  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR).forEach((leaf) => leaf.detach());
    this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_PLAYER).forEach((leaf) => leaf.detach());
    this.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_SPLIT).forEach((leaf) => leaf.detach());
    console.log(`[${PLUGIN_ID}] unloaded`);
  }
}