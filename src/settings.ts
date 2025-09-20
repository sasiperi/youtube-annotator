import { App, Notice, PluginSettingTab, Setting, TAbstractFile, TFolder} from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import { DateTimestampFormat } from "./utils/date-timestamp";
import { FolderSuggest } from "./utils/FolderSuggest";
import { FileSuggest } from "./utils/FileSuggest";
import { initializeDefaultStructure } from "./utils/initializeDefaultStructure";
import { registerTypingPauseResume } from "./utils/typingPauseResume";
import { ScreenshotOptions } from "utils/captureScreenshot";

export type ScreenshotFormat = "png" | "jpg"; // add "webp" later if desired

// Define the shape of your plugin settings
export interface YoutubeAnnotatorSettings {
	autoPauseOnTyping: boolean;
	autoResumeAfterTyping: boolean;
	autoResumeDelay: number;
	useDefaultStructure: boolean;
	enableTranscript: boolean;
	defaultPlaybackSpeed: number;
	lastUsedUrl: string;
// Default folder names
	notesFolder: string;              	
	templateFolder: string;
	mediaFolder: string;
	templateFile: string;
	filenamePrefix: string;

	timestampFormat: DateTimestampFormat;
	devMode: Boolean; 
	// Settings pertains to Screenshots
	screenshotFolder: string;
	enableScreenCapture: boolean;
  	screenshotFormat: ScreenshotFormat;
	reuseLastRegion: boolean;   
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
	
	enableScreenCapture: false,
  	screenshotFormat: "png",
	reuseLastRegion: false,   
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
		containerEl.createEl("h2", { text: "YouTube Annotator settings" });
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
const MAX_SEC = 30;

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
slider.classList.add("yt-setting-slider");

// Number input
const num = row.createEl("input", { type: "number" });
num.min = String(MIN_SEC);
num.max = String(MAX_SEC);
num.step = "1";
num.value = String(this.plugin.settings.autoResumeDelay ?? 2);
num.classList.add("yt-setting-num");

// Small live label (optional)
const label = row.createEl("span", { text: ` ${slider.value}s` });
label.classList.add("yt-setting-label");
label.classList.add("yt-setting-label");

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
		.setName("Default playback speed")
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
		.setName("Template folder")
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
		.setName("Template file path")
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
		.setName("Filename prefix")
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
      .setName("Add date-timestamp")
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


new Setting(containerEl)
  .setName("Enable screen capture")
  .setDesc("Use OS snipping tool (Win) or screencapture (mac) and insert at cursor.")
  .addToggle((toggle) => toggle
    .setValue(this.plugin.settings.enableScreenCapture)
    .onChange(async (value) => {
      this.plugin.settings.enableScreenCapture = value;
      await this.plugin.saveSettings();
    })
  );

  // ================ REUSE LAST REGION EXPERIMENTAL ===================
// new Setting(containerEl)
//   .setName("Last captured region")
//   .setDesc("Experimental - Windows only")
//   .addToggle((toggle) => toggle
//     .setValue(this.plugin.settings.reuseLastRegion)
//     .onChange(async (value) => {
//       this.plugin.settings.reuseLastRegion = value;
//       await this.plugin.saveSettings();
//     })
//   );

new Setting(containerEl)
  .setName("Screenshot folder")
  .setDesc("Vault-relative path for saved screenshots.")
  .addText((toggle) => toggle
    .setPlaceholder("YouTube-Annotator/screenshots")
    .setValue(this.plugin.settings.screenshotFolder)
    .onChange(async (value) => {
      this.plugin.settings.screenshotFolder = value || "YouTube-Annotator/screenshots";
      await this.plugin.saveSettings();
    })
  );

new Setting(containerEl)
  .setName("Image format")
  .setDesc("Format used when saving screenshots.")
  .addDropdown((dropdown) =>
    dropdown
      .addOptions({
        png: "PNG",
        jpg: "JPEG",
      })
      .setValue(this.plugin.settings.screenshotFormat) 
      .onChange(async (value) => {
        this.plugin.settings.screenshotFormat = value as ScreenshotFormat; 
        await this.plugin.saveSettings();
      })
  );


//============ BUY ME COFFEE ==================================================
		const footer = containerEl.createDiv({ cls: "yt-settings-footer" });
		footer.createEl("div", { text: "Like this plugin? Support my work." });
		// Buy Me a Coffee
		const coffeeLink = footer.createEl("a", {
		text: "Buy me a ☕ coffee",
		href: "https://www.buymeacoffee.com/YOURUSERNAME", // <-- update your handle
		});
		coffeeLink.setAttr("target", "_blank");
		coffeeLink.addClass("yt-link");

		// Separator
		footer.createEl("span", { text: "  •  " });

		// GitHub Sponsors
		const sponsorsLink = footer.createEl("a", {
		text: "GitHub sponsors",
		href: "https://github.com/sponsors/sasiperi",
		});
		sponsorsLink.setAttr("target", "_blank");
		sponsorsLink.addClass("yt-link");

		// Separator
		footer.createEl("span", { text: "  •  " });


		// Personal website
		const websiteLink = footer.createEl("a", {
		text: "Visit my website",
		href: "https://fourthquest.com/",
		});
		websiteLink.setAttr("target", "_blank");
		websiteLink.addClass("yt-link");
	}
}
