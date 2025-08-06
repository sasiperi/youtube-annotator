// YoutubePromptModal starts here
import { App, Modal, Notice } from "obsidian";
import { loadYouTubeIframeAPI } from "../youtube/youtubeApi";

export class YoutubePromptModal extends Modal {
  public videoAuthor: string | null = null;
  public videoTitle: string | null = null;
  public videoId: string | null = null;
  public videoUrl: string | null = null;
  public embedUrl: string | null = null;
  public watchUrl: string | null = null;

  constructor(
    app: App,
    private onSubmit: (videoId: string, originalUrl: string, videoAuthor: string, videoTitle: string) => void
  ) {
    super(app);
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Paste YouTube URL" });

    const inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "https://youtube.com/...",
    });
    inputEl.style.width = "100%";
    inputEl.focus();

    // Handle Enter key
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.processInput(inputEl.value);
      }
    });

    // Handle OK button
    // contentEl.createEl("button", { text: "OK" }).addEventListener("click", () => {
    //   this.processInput(inputEl.value);
    // });
    contentEl.createEl("button", { text: "OK" }).addEventListener("click", async () => {
  const input = inputEl.value.trim();
  const videoId = this.extractVideoId(input);

  if (!videoId) {
    new Notice("Invalid YouTube URL");
    return;
  }

  await loadYouTubeIframeAPI();

  // ⚡ Create a temporary player to extract metadata
  const tempDiv = contentEl.createDiv();
  const tempPlayer = new YT.Player(tempDiv, {
    videoId,
    events: {
      onReady: () => {
        const data = tempPlayer.getVideoData?.();
        const videoTitle = data?.title || "";
        const videoAuthor = data?.author || "";

        tempPlayer.destroy(); // Clean up

        this.onSubmit(videoId, input, videoAuthor, videoTitle);
        this.close();
      }
    }
  });
});
  }

  private processInput(rawInput: string) {
    const input = rawInput.trim();
    const videoId = this.extractVideoId(input);

    if (videoId) {
      this.videoId = videoId;
      this.videoUrl = `https://youtu.be/${videoId}`;
      this.watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      this.embedUrl = `https://www.youtube.com/embed/${videoId}`;
      //this.onSubmit(videoId, input, this.videoAuthor ?? "", this.videoTitle ?? "",); // ✅ triggers note creation and view
      this.onSubmit(
        videoId ?? "",               // string
        input ?? "",                 // originalUrl
        this.videoAuthor ?? "",      // videoAuthor
        this.videoTitle ?? ""        // videoTitle
      );
      this.close();
    } else {
      new Notice("❌ Invalid YouTube URL");
    }
  }

  private extractVideoId(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  onClose() {
    this.contentEl.empty();
  }
}

// YoutubePromptModal ends here