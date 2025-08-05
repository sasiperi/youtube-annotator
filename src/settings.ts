import { App, PluginSettingTab, Setting } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import { DateTimestampFormat } from "./utils/date-timestamp";

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	enableTranscript: boolean;
	defaultPlaybackSpeed: number;
	lastUsedUrl: string;
	templateFolder: string;       // e.g., "templates"
	templateFilename: string;     // e.g., "youtube_template.md"
	filenamePrefix: string;       // e.g., "YT_"
	timestampFormat: DateTimestampFormat;
}

// Default values for your plugin settings
export const DEFAULT_SETTINGS: YoutubeAnnotatorSettings = {
	enableTranscript: true,
	defaultPlaybackSpeed: 1.0,
	lastUsedUrl: "",
	templateFolder: "",       // e.g., "templates"
	templateFilename: "youtube_template.md",     // e.g., "youtube_template.md"
	filenamePrefix: "TY_",       // e.g., "YT_"
	timestampFormat: DateTimestampFormat.Compact, 
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

	new Setting(containerEl)
      .setName("Template Filename")
      .setDesc("Filename of the note template to use")
      .addText(text =>
        text
          .setPlaceholder("youtube_template.md")
          .setValue(this.plugin.settings.templateFilename)
          .onChange(async (value) => {
            this.plugin.settings.templateFilename = value;
            await this.plugin.saveSettings();
          })
      );
	
	new Setting(containerEl)
      .setName("Add Date-Timestamp")
      .setDesc("Add this date/timestamp at the end of each newly created file")
	  .addDropdown((dropdown) =>
		dropdown
		.addOptions({
			[DateTimestampFormat.Compact]: "YYYYMMDD-HHmmss",
			[DateTimestampFormat.Underscore]: "YYYY_MM_DD_HH_mm_ss",
			[DateTimestampFormat.ISO]: "ISO format",
			[DateTimestampFormat.TimeOnly]: "Time only (HH-mm-ss)",
			[DateTimestampFormat.Unix]: "Epoch (Unix)",
			[DateTimestampFormat.None]: "None",
		})
          	.setValue(this.plugin.settings.timestampFormat)
      		.onChange(async (value) => {
			this.plugin.settings.timestampFormat = value as DateTimestampFormat;
			await this.plugin.saveSettings();
          })
      );
	}
}
