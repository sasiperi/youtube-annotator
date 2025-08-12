import { App, Notice, PluginSettingTab, Setting, TAbstractFile, TFolder} from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import { DateTimestampFormat } from "./utils/date-timestamp";
import { FolderSuggest } from "./utils/FolderSuggest";
import { FileSuggest } from "./utils/FileSuggest";
import { initializeDefaultStructure } from "./utils/initializeDefaultStructure";
import { registerTypingPauseResume } from "./utils/typingPauseResume";

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	autoPauseOnTyping: boolean;
	autoResumeAfterTyping: boolean;
	autoResumeDelay: number;
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
	autoPauseOnTyping: true,
	autoResumeAfterTyping: false,
	autoResumeDelay: 1,
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
////============ USE DEFAULT FOLDER STRUCTURE BOOLEAN =========================================
	new Setting(containerEl)
	.setName("Default folder structure")
	.setDesc("Creates folders and template file under 'YouTube-Annotator'. Recommended for new users.")
	.addToggle((toggle) =>
		toggle
		.setValue(this.plugin.settings.useDefaultStructure ?? false)
		.onChange(async (value) => {
			this.plugin.settings.useDefaultStructure = value;
			await this.plugin.saveSettings();

			if (value) {
			await initializeDefaultStructure(this.app, this.plugin);
			new Notice ( "Default folders created.");
			}
		})
	);

////============ FUTURE FEATURE ==================================================

	// new Setting(containerEl)
	// 	.setName("Enable Transcript")
	// 	.setDesc("Future feature placeholder - Show transcript automatically if available")
	// 	.addToggle(toggle =>
	// 		toggle
	// 			.setValue(this.plugin.settings.enableTranscript)
	// 			.onChange(async (value) => {
	// 				this.plugin.settings.enableTranscript = value;
	// 				await this.plugin.saveSettings();
	// 			})
	// 	);
////============ AUTO-RESUME AFTER PLAYING ==================================================
// --- Auto‑resume after typing (toggle) – you already have this ---
new Setting(containerEl)
  .setName("Auto‑resume after typing")
  .setDesc("Resume playback after you stop typing.")
  .addToggle(t =>
    t.setValue(this.plugin.settings.autoResumeAfterTyping)
     .onChange(async (v) => {
       this.plugin.settings.autoResumeAfterTyping = v;
       await this.plugin.saveSettings();
     })
  );

// --- Auto‑resume delay (slider + numeric input, synced) ---
const MIN_SEC = 1;
const MAX_SEC = 10;

const delaySetting = new Setting(containerEl)
  .setName("Auto‑resume delay")
  .setDesc("How many seconds after your last keystroke to resume playback.");

const row = delaySetting.controlEl.createDiv({ cls: "yt-delay-row" });

// Slider
const slider = row.createEl("input", { type: "range" });
slider.min = String(MIN_SEC);
slider.max = String(MAX_SEC);
slider.step = "1";
slider.value = String(this.plugin.settings.autoResumeDelay ?? 2);
slider.style.marginRight = "0.75rem";

// Number input
const num = row.createEl("input", { type: "number" });
num.min = String(MIN_SEC);
num.max = String(MAX_SEC);
num.step = "1";
num.value = String(this.plugin.settings.autoResumeDelay ?? 2);
num.style.width = "4.5rem";

// Small live label (optional)
const label = row.createEl("span", { text: ` ${slider.value}s` });
label.style.marginLeft = "0.5rem";
label.style.opacity = "0.8";

// Helper to clamp & normalize
const clampSeconds = (v: unknown) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return MIN_SEC;
  return Math.min(MAX_SEC, Math.max(MIN_SEC, n));
};

const applyValue = async (val: number) => {
  const clamped = clampSeconds(val);
  slider.value = String(clamped);
  num.value = String(clamped);
  label.setText(` ${clamped}s`);
  this.plugin.settings.autoResumeDelay = clamped;
  await this.plugin.saveSettings();
};

// Events (two‑way sync)
slider.addEventListener("input", async () => {
  await applyValue(slider.valueAsNumber);
});

// Update on typing and on blur/enter
num.addEventListener("input", async () => {
  // Don’t commit on every keystroke if empty; just update label/slider when valid
  const v = num.value.trim();
  if (v === "") return;
  await applyValue(Number(v));
});
num.addEventListener("change", async () => {
  await applyValue(Number(num.value));
});
num.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await applyValue(Number(num.value));
    (e.target as HTMLInputElement).blur();
  }
});


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

////============ ADD PREFIX TO THE NOTE FILENAME ========================================
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
				new Notice("Invalid characters replaced with underscores.");
				}

				this.plugin.settings.filenamePrefix = cleaned;
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
