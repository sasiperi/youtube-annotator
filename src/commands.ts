import type YoutubeAnnotatorPlugin from "./main";
import {
  CMD_OPEN_ANNOTATOR,
  CMD_OPEN_PLAYER,
  CMD_OPEN_SPLIT_VIEW,
  VIEW_TYPE_YOUTUBE_ANNOTATOR,
  VIEW_TYPE_YOUTUBE_PLAYER,
  VIEW_TYPE_YOUTUBE_SPLIT,
} from "./constants";
//import { YoutubeUrlModal } from "./modal/YouTubePlayerModal"

export function registerCommands(plugin: YoutubeAnnotatorPlugin) {
  plugin.addCommand({
    id: CMD_OPEN_ANNOTATOR,
    name: "Open YouTube Annotator",
    callback: () => plugin.activateView(),
  });

  plugin.addCommand({
    id: CMD_OPEN_PLAYER,
    name: "Open YouTube Player",
    callback: () => plugin.activateView(),
  });

  plugin.addCommand({
    id: CMD_OPEN_SPLIT_VIEW,
    name: "Open YouTube Split View",
    callback: () => plugin.activateView(),
  });

  // Future commands:
  // - command to annotate current note with timestamps
  // - command to jump to next/prev timestamp in video
}