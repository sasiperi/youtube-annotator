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
      host: "https://www.youtube-nocookie.com",
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: "app://obsidian.md",
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        fs: 1,
        disablekb: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: (event) => {
          new Notice("YouTube player ready");
          if (onReady) onReady(event.target);
          resolve(event.target);
        },
        onStateChange: (event) => {
          if (onStateChange) onStateChange(event.data);
        },
      },
    };

    const mountId = typeof elementId === "string" ? elementId : elementId.id;
    new YT.Player(mountId, options);
  });
}