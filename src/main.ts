// main.ts starts here 
import { Plugin, App, WorkspaceLeaf, Notice, parseYaml } from "obsidian";
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
import { createNoteFromTemplate } from "./utils/createNoteFromTemplate";
import { generateDateTimestamp } from "./utils/date-timestamp";

export default class YoutubeAnnotatorPlugin extends Plugin {
  settings: YoutubeAnnotatorSettings = DEFAULT_SETTINGS;

  public async activateView(videoId?: string) {
    //console.log("Activating view with videoId:", videoId);

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: { videoId },
        active: true,
      });

      /*console.log("Setting view state:", {
        type: VIEW_TYPE_YOUTUBE_ANNOTATOR,
        state: { videoId },
        active: true,
      });*/

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

    this.registerEvent(
  this.app.workspace.on("file-open", async (file) => {
    if (!file || file.extension !== "md") return;

    const content = await this.app.vault.read(file);
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) return;

    const yaml = parseYaml(yamlMatch[1]);
    const url = yaml?.originalUrl;
    const match = url?.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:&|$)/);
    if (!match) return;

    const videoId = match[1];

    // Detach any existing YouTube views
    const leaves = this.app.workspace.getLeavesOfType("youtube-annotator");
    for (const leaf of leaves) {
      await leaf.detach();
    }

    // Open the player view with this videoId
    await this.activateView(videoId);
  })
    );

  this.registerMarkdownPostProcessor((el, ctx) => {
  const anchors = el.querySelectorAll('a[href^="ytseek://"]');
  anchors.forEach((anchor) => {
    anchor.addEventListener("click", async (e) => {
      e.preventDefault();  // ⛔ Prevent default external link handling
      e.stopPropagation(); // ⛔ Stop event from bubbling to Obsidian's external handler

      const href = anchor.getAttribute("href");
      const seconds = parseInt(href?.replace("ytseek://", "") ?? "", 10);
      if (isNaN(seconds)) {
        new Notice("Invalid timestamp");
        return;
      }

      // Find existing YouTube view
      const leaf = this.app.workspace
        .getLeavesOfType("youtube-annotator")
        .first();
      const view = leaf?.view as any;

      if (view?.playerWrapper?.isPlayerReady()) {
        view.playerWrapper.seekTo(seconds, true);
        new Notice(`⏩ Jumped to ${seconds} sec`);
      } else {
        new Notice("⏳ Player not ready or not open.");
      }
    });
  });
});


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