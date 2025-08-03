// src/types/youtube.d.ts

export {}; // makes this a module

declare global {
  namespace YT {
    interface Player {
      playVideo(): void;
      pauseVideo(): void;
      getCurrentTime(): number;
      destroy(): void;
    }

    interface PlayerEvent {
      target: Player;
    }

    interface OnStateChangeEvent {
      data: number;
      target: Player;
    }

    interface PlayerOptions {
      height: string;
      width: string;
      videoId: string;
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (event: OnStateChangeEvent) => void;
      };
    }

    var Player: {
      new (elementId: string | HTMLElement, options: PlayerOptions): Player;
    };

    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5
    }
  }

  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: typeof YT;
  }
}
