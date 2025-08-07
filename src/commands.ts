import { App, Notice } from "obsidian";
import type YoutubeAnnotatorPlugin from "./main";
import {
  // CMD_OPEN_ANNOTATOR,
  // CMD_OPEN_PLAYER,
  // CMD_OPEN_SPLIT_VIEW,
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
} from "./constants";
import {YouTubeView} from "./views/YouTubeView"



export function registerCommands(plugin: YoutubeAnnotatorPlugin) {


  
  // plugin.addCommand({
  //   id: CMD_OPEN_ANNOTATOR,
  //   name: "Open YouTube Annotator",
  //   callback: () => plugin.activateView(),
  // });

  // plugin.addCommand({
  //   id: CMD_OPEN_PLAYER,
  //   name: "Open YouTube Player",
  //   callback: () => plugin.activateView(),
  // });

  // plugin.addCommand({
  //   id: CMD_OPEN_SPLIT_VIEW,
  //   name: "Open YouTube Split View",
  //   callback: () => plugin.activateView(),
  // });

  plugin.addCommand({
  id: "youtube-annotator-capture-video-timestamp",
  name: "Capture timestamp from YouTube video",
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
    const link = `[${timestamp}](ytseek://${time})`;

    await navigator.clipboard.writeText(link);
    new Notice (`📋 Copied timestamp: ${link}`);
  },
});


  // Future commands:
  // - command to annotate current note with timestamps
  // - command to jump to next/prev timestamp in video
}