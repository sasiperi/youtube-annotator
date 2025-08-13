// utils/initializeDefaultStructure.ts
import { App, normalizePath, TFile } from "obsidian";

export async function initializeDefaultStructure(app: App, plugin: any) {
  const base = "YouTube-Annotator";
  const folders = ["notes", "templates", "screenshots", "media"];

  for (const folder of folders) {
    const fullPath = normalizePath(`${base}/${folder}`);
    const exists = app.vault.getAbstractFileByPath(fullPath);
    if (!exists) await app.vault.createFolder(fullPath);
  }

  // Copy default template
  const templateTargetPath = normalizePath(`${base}/templates/youtube_template.md`);
  const alreadyExists = app.vault.getAbstractFileByPath(templateTargetPath);
  if (!alreadyExists) {
    const templateContent = await fetchDefaultTemplate();
    await app.vault.create(templateTargetPath, templateContent);
  }

  // Update plugin settings
  plugin.settings.templateFolder = `${base}/templates`;
  plugin.settings.templateFile = `${base}/templates/youtube_template.md`;
  plugin.settings.notesFolder = `${base}/notes`;
  plugin.settings.screenshotFolder = `${base}/screenshots`;
  plugin.settings.mediaFolder = `${base}/media`;
  await plugin.saveSettings();
}

// Load from local .md file in /src (bundled)
async function fetchDefaultTemplate(): Promise<string> {
  return `---
videoAuthor: "{{videoAuthor}}"
videoTitle: "{{videoTitle}}"
videoId:
  - "{{videoId}}"
originalUrl: "{{originalUrl}}"
created: "{{date}}"
tags:
  - youtube
  - notes
---

### [Notes on {{videoTitle}}]({{originalUrl}})

#### Timestamps
Start taking notes here...

#### Summary
`;
}