import { App, PluginSettingTab, Setting } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	enableTranscript: boolean;
	defaultPlaybackSpeed: number;
	lastUsedUrl: string;
}

// Default values for your plugin settings
export const DEFAULT_SETTINGS: YoutubeAnnotatorSettings = {
	enableTranscript: true,
	defaultPlaybackSpeed: 1.0,
	lastUsedUrl: "",
};

// Settings tab UI for Obsidian’s plugin settings panel
export class YoutubeAnnotatorSettingTab extends PluginSettingTab {
	plugin: YoutubeAnnotatorPlugin;

	constructor(app: App, plugin: YoutubeAnnotatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
    containerEl.empty();
		containerEl.createEl("h2", { text: "YouTube Annotator Settings" });

		new Setting(containerEl)
			.setName("Enable Transcript")
			.setDesc("Future feature placeholder - Show transcript automatically if available")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableTranscript)
					.onChange(async (value) => {
						this.plugin.settings.enableTranscript = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Playback Speed")
			.setDesc("Set the default playback speed for your YouTube videos")
			.addSlider(slider =>
				slider
					.setLimits(0.25, 2.0, 0.25)
					.setValue(this.plugin.settings.defaultPlaybackSpeed)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.defaultPlaybackSpeed = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
