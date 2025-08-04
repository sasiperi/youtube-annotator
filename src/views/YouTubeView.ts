// src/views/YouTubeView.ts starts here

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

  async onOpen() {
  const container = this.containerEl.children[1];
  container.empty();

  const playerContainer = container.createDiv({ cls: "youtube-video-container" });
  playerContainer.id = "yt-player"; // Required for iframe API

  // Replace this with dynamic videoId logic later
  const videoId = "Y_jUGNsRohw";
  this.videoId = videoId;

  // Load YouTube Iframe API
  await loadYouTubeIframeAPI();

  // Create YouTube Player using API
  await createYouTubePlayer(
    "yt-player",
    videoId,
    this.plugin.settings,
    (player) => {
      this.playerWrapper = new PlayerWrapper(player);
      console.log("✅ PlayerWrapper created");
    },
    (state) => {
      console.log("▶️ Player state changed:", state);
    }
  );

  // Toolbar setup
  const tools = container.createDiv({ cls: "yt-toolbar" });

  // 1. Timestamp button
  const timestampBtn = tools.createEl("button", { text: "🕒", attr: { title: "Copy timestamp" } });
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

  // 2. Screenshot button
  const screenshotBtn = tools.createEl("button", { text: "📷", attr: { title: "Capture screenshot" } });
  screenshotBtn.onclick = () => {
    new Notice("📸 Screenshot logic not implemented yet");
  };

  // 3. Play/Pause button
  const playPauseBtn = tools.createEl("button", { text: "⏯️", attr: { title: "Play/Pause" } });
  playPauseBtn.onclick = () => {
    if (!this.playerWrapper?.isPlayerReady()) {
      new Notice("⏳ Player not ready");
      return;
    }
    const result = this.playerWrapper.togglePlayPause();
    new Notice(result === "paused" ? "⏸️ Paused" : "▶️ Playing");
  };

  // 4. Mute/Unmute
  const muteBtn = tools.createEl("button", { text: "🔇", attr: { title: "Mute/Unmute" } });
  muteBtn.onclick = () => {
    if (!this.playerWrapper?.isPlayerReady()) {
      new Notice("⏳ Player not ready");
      return;
    }
    const player = (this.playerWrapper as any)["player"];
    if (player.isMuted()) {
      player.unMute();
      new Notice("🔊 Unmuted");
    } else {
      player.mute();
      new Notice("🔇 Muted");
    }
  };

  // 5. Close player
  const closeBtn = tools.createEl("button", { text: "❌", attr: { title: "Close player" } });
  closeBtn.onclick = () => this.leaf.detach();
}

}
// src/views/YouTubeView.ts ends here