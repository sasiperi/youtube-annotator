// utils/createNoteFromTemplate.ts
import { App, TFile, normalizePath } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";
import { generateNoteFilename } from "../utils/generateFilenames";

export async function createNoteFromTemplate(
  app: App,
  settings: YoutubeAnnotatorSettings,
  videoId: string,
  originalUrl: string
): Promise<void> {
  const { fullPath: newNotePath, filename } = generateNoteFilename(settings);
  const templatePath = normalizePath(settings.templateFile);

  let content = "";

  try {
    const templateFile = app.vault.getAbstractFileByPath(templatePath);
    if (templateFile instanceof TFile) {
      content = await app.vault.read(templateFile);
    }
  } catch (err) {
    console.warn("⚠️ Could not read template file:", err);
  }

  // Replace placeholders
  content = content
    .replace(/{{videoId}}/g, videoId)
    .replace(/{{originalUrl}}/g, originalUrl)
    .replace(/{{filename}}/g, filename);

  // Create the note
  await app.vault.create(newNotePath, content);

  // Open the file in editor
  const created = app.vault.getAbstractFileByPath(newNotePath);
  if (created instanceof TFile) {
    await app.workspace.getLeaf(true).openFile(created);
  }
}
