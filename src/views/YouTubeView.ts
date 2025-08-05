// src/views/YouTubeView.ts starts here
// YouTubeView.ts
import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { PlayerWrapper } from "../youtube/playerWrapper";
import { VIEW_TYPE_YOUTUBE_ANNOTATOR } from "../constants";
import type YoutubeAnnotatorPlugin from "../main";
import { createYouTubePlayer } from "../youtube/createYouTubePlayer";
import { loadYouTubeIframeAPI } from "../youtube/youtubeApi";

export class YouTubeView extends ItemView {
  playerWrapper: PlayerWrapper | null = null;
  currentSpeedIndex = 0;
  speeds = [1, 1.5, 2];
  videoId: string | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: YoutubeAnnotatorPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_YOUTUBE_ANNOTATOR;
  }

  getDisplayText(): string {
    return "YouTube Annotator";
  }

  async onLoad(): Promise<void> {
    const viewState = await this.leaf.getViewState();
    const videoId = viewState?.state?.videoId;
    this.videoId = typeof videoId === "string" ? videoId : null;

    console.log("📥 onLoad: videoId =", this.videoId);

    if (this.videoId) {
      await this.renderPlayer();
    } else {
      new Notice("❌ No videoId passed to YouTubeView.");
    }
  }

  async setState(state: any): Promise<void> {
    const newVideoId = state?.videoId ?? null;

    if (!newVideoId || newVideoId === this.videoId) {
      console.log("⚠️ setState: No new videoId or unchanged");
      return;
    }

    console.log("🔁 setState: switching to new videoId =", newVideoId);
    this.videoId = newVideoId;
    await this.renderPlayer();
  }

  async renderPlayer() {
    const container = this.containerEl.children[1];
    container.empty();

    if (!this.videoId) {
      new Notice("❌ No videoId provided");
      return;
    }

    console.log("📺 Rendering player for videoId:", this.videoId);

    const playerContainer = container.createDiv({ cls: "youtube-video-container" });
    playerContainer.id = "yt-player";

    await loadYouTubeIframeAPI();
    console.log("📥 Loading YouTube Iframe API...");

    await createYouTubePlayer(
      "yt-player",
      this.videoId,
      this.plugin.settings,
      (player) => {
        this.playerWrapper = new PlayerWrapper(player);
        console.log("✅ PlayerWrapper created");
      },
      (state) => {
        console.log("▶️ Player state changed:", state);
      }
    );

    const tools = container.createDiv({ cls: "yt-toolbar" });

    const timestampBtn = tools.createEl("button", {
      text: "🕒",
      attr: { title: "Copy timestamp" },
    });
    timestampBtn.onclick = () => {
      if (!this.playerWrapper?.isPlayerReady()) {
        new Notice("⏳ Player not ready");
        return;
      }
      const time = Math.floor(this.playerWrapper.getCurrentTime());
      const mins = Math.floor(time / 60).toString().padStart(2, "0");
      const secs = (time % 60).toString().padStart(2, "0");
      const timestamp = `[[${mins}:${secs}]](#${mins}:${secs})`;
      navigator.clipboard.writeText(timestamp);
      new Notice(`📋 Copied timestamp: ${timestamp}`);
    };

    const screenshotBtn = tools.createEl("button", {
      text: "📷",
      attr: { title: "Capture screenshot" },
    });
    screenshotBtn.onclick = () => {
      new Notice("📸 Screenshot logic not implemented yet");
    };

    const closeBtn = tools.createEl("button", {
      text: "❌",
      attr: { title: "Close player" },
    });
    closeBtn.onclick = () => this.leaf.detach();
  }
}

// src/views/YouTubeView.ts ends here