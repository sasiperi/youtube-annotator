// src/utils/createNoteFromTemplate.ts
import { App, normalizePath, Notice, TFile, Vault } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";
import { generateFilename } from "./date-timestamp";

export async function createNoteFromTemplate(
  app: App,
  settings: YoutubeAnnotatorSettings,
  videoId: string,
  originalUrl: string
): Promise<void> {
  const { templateFolder, templateFilename, filenamePrefix } = settings;
  const timestamp = generateFilename(); // e.g., 20250804_1732
  const filename = `${filenamePrefix || "YT_"}${timestamp}.md`;

  const targetPath = normalizePath(filename);

  try {
    // Load the template
    const templatePath = normalizePath(`${templateFolder}/${templateFilename}`);
    const templateFile = app.vault.getAbstractFileByPath(templatePath);

    let content: string;
    if (templateFile && templateFile instanceof TFile) {
        content = await app.vault.read(templateFile);
        } else {
        new Notice(`⚠️ Template not found. Creating blank fallback note.`);
        content = "";
        }
      content = `---
video_url: ${originalUrl}
video_id: ${videoId}
created: ${window.moment().format("YYYY-MM-DD")}
tags: [youtube/annotator]
---

# 🎥 Notes on ${videoId}

## ⏱️ Timestamps

- [[00:00]](#00:00)

## 📝 Summary

Start taking notes here...`;

await app.vault.create(targetPath, content);
    new Notice(`📄 Note created: ${filename}`);
  } catch (err: any) {
    console.error("❌ Failed to create note:", err);
    new Notice("❌ Failed to create note: " + err.message);
  }
}
