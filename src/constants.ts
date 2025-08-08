/*
constants.ts define Any constants you want to reuse globally
*/
// src/constants/constants.ts
export const VIEW_STATE_KEY = "youtube-view-state"; // if you save last open view or tab

//  icons consistently in ribbon or status bar:
export const ICON_YOUTUBE = "play-circle";


// Plugin identifiers
export const PLUGIN_ID = "youtube-annotator";

// View types for workspace leaf registration
export const VIEW_TYPE_YOUTUBE_PLAYER = "youtube-player";
export const VIEW_TYPE_YOUTUBE_ANNOTATOR = "youtube-annotator";
export const VIEW_TYPE_YOUTUBE_SPLIT = "youtube-split";


// UI defaults (adjust to your design)
export const DEFAULT_SPLIT_WIDTH = 700;
export const DEFAULT_SPLIT_HEIGHT = 500;

// CSS class names used in views and modals
export const CLASS_TIMESTAMP = "yt-timestamp";
export const CLASS_PLAY_BUTTON = "yt-play-btn";
export const CLASS_SPEED_BUTTON = "yt-speed-btn"
export const CLASS_ANNOTATION_NOTE = "yt-annotation-note";

// Command IDs for keyboard shortcuts & commands
 export const CMD_YTVIDEO_TIMESTAMP = "capture-video-timestamp";
 export const SAVED_TIME_LINK = "go2saved_timestamp"; // jump to saved time-stamp 

// Setting keys for persistence
export const SETTING_LAST_USED_URL = "last-used-url";


export const SETTINGS_GROUP_UI = "ui-settings";
export const SETTINGS_GROUP_BEHAVIOR = "behavior-settings";

export const FILE_PREFIX_ANNOTATION = "YT_ANNOT_";
export const FILE_PREFIX_SCREENSHOT = "YT_SS_";

export const MARKDOWN_TIMESTAMP_LINK = "[[{timestamp}]](#{{timestamp}})";

