// utils/linkScheme.ts
import type YoutubeAnnotatorPlugin from "../main";

export function getLinkScheme(plugin: YoutubeAnnotatorPlugin): string {
  const prefix = plugin.settings.filenamePrefix?.trim() || "YT";
  return `go2_${prefix}`;
}