// src/youtube/playerWrapper.ts starats here
export class PlayerWrapper {
  private player: YT.Player;
  private isReady: boolean = false;
  private lastState: number | null = null;
  private onReadyCallback?: () => void;
  private onStateChangeCallback?: (state: number) => void;

  constructor(
    player: YT.Player,
    onReady?: () => void,
    onStateChange?: (state: number) => void
  ) {
    this.player = player;
    this.onReadyCallback = onReady;
    this.onStateChangeCallback = onStateChange;

    this.bindEvents();
  }

  private bindEvents() {

    this.player.addEventListener("onReady", () => {
      this.isReady = true;
      //console.log("Player ready (PlayerWrapper)");
      this.onReadyCallback?.();
    });

    this.player.addEventListener("onStateChange", (event: YT.OnStateChangeEvent) => {
      this.lastState = event.data;
      //console.log("State changed to:", event.data);
      this.onStateChangeCallback?.(event.data);
    });
  }

  play() {
    this.player.playVideo();
  }

  pause() {
    this.player.pauseVideo();
  }
  
  togglePlayPause(): string {
  const state = this.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      this.pause();
      return "paused";
    } else {
      this.play();
      return "playing";
    }
  }

  setPlaybackRate(speed: number): void {
    if (this.player && this.player.setPlaybackRate) {
      this.player.setPlaybackRate(speed);
    }
  }

  stop() {
    this.player.stopVideo();
  }

  getCurrentTime(): number {
    return this.player.getCurrentTime();
  }

  getState(): YT.PlayerState {
    return this.player.getPlayerState();
  }

  isPlayerReady(): boolean {
  const state = this.player?.getPlayerState?.();
  return state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED;
  }

  seekTo(seconds: number, allowSeekAhead = true): void {
  this.player.seekTo(seconds, allowSeekAhead);
  }



    destroy() {
    const p = this.player as YT.Player & { destroy?: () => void };
    if (typeof p.destroy === "function") {
      p.destroy();
    }
  }
}
// src/youtube/playerWrapper.ts ends here