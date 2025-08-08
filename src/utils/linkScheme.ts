// utils/linkScheme.ts
import type YoutubeAnnotatorPlugin from "../main";

export function getLinkScheme(plugin: YoutubeAnnotatorPlugin): string {
  return `go2_${plugin.settings.filenamePrefix || "ytseek"}`;
}
