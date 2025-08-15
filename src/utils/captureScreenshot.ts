// // src/utils/captureScreenshot.ts
import { App, Notice, MarkdownView, normalizePath, FileSystemAdapter } from "obsidian";
import { generateDateTimestamp, DateTimestampFormat } from "../utils/date-timestamp";
import type { Buffer } from "buffer";

/* Node/Electron requires (kept inline for Obsidian/Electron env) */
const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const electron = require("electron");

export type ImageFormat = "png" | "jpg" | "webp";

/** Options passed by your button/command. */
export interface ScreenshotOptions {
  folder: string;
  format: ImageFormat;
  timestampFmt?: DateTimestampFormat;
  /** Windows only: try to reuse the last region if OS supports it */
  reuseLastRegion?: boolean;
}

/* ────────────────────────────────────────────────────────────────
   Helpers (KEEP ONE COPY in your project; delete/comment duplicates)
   ──────────────────────────────────────────────────────────────── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Safer editor pickup even if Snipping Tool stole focus */
function getAnyEditor(app: App) {
  const active = app.workspace.getActiveViewOfType(MarkdownView);
  if (active?.editor) return active.editor;

  const leaf = app.workspace.getLeavesOfType("markdown").first();
  const view = leaf?.view as MarkdownView | undefined;
  return view?.editor ?? null;
}

function insertAtCursor(app: App, md: string) {
  const editor = getAnyEditor(app);
  if (!editor) {
    new Notice("No active editor to insert screenshot", 2000);
    return;
  }
  editor.replaceRange(md + " ", editor.getCursor());
}

async function ensureFolder(app: App, folder: string) {
  const norm = normalizePath(folder);
  try {
    await app.vault.createFolder(norm);
  } catch (e: any) {
    // ignore "already exists"
    if (!String(e?.message ?? "").includes("already exists")) throw e;
  }
}

function toAbsoluteVaultPath(app: App, relPath: string): string | null {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) return null;
  const base = adapter.getBasePath();
  return path.join(base, relPath);
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  // If it's already a real ArrayBuffer, we're done.
  if (ab instanceof ArrayBuffer) return ab;

  // Otherwise it's a SharedArrayBuffer — copy into a new ArrayBuffer.
  const src = new Uint8Array(ab as ArrayBufferLike);
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(src);
  return out;
}


/** Simple “signature” of clipboard image so we can detect NEW image */
function getClipboardImageSignature(clipboard: any): string {
  try {
    const img = clipboard.readImage();
    if (!img || img.isEmpty()) return "";
    const size = img.getSize?.();
    return `${size?.width}x${size?.height}:${img.toDataURL?.()?.slice(0, 64) ?? ""}`;
  } catch {
    return "";
  }
}

/** Wait for a *new* image to land in the clipboard */
function waitForNewClipboardImage(
  clipboard: any,
  previousSig: string,
  timeoutMs: number,
  intervalMs: number
): Promise<any | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const img = clipboard.readImage?.();
      if (img && !img.isEmpty()) {
        const sig = getClipboardImageSignature(clipboard);
        if (sig && sig !== previousSig) return resolve(img);
      }
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/* ──────────────────────────────────────────────────────────────── */

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

/** Main entry: called by your button/command */
export async function captureScreenshot(app: App, opts: ScreenshotOptions): Promise<void> {
  const folder = normalizePath(opts.folder);
  await ensureFolder(app, folder);

  const ts = generateDateTimestamp(opts.timestampFmt ?? DateTimestampFormat.Compact);
  const filename = `YT_${ts}.${opts.format}`;
  const relPath = normalizePath(`${folder}/${filename}`);
  const absPath = toAbsoluteVaultPath(app, relPath);

  if (!absPath) {
    new Notice("Screenshots only supported on local vaults.", 2500);
    return;
  }

  try {
    if (isMac) {
      await captureOnMac(absPath, opts.format);
    } else if (isWin) {
      await captureOnWindows(app, relPath, opts.format, !!opts.reuseLastRegion);
    } else {
      new Notice("Screenshot: Unsupported OS (macOS/Windows only).", 2500);
      return;
    }

    // Give Obsidian a tick to settle focus after the OS tool closes
    await sleep(50);
    insertAtCursor(app, `![[${relPath}]]`);
    new Notice("Screenshot inserted", 1200);
  } catch (err) {
    console.error("Screenshot failed:", err);
    new Notice("Screenshot failed. See console for details.", 2500);
  }
}

/* ────────────────────────────────────────────────────────────────
   macOS: interactive region capture straight to file
   ──────────────────────────────────────────────────────────────── */

async function captureOnMac(absPath: string, format: ImageFormat) {
  // -i interactive region, -t format, -x quiet, -r no shadow
  const args = ["-i", "-t", format, "-x", "-r", absPath];
  await execFileAsync("screencapture", args);
  if (!fs.existsSync(absPath)) throw new Error("Screenshot not created.");
}

function execFileAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    cp.execFile(cmd, args, (err: any) => (err ? reject(err) : resolve()));
  });
}

/* ────────────────────────────────────────────────────────────────
   Windows: Snipping Tool via protocol; clipboard poll + save
   Reuse last region: we *don't* clear clipboard so Windows may reuse.
   Fresh region: we clear clipboard before/after.
   ──────────────────────────────────────────────────────────────── */

async function captureOnWindows(
  app: App,
  relPath: string,
  format: ImageFormat,
  reuseLastRegion: boolean = false
) {
  const { clipboard, shell } = electron;

  // Debug so you can see which path ran during tests
  new Notice(`Windows capture (reuse last area: ${reuseLastRegion ? "ON" : "OFF"})`, 1200);

  // Reuse ON => do NOT clear (lets OS sometimes reuse last region)
  // Reuse OFF => clear to force fresh selection
  if (!reuseLastRegion) {
    try { clipboard.clear(); } catch {}
  }

  // Launch Snipping overlay (prefer protocol; fallbacks included)
  let launched = false;
  try { shell.openExternal("ms-screenclip:"); launched = true; } catch {}
  if (!launched) { try { cp.exec('start "" ms-screenclip:'); launched = true; } catch {} }
  if (!launched) { try { cp.exec('start "" SnippingTool.exe /clip'); launched = true; } catch {} }
  if (!launched) { try { cp.exec('start "" snippingtool /clip'); launched = true; } catch {} }
  if (!launched) { try { cp.exec('start "" SnippingTool.exe'); } catch {} }

  // Give overlay a moment to appear
  await sleep(180);

  // Wait for a *new* image (not the stale clipboard)
  const previousSig = getClipboardImageSignature(clipboard);
  const img = await waitForNewClipboardImage(clipboard, previousSig, 30000, 180);
  if (!img || img.isEmpty()) throw new Error("No image captured to clipboard.");

  // Encode & save
  let buffer: Buffer;
  if (format === "png") buffer = img.toPNG();
  else if (format === "jpg") buffer = img.toJPEG(90);
  else buffer = img.toPNG(); // webp not available directly from Electron clipboard

  await app.vault.adapter.writeBinary(relPath, bufferToArrayBuffer(buffer) as ArrayBuffer);

  // If we want a fresh region next time, clear the clipboard now.
  if (!reuseLastRegion) {
    try { clipboard.clear(); } catch {}
  }
}

// import { App, Notice, MarkdownView, normalizePath, FileSystemAdapter } from "obsidian";
// import { generateDateTimestamp, DateTimestampFormat } from "../utils/date-timestamp";
// import type { Buffer } from "buffer";
// import { spawn } from "child_process";

// function sleep(ms: number) {
//   return new Promise((r) => setTimeout(r, ms));
// }

// /** Be resilient if Snipping Tool stole focus; pick an editor anyway. */
// function getAnyEditor(app: App) {
//   const active = app.workspace.getActiveViewOfType(MarkdownView);
//   if (active?.editor) return active.editor;
//   const leaf = app.workspace.getLeavesOfType("markdown").first();
//   const view = leaf?.view as MarkdownView | undefined;
//   return view?.editor ?? null;
// }

// // function insertAtCursor(app: App, md: string) {
// //   const editor = getAnyEditor(app);
// //   if (!editor) {
// //     new Notice("No active editor to insert screenshot", 2000);
// //     return;
// //   }
// //   editor.replaceRange(md + " ", editor.getCursor());
// // }


// declare const require: any;

// const cp = require("child_process");
// const path = require("path");
// const fs = require("fs");


// export type ImageFormat = "png" | "jpg" | "webp";

// export interface ScreenshotOptions {
//   folder: string;                 
//   format: ImageFormat;            
//   timestampFmt?: DateTimestampFormat;
//   reuseLastRegion?: boolean; // NEW — Windows-only toggle
// }

// async function ensureFolder(app: App, folder: string) {
//   const norm = normalizePath(folder);
//   try {
//     await app.vault.createFolder(norm);
//   } catch (e: any) {
//     if (!String(e?.message ?? "").includes("already exists")) throw e;
//   }
// }

// function toAbsoluteVaultPath(app: App, relPath: string): string | null {
//   const adapter = app.vault.adapter;
//   if (!(adapter instanceof FileSystemAdapter)) return null;
//   const base = adapter.getBasePath();
//   return path.join(base, relPath);
// }

// function insertAtCursor(app: App, md: string) {
//   const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
//   if (!editor) {
//     new Notice("No active editor to insert screenshot", 2000);
//     return;
//   }
//   editor.replaceRange(md + " ", editor.getCursor());
// }

// function bufferToArrayBuffer(buf: Buffer): ArrayBuffer | SharedArrayBuffer {
//   return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
// }

// const isMac = process.platform === "darwin";
// const isWin = process.platform === "win32";

// export async function captureScreenshot(app: App, opts: ScreenshotOptions): Promise<void> {
//   const folder = normalizePath(opts.folder);
//   await ensureFolder(app, folder);

//   const ts = generateDateTimestamp(opts.timestampFmt ?? DateTimestampFormat.Compact);
//   const filename = `YT_${ts}.${opts.format}`;
//   const relPath = normalizePath(`${folder}/${filename}`);
//   const absPath = toAbsoluteVaultPath(app, relPath);

//   if (!absPath) {
//     new Notice("Screenshots only supported on local vaults.", 2500);
//     return;
//   }

//   if (isMac) {
//     await captureOnMac(absPath, opts.format);
//   } else if (isWin) {
//     await captureOnWindows(app, relPath, opts.format, !!opts.reuseLastRegion);
//   } else {
//     new Notice("Screenshot: Unsupported OS (macOS/Windows only).", 2500);
//     return;
//   }
// // Give Obsidian a tick to settle focus after Snipping Tool closes
//   await sleep(50);
//   insertAtCursor(app, `![[${relPath}]]`);
//   new Notice("Screenshot inserted", 1200);
// }

// // macOS: interactive region capture to a file
// async function captureOnMac(absPath: string, format: ImageFormat) {
//   // -i  : interactive (shows region selector)
//   // -t  : file format (png | jpg | for now others later - pdf | tiff)
//   // -x  : no UI sound/feedback (quieter UX)
//   // -r  : no window shadow (cleaner crops)
//   const args = ["-i", "-t", format, "-x", "-r", absPath];

//   try {
//     await execFileAsync("screencapture", args);
//   } catch (err: any) {
//     // Common failure on first use is missing Screen Recording permission.
//     // Tell the user what to check.
//     new Notice(
//       "macOS blocked screen capture. Enable Screen Recording for Obsidian in System Settings → Privacy & Security.",
//       5000
//     );
//     throw err;
//   }

//   // Double‑check the file was actually created.
//   if (!fs.existsSync(absPath)) {
//     throw new Error("Screenshot not created.");
//   }
// }

// // async function captureOnMac(absPath: string, format: ImageFormat) {
// //   const args = ["-i", "-t", format, absPath]; // interactive region → writes to file
// //   await execFileAsync("screencapture", args);
// //   if (!fs.existsSync(absPath)) throw new Error("Screenshot not created.");
// // }

// // Add the optional flag with a default so old call sites still work

// async function captureOnWindows(
//   app: App,
//   relPath: string,
//   format: ImageFormat,
//   reuseLastRegion: boolean = false
// ) {
//   const electron = require("electron");
//   const { clipboard, shell } = electron;

//   // Reuse ON => do NOT clear (helps Windows offer "last region")
//   // Reuse OFF => clear to force a fresh selection
//   if (!reuseLastRegion) {
//     try { clipboard.clear(); } catch {}
//   }

//   // Debug (remove later if you want)
//   new Notice(`Windows capture (reuse last area: ${reuseLastRegion ? "ON" : "OFF"})`, 1200);

//   // Prefer protocol; fall back gracefully
//   let launched = false;
//   try { shell.openExternal("ms-screenclip:"); launched = true; } catch {}
//   if (!launched) { try { cp.exec('start "" ms-screenclip:'); launched = true; } catch {} }
//   if (!launched) { try { cp.exec('start "" SnippingTool.exe /clip'); launched = true; } catch {} }
//   if (!launched) { try { cp.exec('start "" snippingtool /clip'); launched = true; } catch {} }
//   if (!launched) { try { cp.exec('start "" SnippingTool.exe'); } catch {} }

//   // tiny head start so the overlay/spinner appears before we poll
//   await sleep(180);

//   const previousSig = getClipboardImageSignature(clipboard);
//   const img = await waitForNewClipboardImage(clipboard, previousSig, 30000, 180);
//   if (!img || img.isEmpty()) throw new Error("No image captured to clipboard.");

//   // Encode & save
//   let buffer: Buffer;
//   if (format === "png") buffer = img.toPNG();
//   else if (format === "jpg") buffer = img.toJPEG(90);
//   else buffer = img.toPNG();

//   await app.vault.adapter.writeBinary(
//     relPath,
//     bufferToArrayBuffer(buffer) as ArrayBuffer
//   );

//   // If we want fresh region next time, clear; otherwise keep clipboard content
//   if (!reuseLastRegion) {
//     try { clipboard.clear(); } catch {}
//   }
// }


// // A light signature so we can tell "new clipboard image" vs the last one
// function getClipboardImageSignature(clipboard: any): string {
//   try {
//     const img = clipboard.readImage();
//     if (!img || img.isEmpty()) return "empty";
//     const { width, height } = img.getSize();
//     const len = img.toPNG()?.length ?? 0;
//     return `${width}x${height}:${len}`;
//   } catch {
//     return "error";
//   }
// }

// // Waits for a clipboard image whose signature differs from `prevSig`
// function waitForNewClipboardImage(
//   clipboard: any,
//   prevSig: string,
//   timeoutMs: number,
//   intervalMs: number
// ): Promise<any | null> {
//   const start = Date.now();
//   return new Promise((resolve) => {
//     const tick = () => {
//       const img = clipboard.readImage?.();
//       if (img && !img.isEmpty()) {
//         const { width, height } = img.getSize();
//         const len = img.toPNG()?.length ?? 0;
//         const sig = `${width}x${height}:${len}`;
//         if (sig !== prevSig) return resolve(img);
//       }
//       if (Date.now() - start > timeoutMs) return resolve(null);
//       setTimeout(tick, intervalMs);
//     };
//     tick();
//   });
// }


// function execFileAsync(cmd: string, args: string[]): Promise<void> {
//   return new Promise((resolve, reject) => {
//     cp.execFile(cmd, args, (err: any) => (err ? reject(err) : resolve()));
//   });
// }

// function waitForClipboardImage(
//   clipboard: any,
//   timeoutMs: number,
//   intervalMs: number
// ): Promise<any | null> {
//   const start = Date.now();
//   return new Promise((resolve) => {
//     const tick = () => {
//       const img = clipboard.readImage();
//       if (img && !img.isEmpty()) return resolve(img);
//       if (Date.now() - start > timeoutMs) return resolve(null);
//       setTimeout(tick, intervalMs);
//     };
//     tick();
//   });
// }
