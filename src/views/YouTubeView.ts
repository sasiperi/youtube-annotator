import { log } from "console";
import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { PlayerWrapper } from "youtube/playerWrapper";

export const YOUTUBE_VIEW_TYPE = "youtube-annotator-view";

export class YouTubeView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return YOUTUBE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "YouTube Annotator";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		// Create a YouTube player container
		const videoContainer = container.createDiv({ cls: "youtube-video-container" });

		// Replace this with your dynamic URL logic
		const videoId = "Y_jUGNsRohw"; // Replace with actual ID logic

		videoContainer.innerHTML = `
			<iframe width="100%" height="360"
				src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}"
				title="YouTube video player" 
  				frameborder="0" 
  				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
  				referrerpolicy="strict-origin-when-cross-origin" 
			</iframe>
		`;
		console.log("The videoID use to build embedUrl", videoId);
		//src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}"
		
		const tools = container.createDiv({ cls: "yt-toolbar" });

		// 1. Timestamp
		const timestampBtn = tools.createEl("button", { text: "🕒", attr: { title: "Copy timestamp" } });
		timestampBtn.onclick = () => {
			// For now, placeholder
			new Notice ("Capture logic goes here");
		}; 

		// 2. Screenshot (placeholder)
		const screenshotBtn = tools.createEl("button", { text: "📷", attr: { title: "Capture screenshot" } });
		screenshotBtn.onclick = () => {
			// For now, placeholder
			new Notice ("screenshot Capture logic goes here");
		}; 

		// 3. Play/Pause
		const playPauseBtn = tools.createEl("button", { text: "⏯️", attr: { title: "Play/Pause" } });
		playPauseBtn.onclick = () => {
			// For now, placeholder
			new Notice ("Play/Pause logic goes here");
		}; 

		// 4. Mute/Unmute
		const muteBtn = tools.createEl("button", { text: "🔇", attr: { title: "Mute/Unmute" } });
		muteBtn.onclick = () => {
			// For now, placeholder
			new Notice ("Mute/unmute logic goes here");
		}; 

		// 5. Close
		const closeBtn = tools.createEl("button", { text: "❌", attr: { title: "Close player" } });
		closeBtn.onclick = () => this.leaf.detach();

	}

	async onClose() {
		// Cleanup if needed
	}
}
