// src/youtube/youtubeApi.ts

let isAPILoaded = false;

export function loadYouTubeIframeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAPILoaded || window.YT?.Player) {
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      isAPILoaded = true;
      resolve();
    };

    tag.onerror = () => reject(new Error("Failed to load YouTube Iframe API"));
  });
}
