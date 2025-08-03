/// <reference types="youtube" />
import { Modal, App } from "obsidian";
import { PlayerWrapper } from "../youtube/playerWrapper";

export class YouTubePlayerModal extends Modal {
  private videoId: string;
  private playerWrapper: PlayerWrapper | null = null;
  private pinned: boolean = false;

  constructor(app: App, videoId: string) {
    super(app);
    this.videoId = videoId;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Wrapper container
    const wrapper = document.createElement("div");
    wrapper.className = "youtube-player-wrapper";
    Object.assign(wrapper.style, {
      position: "fixed",
      top: "120px",
      left: "120px",
      zIndex: "9999",
      backgroundColor: "#000",
      border: "2px solid #444",
      borderRadius: "8px",
      width: "660px",
      height: "440px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      resize: "both",
      overflow: "hidden",
      minWidth: "320px",
      minHeight: "240px",
      display: "flex",
      flexDirection: "column",
    });

    // Header (draggable)
    const header = document.createElement("div");
    header.className = "youtube-modal-header";
    header.style.cssText = `
      flex: 0 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background-color: #222;
      color: #fff;
      cursor: move;
      font-weight: bold;
      border-bottom: 1px solid #444;
    `;
    header.textContent = `Playing: ${this.videoId}`;

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    Object.assign(closeBtn.style, {
      background: "none",
      border: "none",
      color: "#fff",
      fontSize: "12px",
      cursor: "pointer",
    });
    closeBtn.onclick = () => this.close();

    // Pin button
    const pinBtn = document.createElement("button");
    pinBtn.textContent = this.pinned ? "📌" : "📍";
    Object.assign(pinBtn.style, {
      background: "none",
      border: "none",
      color: "#fff",
      fontSize: "12px",
      cursor: "pointer",
      marginRight: "8px",
    });
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      this.pinned = !this.pinned;
      pinBtn.textContent = this.pinned ? "📌" : "📍";
      this.updateBackdrop();
    };

    // Insert pin before close button
    header.appendChild(pinBtn);
    header.appendChild(closeBtn);

    // Player container
    const playerContainer = document.createElement("div");
    playerContainer.id = "youtube-player";
    Object.assign(playerContainer.style, {
      flex: "1 1 auto",
      backgroundColor: "#000",
    });

    // Footer
    const footer = document.createElement("div");
    footer.className = "youtube-footer";
    footer.style.cssText = `
      flex: 0 0 30px;
      background-color: #333;
      border-top: 1px solid #444;
    `;

    // Assemble modal content
    wrapper.appendChild(header);
    wrapper.appendChild(playerContainer);
    wrapper.appendChild(footer);
    contentEl.appendChild(wrapper);

    // Draggable functionality
    this.makeDraggable(wrapper, header);
    this.addOutsideClickPrevention();
    this.updateBackdrop();
    
    // ✅ YouTube player initialization
    const ytPlayer = new YT.Player(playerContainer.id, {
      videoId: this.videoId,
      events: {
        onReady: () => {
          this.playerWrapper = new PlayerWrapper(ytPlayer);
          console.log("✅ PlayerWrapper initialized");
        },
        onStateChange: (event) => {
          console.log("📺 Player state changed:", event.data);
        }
      }
    });
  }

  private updateBackdrop() {
  const modalBg = this.modalEl.querySelector(".modal-bg") as HTMLElement;
  if (modalBg) {
    if (this.pinned) {
      modalBg.style.display = "none";  // hide grey overlay when pinned
      modalBg.removeEventListener("mousedown", this.backdropBlocker, true);
      modalBg.removeEventListener("click", this.backdropBlocker, true);
    } else {
      modalBg.style.display = "block"; // show overlay when unpinned
      modalBg.style.pointerEvents = "auto";
      modalBg.style.backgroundColor = "rgba(0,0,0,0.5)";
      modalBg.addEventListener("mousedown", this.backdropBlocker, { capture: true });
      modalBg.addEventListener("click", this.backdropBlocker, { capture: true });
    }
  }
}


  private backdropBlocker = (e: Event) => {
    if (this.pinned) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  private addOutsideClickPrevention() {
    // Stop propagation of outside clicks on document to prevent modal close
    document.addEventListener(
      "mousedown",
      this.documentClickBlocker,
      true
    );
  }

  private documentClickBlocker = (e: Event) => {
    if (!this.pinned) return;
    const wrapper = this.contentEl.querySelector(".youtube-player-wrapper");
    if (wrapper && !wrapper.contains(e.target as Node)) {
      e.stopPropagation();
      e.preventDefault();
    }

  };

  onClose() {
    // Clean up
    this.playerWrapper?.destroy();
    this.contentEl.empty();

    // Remove event listeners
    document.removeEventListener("mousedown", this.documentClickBlocker, true);

    const modalBg = this.modalEl.querySelector(".modal-bg") as HTMLElement;
    if (modalBg) {
      modalBg.removeEventListener("mousedown", this.backdropBlocker, true);
      modalBg.removeEventListener("click", this.backdropBlocker, true);
      modalBg.style.pointerEvents = "auto";
    }
  }

  shouldCloseOnClickOutside(): boolean {
    return !this.pinned;
  }

  private makeDraggable(target: HTMLElement, handle: HTMLElement) {
    let offsetX = 0,
      offsetY = 0;
    let isDragging = false;

    handle.addEventListener("mousedown", (e: MouseEvent) => {
      isDragging = true;
      const rect = target.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!isDragging) return;
      target.style.left = `${e.clientX - offsetX}px`;
      target.style.top = `${e.clientY - offsetY}px`;
    };

    const mouseUpHandler = () => {
      isDragging = false;
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };
  }
}
