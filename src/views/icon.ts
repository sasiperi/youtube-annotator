import { addIcon } from "obsidian";

export const ICON_IDS = {
  youtube: "yt-annotator", 
  timestamp: "yt-timestamp",
  camera: "yt-screenShot",
  //close:"yt-closeView",

} as const;

const ICON_SVGS: Record<(typeof ICON_IDS)[keyof typeof ICON_IDS], string> = {

// YouTube-Annotator Ribbon icon
    "yt-annotator": `
<svg viewBox="0 0 24 24" aria-hidden="true">
     <rect x="2" y="4" rx="4" ry="4" width="20" height="16" fill="none" stroke="currentColor" stroke-width="1.5"/>
     <path d="M10 9l5 3-5 3V9z" fill="currentColor"/>
</svg>`,
 
// timeStamp icon under the YouTube Player in View
"yt-timestamp": `
<svg viewBox="0 0 24 24" aria-hidden="true" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3 2"/>
</svg>`,

  "yt-screenShot": `
<svg viewBox="0 0 24 24" aria-hidden="true" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="7" width="18" height="14" rx="2"/>
  <path d="M8 7l1.5-3h5L16 7"/>
  <circle cx="12" cy="14" r="3"/>
</svg>`,

};

export function registerIcons() {
  (Object.keys(ICON_SVGS) as Array<keyof typeof ICON_SVGS>).forEach((id) => {
    addIcon(id, ICON_SVGS[id]);
  });
}