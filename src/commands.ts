import { App, Editor, MarkdownView, Notice } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import {
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  SAVED_TIME_ANCHOR_PREFIX,
} from "./constants";
import { formatHMS } from "../src/utils/Time"
import {YouTubeView} from "./views/YouTubeView"

export function registerCommands(plugin: YoutubeAnnotatorPlugin) {

//  =================== COMMAND TO CAPTURE VIDEO TIME TO CLIPBOARD ==========================
  plugin.addCommand({
  id: "capture-video-timestamp",
  name: "Copy YT-timestamp to clipboard",
  callback: async () => {
    const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
    if (!leaf) {
      new Notice("YouTube player not active");
      return;
    }

    const view = leaf.view as YouTubeView;
    if (!view.playerWrapper?.isPlayerReady()) {
      new Notice("Player not ready");
      return;
    }
    const time = Math.floor(view.playerWrapper.getCurrentTime());
    const timestamp = formatHMS(time);
    //const link = `[${timestamp}](${SAVED_TIME_LINK}://${time})`;
    const link = `[${formatHMS(time)}](#${SAVED_TIME_ANCHOR_PREFIX}${time})`;

    await navigator.clipboard.writeText(link);
    new Notice(`Copied timestamp: ${link}`);
  },
});

//  =================== COMMAND TO CAPTURE VIDEO TIME & INSERT IN CURRENT NOTE ==========================
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
        new Notice("Player not ready");
        return;
      }

      const time = Math.floor(view.playerWrapper.getCurrentTime());
      const hrs = Math.floor(time / 3600);
      const mins = Math.floor((time % 3600) / 60).toString().padStart(2, "0");
      const secs = (time % 60).toString().padStart(2, "0");
      const timestamp = hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
      //const link = `[${timestamp}](${SAVED_TIME_LINK}://${time})`;
      const link = `[${formatHMS(time)}](#${SAVED_TIME_ANCHOR_PREFIX}${time})`;

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

  //  =================== FUTURE COMMAND #1 ==========================
  
  //  =================== FUTURE COMMAND #2 ==========================
}