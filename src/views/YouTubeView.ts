// src/views/YouTubeView.ts starts here
// YouTubeView.ts
import { ItemView, Notice, WorkspaceLeaf, TFile, parseYaml } from "obsidian";
import { PlayerWrapper } from "../youtube/playerWrapper";
import { VIEW_TYPE_YOUTUBE_ANNOTATOR } from "../constants";
import type YoutubeAnnotatorPlugin from "../main";
import { createYouTubePlayer } from "../youtube/createYouTubePlayer";
import { loadYouTubeIframeAPI } from "../youtube/youtubeApi";

export class YouTubeView extends ItemView {
  playerWrapper: PlayerWrapper | null = null;
  currentSpeedIndex = 0;
  speeds = [1, 1.5, 2];
  videoAuthor: string | null = null;
  videoTitle: string | null = null;
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
    const viewState = this.leaf.getViewState();
    this.videoId = viewState?.state?.videoId as string;
    console.log("📥 onLoad: videoId =", this.videoId);

    if (!this.videoId) {
      const file = this.app.workspace.getActiveFile();
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (yamlMatch) {
          const yaml = parseYaml(yamlMatch[1]);
          const url = yaml?.youtube;
          console.log("📄 Found YouTube URL in YAML:", url);
          const match = url?.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (match) {
            this.videoId = match[1];
          }
        }
      }
    }

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

  getVideoUrlWithTime(seconds: number): string {
    return `https://youtu.be/${this.videoId}?t=${seconds}`;
  }

  getVideoSeekAnchor(seconds: number): string {
    return `#seek-${seconds}`;
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

    const tools = container.createDiv({ cls: "yt-toolbar" });

    const timestampBtn = tools.createEl("button", {
      text: "🕒",
      attr: { title: "Copy timestamp", disabled: "true" },
    });

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

    await loadYouTubeIframeAPI();
    console.log("📥 Loading YouTube Iframe API...");

    await createYouTubePlayer(
      "yt-player",
      this.videoId,
      this.plugin.settings,
      (player) => {
        this.playerWrapper = new PlayerWrapper(player);
        timestampBtn.removeAttribute("disabled");
        timestampBtn.onclick = () => {
          if (!this.playerWrapper?.isPlayerReady()) {
            new Notice("⏳ Player not ready");
            return;
          }
          const time = Math.floor(this.playerWrapper.getCurrentTime());
          const mins = Math.floor(time / 60).toString().padStart(2, "0");
          const secs = (time % 60).toString().padStart(2, "0");
          const anchor = this.getVideoSeekAnchor(time);
          const link = `[${mins}:${secs}](${anchor})`;
          navigator.clipboard.writeText(link);
          new Notice(`📋 Copied timestamp: ${link}`);
        };

  // Fetch metadata YouTube Meta data
        const meta = player.getVideoData?.();
        if (meta) {
          this.videoTitle = meta.title;
          this.videoAuthor = meta.author;
          console.log("🎬 Title:", this.videoTitle);
          console.log("📡 Author:", this.videoAuthor);
        }

        console.log("✅ PlayerWrapper created and timestamp button enabled");
      },
      (state) => {
        console.log("▶️ Player state changed:", state);
      }
    );

    this.registerDomEvent(document, "click", (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== "A") return;

  const href = (target as HTMLAnchorElement).getAttribute("href");
  if (!href?.startsWith("#seek-")) return;

  const seconds = parseInt(href.replace("#seek-", ""), 10);
  if (isNaN(seconds)) return;

  e.preventDefault();

  const isCtrlShift = e.ctrlKey && e.shiftKey;
  const isAltShift = e.altKey && e.shiftKey;
      if (this.playerWrapper?.isPlayerReady()) {
        if (isCtrlShift || isAltShift) {
          // Special click — jump in embedded player
          this.playerWrapper.seekTo(seconds, true);
          new Notice(`⏩ Seeked to ${seconds} sec (internal)`);
        } else {
          // Default click behavior — open in new leaf (or browser)
          const fullUrl = this.getVideoUrlWithTime(seconds);
          window.open(fullUrl, "_blank");
        }
      } else {
        new Notice("⏳ Player not ready");
      }
    });

  }
}

// src/views/YouTubeView.ts ends here