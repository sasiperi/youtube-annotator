// utils/generateFilename.ts
import { normalizePath } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";
import { generateDateTimestamp } from "./date-timestamp";

export function generateNoteFilename(settings: YoutubeAnnotatorSettings): {
  filename: string;
  fullPath: string;
} {
  const timestamp = generateDateTimestamp(settings.timestampFormat);
  const prefix = settings.filenamePrefix || "YT_";
  const folder = settings.notesFolder || "";
  const filename = `${prefix}${timestamp}.md`;
  const fullPath = normalizePath(`${folder}/${filename}`);

  return { filename, fullPath };
}