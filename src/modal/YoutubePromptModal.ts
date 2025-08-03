import { App, Modal, Notice, Setting } from "obsidian";
export class YoutubePromptModal extends Modal {
  public videoUrl: string | null = null;
  public videoId: string | null = null;
  public embedUrl: string | null = null;
  public watchUrl: string | null = null;

  constructor(app: App, private onSubmit: (videoId: string, originalUrl: string) => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Paste YouTube URL" });

    const inputEl = contentEl.createEl("input", { type: "text", placeholder: "https://Youtube.com..." });
    inputEl.style.width = "100%";

    inputEl.focus();

    contentEl.createEl("button", { text: "OK" }).addEventListener("click", () => {
      const input = inputEl.value.trim();
      this.videoUrl = input;
      const videoId = this.extractVideoId(input);
      if (videoId) {
        this.videoId = videoId;
        this.videoUrl = `https://youtu.be/${videoId}`;
        this.watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        this.embedUrl = `https://www.youtube.com/embed/${videoId}`;
        this.onSubmit(videoId, input);
        this.close();
      } else {
        new Notice("Invalid YouTube URL");
      }
    });
  }

  extractVideoId(url: string): string | null {
    
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : null;
    return match ? match[1] : null;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}