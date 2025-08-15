import { App, Editor, MarkdownView, Notice } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import {
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  SAVED_TIME_ANCHOR_PREFIX,
} from "./constants";
import { formatHMS } from "../src/utils/Time"
import {YouTubeView} from "./views/YouTubeView"
import { captureScreenshot } from "utils/captureScreenshot";

export function registerCommands(plugin: YoutubeAnnotatorPlugin) {

//  =================== COMMAND TO CAPTURE VIDEO TIME TO CLIPBOARD ==========================
  plugin.addCommand({
  id: "capture-video-timestamp",
  name: "Copy YT-timestamp to clipboard",
  callback: async () => {
    const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
    if (!leaf) {
      new Notice("Player not active");
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
    new Notice(`Copied timeStamp: ${link}`);
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
      const link = `[${formatHMS(time)}](#${SAVED_TIME_ANCHOR_PREFIX}${time})`;

      const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      if (editor) {
        const cur = editor.getCursor();
        const lineText = editor.getLine(cur.line);
        const prevChar = cur.ch > 0 ? lineText.charAt(cur.ch - 1) : "";
        const needsLeadingSpace = cur.ch > 0 && !/\s|\(|\[/.test(prevChar);

        const textToInsert = `${needsLeadingSpace ? " " : ""}${link} `;
        editor.replaceRange(textToInsert, cur);

        // place caret right after the inserted space
        editor.setCursor({ line: cur.line, ch: cur.ch + textToInsert.length });

        new Notice(`Inserted timeStamp: ${link}`);
      } else {
        await navigator.clipboard.writeText(link);
        new Notice(`Copied timeStamp (no editor): ${link}`);
      }
    },
  });
// === Toggle playback (hotkey-friendly) ===
plugin.addCommand({
  id: "toggle-playback",
  name: "Toggle playback",
  callback: () => {
    const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
    const view = leaf?.view as YouTubeView | undefined;
    if (!view?.playerWrapper?.isPlayerReady()) {
      new Notice("Player not ready", 2000);
      return;
    }
    const state = view.playerWrapper.getState(); // 1=playing, 2=paused
    if (state === 1) view.playerWrapper.pause();
    else view.playerWrapper.play();
  },
});
   //=================== CAPTURE REGION FOR SCREENSHOT ==========================  
  
   plugin.addCommand({
    id: "capture-youtube-screenshot",
    name: "Capture screenshot → insert at cursor",
    callback: async () => {
      if (!plugin.settings.enableScreenCapture) {
        new Notice("Screen capture is disabled in settings.", 2000);
        return;
      }
      try {
        await captureScreenshot(plugin.app, {
          folder: plugin.settings.screenshotFolder,
          format: plugin.settings.screenshotFormat,
          timestampFmt: plugin.settings.timestampFormat, // reuse your existing setting
        });
      } catch (err) {
        console.error(err);
        new Notice("Screenshot failed. See console for details.", 2500);
      }
    },
  });


//=================== REUSE LAST CAPTURE REGION FOR NEXT CAPTURE ==========================  
plugin.addCommand({
  id: "screenshot-capture-reuse-region",
  name: "Screenshot: Capture (reuse last region if available)",
  callback: async () => {
    if (!plugin.settings.enableScreenCapture) {
      new Notice("Enable screen capture in settings first.", 2000);
      return;
    }
    try {
      await captureScreenshot(plugin.app, {
        folder: plugin.settings.screenshotFolder,
        format: plugin.settings.screenshotFormat,
        timestampFmt: plugin.settings.timestampFormat,
        // 👇 this extra flag is optional; we’ll read it in the Windows branch
        reuseLastRegion: plugin.settings.rememberLastRegion,
      } as any); // keep type loose so we don't disturb your existing ScreenshotOptions elsewhere
    } catch (e) {
      console.error(e);
      new Notice("Screenshot failed. See console for details.", 2500);
    }
  },
});
  
  //  =================== PLACE HOLDER FOR FUTURE COMMAND #2 ==========================
}