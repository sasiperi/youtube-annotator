// utils/createNoteFromTemplate.ts is used for creating YT notes based on template
import { App, Notice, TFile, normalizePath,moment } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";
import { generateNoteFilename } from "../utils/generateFilenames";
import { generateDateTimestamp } from "./date-timestamp";

export async function createNoteFromTemplate(
  app: App,
  settings: YoutubeAnnotatorSettings,
  videoAuthor: string,
  videoTitle:string,
  videoId: string,
  originalUrl: string
): Promise<void> {
  const { fullPath: newNotePath, filename } = generateNoteFilename(settings);
  const templatePath = normalizePath(settings.templateFile);
  const formattedDate = generateDateTimestamp(settings.timestampFormat);
  
  let content = "";

  try {
    const templateFile = app.vault.getAbstractFileByPath(templatePath);
    if (templateFile instanceof TFile) {
      content = await app.vault.read(templateFile);
    } else {
      new Notice("Template file not found. Check path in settings.");
      return;
    }
  } catch (err) {
    //console.warn("Error reading template file:", err);
    new Notice("Could not read template file. See console for details.");
    return;
  }

  // Replace placeholders 
  content = content
    .replace(/{{videoAuthor}}/g, videoAuthor)  
    .replace(/{{videoTitle}}/g, videoTitle)
    .replace(/{{videoId}}/g, videoId)
    .replace(/{{originalUrl}}/g, originalUrl)  
    .replace(/{{filename}}/g, filename)
    .replace(/{{date}}/g, formattedDate);

  
  try {
    // Create the note
    await app.vault.create(newNotePath, content);

    // Open the file in editor
    const created = app.vault.getAbstractFileByPath(newNotePath);
    if (created instanceof TFile) {
      await app.workspace.getLeaf(true).openFile(created);
    } else {
      new Notice("Note created but could not open it.");
    }
  } catch (err) {
    //console.error("Failed to create note:", err);
    new Notice("Failed to create note. See console for details.");
  }
} // utils/createNoteFromTemplate.ts 