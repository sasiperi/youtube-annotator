// src/youtube/createYouTubePlayer.ts
/// <reference types="youtube" />

import { Notice } from "obsidian";
import { YoutubeAnnotatorSettings } from "../settings";

export async function createYouTubePlayer(
  elementId: string | HTMLElement,
  videoId: string,
  settings: YoutubeAnnotatorSettings,
  onReady?: (player: YT.Player) => void,
  onStateChange?: (state: number) => void
): Promise<YT.Player> {
  return new Promise((resolve) => {
    const options: YT.PlayerOptions = {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          new Notice("✅ YouTube player ready");
          if (onReady) onReady(event.target);
          resolve(event.target);
        },
        onStateChange: (event) => {
          if (onStateChange) onStateChange(event.data);
        },
      },
    };

    const player = new YT.Player(
  typeof elementId === "string" ? elementId : elementId.id,
  options
);

  });
}
