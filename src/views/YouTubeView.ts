import { log } from "console";
import { ItemView, Notice, WorkspaceLeaf } from "obsidian";

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
		
		// Add a toolbar or timestamp capture button
		const tools = container.createDiv({ cls: "timestamp-tools" });
		const btn = tools.createEl("button", { text: "🕒" });

		btn.onclick = () => {
			// For now, placeholder
			new Notice ("Capture logic goes here");
		}; 
	}

	async onClose() {
		// Cleanup if needed
	}
}
