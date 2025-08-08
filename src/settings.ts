import { App, Notice, PluginSettingTab, Setting, TAbstractFile, TFolder} from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import { DateTimestampFormat } from "./utils/date-timestamp";
import { FolderSuggest } from "./utils/FolderSuggest";
import { FileSuggest } from "./utils/FileSuggest";
import { initializeDefaultStructure } from "./utils/initializeDefaultStructure";

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	useDefaultStructure: boolean;
	enableTranscript: boolean;
	defaultPlaybackSpeed: number;
	lastUsedUrl: string;
	notesFolder: string;              	
	templateFolder: string;
	screenshotFolder: string;   
	mediaFolder: string;
	templateFile: string;
	filenamePrefix: string;
	timestampFormat: DateTimestampFormat;
	devMode: Boolean; 
}


// Default values for your plugin settings
export const DEFAULT_SETTINGS: YoutubeAnnotatorSettings = {
	useDefaultStructure: false,
	enableTranscript: false,
	defaultPlaybackSpeed: 1.0,
	lastUsedUrl: "",

	notesFolder: "YouTube-Annotator/notes",              	
	templateFolder: "YouTube-Annotator/templates",      
	screenshotFolder: "YouTube-Annotator/screenshots",   
	mediaFolder: "YouTube-Annotator/media",              
	
	templateFile: "YouTube-Annotator/templates/youtube_template.md",
	filenamePrefix: "YT_",
	timestampFormat: DateTimestampFormat.Compact,        
	
	devMode: false,                                      
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
////============ USE DEFAULT FOLDER STRUCTURE =========================================
	new Setting(containerEl)
		.setName("Filename Prefix")
		.setDesc("Prefix for new note filenames (e.g., YT_). Only letters, numbers, underscores, and hyphens are allowed.")
		.addText((text) => {
			text
			.setPlaceholder("YT_")
			.setValue(this.plugin.settings.filenamePrefix || "YT_")
			.onChange(async (value) => {
				// Trim spaces and replace invalid characters with underscores
				const cleaned = value.trim().replace(/[^A-Za-z0-9_-]/g, "_");

				// If cleaning changed the input, update the field immediately
				if (cleaned !== value) {
				text.setValue(cleaned);
				new Notice("⚠️ Invalid characters replaced with underscores.");
				}

				this.plugin.settings.filenamePrefix = cleaned;
				await this.plugin.saveSettings();
			});
		});


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
////============ SUGGEST FOLDER PATH ==================================================
	new Setting(containerEl)
		.setName("Template Folder")
		.setDesc("Folder where your note templates are stored")
		.addText((text) => {
			text
			.setPlaceholder("e.g. Templates")
			.setValue(this.plugin.settings.templateFolder)
			.onChange(async (value) => {
				this.plugin.settings.templateFolder = value;
				await this.plugin.saveSettings();
			});

			// 🧠 Enable folder suggestion
			new FolderSuggest(this.app, text.inputEl);
		});
////============ SUGGEST TEMPLATE ".MD" TO USE FOR NOTE CREATION =======================================
	new Setting(containerEl)
		.setName("Template File Path")
		.setDesc("Select the default note template (.md)")
		.addText((text) => {
			text
			.setPlaceholder("Templates/youtube_template.md")
			.setValue(this.plugin.settings.templateFile)
			.onChange(async (value) => {
				this.plugin.settings.templateFile = value;
				await this.plugin.saveSettings();
			});

			new FileSuggest(this.app, text.inputEl);
		});

////============ ADD TIME-STAMP AT THE CURRENT CURSOR LOCATION ========================================

	new Setting(containerEl)
		.setName("Filename Prefix")
		.setDesc("Prefix to add to new note filenames (e.g., YT_)")
		.addText((text) => {
			text
			.setPlaceholder("YT_")
			.setValue(this.plugin.settings.filenamePrefix || "YT_")
			.onChange(async (value) => {
				this.plugin.settings.filenamePrefix = value.trim();
				await this.plugin.saveSettings();
			});
		});

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
		containerEl.createEl("div", { text: "Have improvement suggestions? Contact Us through our webpage" });
		const companyLink = containerEl.createEl("a", {
		text: "Visit my Website",
		href: "https://fourthquest.com/",
		});
		companyLink.setAttribute("target", "_blank");
		companyLink.setAttribute("style", "color: var(--text-accent); font-weight: bold;");
	}
}
