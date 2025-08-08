// src/views/YouTubeView.ts starts here
import { ItemView, Notice, WorkspaceLeaf, TFile, parseYaml } from "obsidian";
import { PlayerWrapper } from "../youtube/playerWrapper";
import { VIEW_TYPE_YOUTUBE_ANNOTATOR,SAVED_TIME_LINK } from "../constants";
import type YoutubeAnnotatorPlugin from "../main";
import { createYouTubePlayer } from "../youtube/createYouTubePlayer";
import { loadYouTubeIframeAPI } from "../youtube/youtubeApi";

export class YouTubeView extends ItemView {
  playerWrapper: PlayerWrapper | null = null;
  currentSpeedIndex = 0;
  speeds = [1, 1.25, 1.5, 1.75, 2];
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
    const stateVideoId = viewState?.state?.videoId;
    this.videoId = typeof stateVideoId === "string" ? stateVideoId : null;
    //console.log("onLoad: videoId =", this.videoId);

    if (!this.videoId) {
      const file = this.app.workspace.getActiveFile();
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (yamlMatch) {
          const yaml = parseYaml(yamlMatch[1]);
          const url = yaml?.originalUrl;
          //console.log("Found YouTube URL in YAML:", url);
          //const match = url?.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); 
          const match = url?.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:&|$)/); // This is what used for reloading Obsidian url
          if (match) {
            this.videoId = match[1];
            
          }
        }
      }
    }

    if (this.videoId) {
      await this.renderPlayer();
    } else {
      new Notice("No videoId passed to YouTubeView.");
    }
  }

  async setState(state: any): Promise<void> {
    const newVideoId = state?.videoId ?? null;

    if (!newVideoId || newVideoId === this.videoId) {
      //console.log("setState: No new videoId or unchanged");
      return;
    }

    //console.log("setState: switching to new videoId =", newVideoId);
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
      new Notice("No videoId provided");
      return;
    }

    //console.log("Rendering player for videoId:", this.videoId);

    const playerContainer = container.createDiv({ cls: "youtube-video-container" });
    playerContainer.id = "yt-player";

    const tools = container.createDiv({ cls: "yt-toolbar" });

// copy timestamp to clipboard 
    const timestampBtn = tools.createEl("button", {
      text: "🕒",
      attr: { title: "Copy timestamp", disabled: "true" },
    });

// Take screenshot and append it to the note location
    const screenshotBtn = tools.createEl("button", {
      text: "📷",
      attr: { title: "Capture screenshot" },
    });
    screenshotBtn.onclick = () => {
      new Notice("📸 Screenshot logic not implemented yet");
        };

        const speedBtn = tools.createEl("button", {
          text: `${this.speeds[this.currentSpeedIndex]}x`,
          attr: { title: "Change playback speed" },
          cls: "yt-speed-btn", // CSS class has details
        });

        speedBtn.onclick = () => {
      this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
      const newSpeed = this.speeds[this.currentSpeedIndex];

      this.playerWrapper?.setPlaybackRate(newSpeed);
      speedBtn.setText(`${newSpeed}x`);
      //new Notice(`⏩ Speed set to ${newSpeed}x`);
    };

    tools.appendChild(speedBtn);


    const closeBtn = tools.createEl("button", {
      text: "❌",
      attr: { title: "Close player" },
    });
    closeBtn.onclick = () => this.leaf.detach();

    await loadYouTubeIframeAPI();
    console.log("Loading YouTube Iframe API...");

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
          const hours = Math.floor(time / 3600);
          const mins = Math.floor((time % 3600) / 60).toString().padStart(2, "0");
          const secs = (time % 60).toString().padStart(2, "0");

          const timestamp = hours > 0
            ? `${hours.toString().padStart(2, "0")}:${mins}:${secs}`
            : `${mins}:${secs}`;

          const link = `[${timestamp}](${SAVED_TIME_LINK}://${time})`;
          navigator.clipboard.writeText(link);
          new Notice(`📋 Copied timestamp: ${link}`);
        };

  // Fetch metadata YouTube Meta data
        const meta = player.getVideoData?.();
        if (meta) {
          this.videoTitle = meta.title;
          this.videoAuthor = meta.author;
          //console.log("Title:", this.videoTitle);
          //console.log("Author:", this.videoAuthor);
        }

        //console.log("PlayerWrapper created and timestamp button enabled");
      },
      (state) => {
      //  console.log("Player state changed:", state);
      }
    );
  this.registerDomEvent(this.containerEl, "click", (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== "A") return;

  const href = (target as HTMLAnchorElement).getAttribute("href");
  if (!href?.startsWith(`${SAVED_TIME_LINK}://`)) return;

  e.preventDefault();

  const seconds = parseInt(href.replace(`${SAVED_TIME_LINK}://`, ""), 10);
  if (isNaN(seconds)) return;

  if (this.playerWrapper?.isPlayerReady()) {
    // 💡 Always seek internally
    this.playerWrapper.seekTo(seconds, true);
    new Notice(`⏩ Seeked to ${seconds} sec`);
  } else {
    new Notice("⏳ Player not ready");
  }
});

  }
}

// src/views/YouTubeView.ts ends here