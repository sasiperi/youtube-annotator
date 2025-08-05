import { normalizePath } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";
import { generateDateTimestamp } from "./date-timestamp";

export function generateNoteFilename(
  settings: YoutubeAnnotatorSettings
): { filename: string; fullPath: string } {
  const { filenamePrefix, notesFolder, timestampFormat } = settings;

  const timestamp = generateDateTimestamp(timestampFormat);
  const filename = `${filenamePrefix || "YT_"}${timestamp}.md`;

  const fullPath = normalizePath(`${notesFolder}/${filename}`);

  return { filename, fullPath };
}
