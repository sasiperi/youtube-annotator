// src/utils/timestamphandlers.ts
import { App, MarkdownView } from "obsidian";
import { VIEW_TYPE_YOUTUBE_ANNOTATOR } from "../constants";
import { YouTubeView } from "../views/YouTubeView";

export interface TypingPauseResumeSettings {
  autoPauseOnTyping: boolean;
  autoResumeAfterTyping: boolean;
  autoResumeDelay: number; // seconds
}

type PlayerWrapperLike = {
  isPlayerReady: () => boolean;

  // state getters (either naming)
  getPlayerState?: () => number;
  getState?: () => number;

  // pause/play (either naming)
  pauseVideo?: () => void;
  pause?: () => void;
  playVideo?: () => void;
  play?: () => void;
};

export function registerTypingPauseResume(
  app: App,
  settings: TypingPauseResumeSettings,
  register: (cb: () => void) => void
) {
  let resumeTimer: number | null = null;
  let wasPlayingBeforeType = false;

  const onKeyDown = (e: KeyboardEvent) => {
    // If neither feature is enabled, skip fast
    if (!settings.autoPauseOnTyping && !settings.autoResumeAfterTyping) return;

    const mv = app.workspace.getActiveViewOfType(MarkdownView);
    if (!mv) return;

    // Ignore pure modifiers
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;

    const leaf = app.workspace.getLeavesOfType(VIEW_TYPE_YOUTUBE_ANNOTATOR)?.[0];
    const view = leaf?.view as YouTubeView | undefined;
    const pw = view?.playerWrapper as PlayerWrapperLike | undefined;
    if (!pw?.isPlayerReady()) return;

    // Wrapper helpers that do not use ?? on void-returning methods
    const getState = (): number | undefined => {
      if (typeof pw.getPlayerState === "function") return pw.getPlayerState();
      if (typeof pw.getState === "function") return pw.getState();
      return undefined;
    };

    const pause = (): void => {
      if (typeof pw.pauseVideo === "function") pw.pauseVideo();
      else if (typeof pw.pause === "function") pw.pause();
    };

    const play = (): void => {
      if (typeof pw.playVideo === "function") pw.playVideo();
      else if (typeof pw.play === "function") pw.play();
    };

    // Auto-pause immediately if typing while playing
    if (settings.autoPauseOnTyping && getState() === 1) {
      pause();
      wasPlayingBeforeType = true;
    }

    // Auto-resume after debounce
    if (settings.autoResumeAfterTyping && wasPlayingBeforeType) {
      if (resumeTimer !== null) {
        window.clearTimeout(resumeTimer);
        resumeTimer = null;
      }

      const delayMs = Math.max(0, Math.floor(settings.autoResumeDelay ?? 2)) * 1000;

      resumeTimer = window.setTimeout(() => {
        resumeTimer = null;

        if (!pw.isPlayerReady()) {
          wasPlayingBeforeType = false;
          return;
        }

        const st = getState();
        if (st === 2 && wasPlayingBeforeType) {
          play();
        }
        wasPlayingBeforeType = false;
      }, delayMs);
    }
  };

  app.workspace.containerEl.addEventListener("keydown", onKeyDown, true);
  register(() => app.workspace.containerEl.removeEventListener("keydown", onKeyDown, true));
}
