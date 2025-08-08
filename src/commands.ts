import { App, Editor, MarkdownView, Notice } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import {
  // CMD_OPEN_ANNOTATOR,
  // CMD_OPEN_PLAYER,
  // CMD_OPEN_SPLIT_VIEW,
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
} from "./constants";
import {YouTubeView} from "./views/YouTubeView"
import { getLinkScheme } from "./utils/linkScheme";

export function registerCommands(plugin: YoutubeAnnotatorPlugin) {

  plugin.addCommand({
  id: "capture-video-timestamp",
  name: "Copy YT-timestamp to clipboard",
  callback: async () => {
    const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
    if (!leaf) {
      new Notice("❌ YouTube player not active");
      return;
    }

    const view = leaf.view as YouTubeView;
    if (!view.playerWrapper?.isPlayerReady()) {
      new Notice("⏳ Player not ready");
      return;
    }

    const time = Math.floor(view.playerWrapper.getCurrentTime());
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60).toString().padStart(2, "0");
    const secs = (time % 60).toString().padStart(2, "0");
    const timestamp = hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
    const scheme = getLinkScheme(plugin);
    const link = `[${timestamp}](${scheme}://${time})`;

    await navigator.clipboard.writeText(link);
    new Notice (`📋 Copied timestamp: ${link}`);
  },
});

// 
plugin.addCommand({
    id: "insert-video-timestamp",
    name: "Insert YT-timestamp at cursor",
    callback: async () => {
      const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
      if (!leaf) {
        new Notice("YouTube player not active");
        return;
      }

      const view = leaf.view as YouTubeView;
      if (!view.playerWrapper?.isPlayerReady()) {
        new Notice("⏳ Player not ready");
        return;
      }

      const time = Math.floor(view.playerWrapper.getCurrentTime());
      const hrs = Math.floor(time / 3600);
      const mins = Math.floor((time % 3600) / 60).toString().padStart(2, "0");
      const secs = (time % 60).toString().padStart(2, "0");
      const timestamp = hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
      const scheme = getLinkScheme(plugin);
      const link = `[${timestamp}](${scheme}://${time})`;

      const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      if (editor) {
        editor.replaceRange(link, editor.getCursor());
        new Notice(`Inserted timestamp: ${link}`);
      } else {
        await navigator.clipboard.writeText(link);
        new Notice(`Copied timestamp (no editor): ${link}`);
      }
    },
  });

  // Future command # 1
  
  // Future command # 2 etc
}