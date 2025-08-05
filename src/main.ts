// main.ts starts here 
// main.ts
import { Plugin, App, WorkspaceLeaf } from "obsidian";
import {
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  VIEW_TYPE_YOUTUBE_PLAYER,
  VIEW_TYPE_YOUTUBE_SPLIT,
  PLUGIN_ID,
} from "./constants";
import {
  YoutubeAnnotatorSettingTab,
  DEFAULT_SETTINGS,
  YoutubeAnnotatorSettings,
} from "./settings";
import { YouTubeView } from "./views/YouTubeView";
import { registerCommands } from "./commands";
import { YoutubePromptModal } from "./modal/YoutubePromptModal";

export default class YoutubeAnnotatorPlugin extends Plugin {
  settings: YoutubeAnnotatorSettings = DEFAULT_SETTINGS;

  public async activateView(videoId?: string) {
    console.log("🔥 Activating view with videoId:", videoId);

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: { videoId },
        active: true,
      });

      console.log("📤 Setting view state:", {
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: { videoId },
        active: true,
      });

      this.app.workspace.revealLeaf(leaf);
    }
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

    this.addSettingTab(new YoutubeAnnotatorSettingTab(this.app, this));
    registerCommands(this);

    console.log(`[${PLUGIN_ID}] initialized`);
  }

  async openModal() {
    const modal = new YoutubePromptModal(
      this.app,
      async (videoId: string, originalUrl: string) => {
        console.log("✅ Video ID from modal:", videoId);

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

    console.log(`[${PLUGIN_ID}] unloaded`);
  }
}

// main.ts ends here
