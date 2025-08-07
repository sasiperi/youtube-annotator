import { App, PluginSettingTab, Setting } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import { DateTimestampFormat } from "./utils/date-timestamp";

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	enableTranscript: boolean;
	defaultPlaybackSpeed: number;
	lastUsedUrl: string;
	templateFolder: string;       
	templateFile: string;     // e.g., "youtube_template.md"
	filenamePrefix: string;   
	notesFolder: string;
	timestampFormat: DateTimestampFormat;
}

// Default values for your plugin settings
export const DEFAULT_SETTINGS: YoutubeAnnotatorSettings = {
	enableTranscript: true,
	defaultPlaybackSpeed: 1.0,
	lastUsedUrl: "",
	templateFolder: "",       // e.g., "templates"
	templateFile: "/Templates/youtube_template.md",     // e.g., "youtube_template.md"
	filenamePrefix: "YT_",       // e.g., "YT_"
	notesFolder: "YouTube_Notes",
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
////============ FUTURE FEATURE ==================================================
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
////============ CHANGE PLAYBACK SPEED ==================================================
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
////============ CREATE NEW NOTE BASED ON TEMPLATE ==================================================
	new Setting(containerEl)
      .setName("Template Filename")
      .setDesc("New note content created based on the template")
      .addText(text =>
        text
          .setPlaceholder("youtube_template.md")
          .setValue(this.plugin.settings.templateFile)
          .onChange(async (value) => {
            this.plugin.settings.templateFile = value;
            await this.plugin.saveSettings();
          })
      );
////============ ADD TIME-STAMP AT THE CURRENT CURSOR LOCATION ========================================
	new Setting(containerEl)
      .setName("Add Date-Timestamp")
      .setDesc("Date timestamp added at the end of new note creation")
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

//============ BUY ME COFFEE ==================================================
		containerEl.createEl("hr");
		containerEl.createEl("div", { text: "☕ Like this plugin? Support my work!" });

		const coffeeLink = containerEl.createEl("a", {
		text: "Buy Me a ☕ Coffee",
		href: "https://github.com/sponsors/sasiperi?frequency=one-time",
		});
		coffeeLink.setAttribute("target", "_blank");
		coffeeLink.setAttribute("style", "color: var(--text-accent); font-weight: bold;");

		containerEl.createEl("hr");
		containerEl.createEl("div", { text: "" });
		const companyLink = containerEl.createEl("a", {
		text: "Visit my Website",
		href: "https://fourthquest.com/",
		});
		companyLink.setAttribute("target", "_blank");
		companyLink.setAttribute("style", "color: var(--text-accent); font-weight: bold;");
	}
}
