// src/utils/captureScreenshot.ts
import { App, Notice, MarkdownView, normalizePath, FileSystemAdapter } from "obsidian";
import { generateDateTimestamp, DateTimestampFormat } from "../utils/date-timestamp";
import type { Buffer } from "buffer";
import { spawn } from "child_process";

declare const require: any;

const cp = require("child_process");
const path = require("path");
const fs = require("fs");

export type ImageFormat = "png" | "jpg" | "webp";

export interface ScreenshotOptions {
  folder: string;                 
  format: ImageFormat;            
  timestampFmt?: DateTimestampFormat;
}

async function ensureFolder(app: App, folder: string) {
  const norm = normalizePath(folder);
  try {
    await app.vault.createFolder(norm);
  } catch (e: any) {
    if (!String(e?.message ?? "").includes("already exists")) throw e;
  }
}

function toAbsoluteVaultPath(app: App, relPath: string): string | null {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) return null;
  const base = adapter.getBasePath();
  return path.join(base, relPath);
}

function insertAtCursor(app: App, md: string) {
  const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  if (!editor) {
    new Notice("No active editor to insert screenshot", 2000);
    return;
  }
  editor.replaceRange(md + " ", editor.getCursor());
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer | SharedArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

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

  if (isMac) {
    await captureOnMac(absPath, opts.format);
  } else if (isWin) {
    await captureOnWindows(app, relPath, opts.format);
  } else {
    new Notice("Screenshot: Unsupported OS (macOS/Windows only).", 2500);
    return;
  }

  insertAtCursor(app, `![[${relPath}]]`);
  new Notice("Screenshot inserted", 1200);
}

async function captureOnMac(absPath: string, format: ImageFormat) {
  const args = ["-i", "-t", format, absPath]; // interactive region → writes to file
  await execFileAsync("screencapture", args);
  if (!fs.existsSync(absPath)) throw new Error("Screenshot not created.");
}

async function captureOnWindows(app: App, relPath: string, format: ImageFormat) {
  const electron = require("electron");
  const { clipboard, shell } = electron;

  // 1) Clear clipboard to avoid picking up the last image again
  try { clipboard.clear(); } catch {}

  // 2) Trigger the snip overlay (prefer protocol; fall back gracefully)
  let launched = false;
  try {
    shell.openExternal("ms-screenclip:");
    launched = true;
  } catch {}
  if (!launched) {
    try {
      cp.exec('start "" ms-screenclip:');
      launched = true;
    } catch {}
  }
  if (!launched) {
    try {
      cp.exec('start "" SnippingTool.exe /clip');
      launched = true;
    } catch {}
  }
  if (!launched) {
    try {
      cp.exec('start "" snippingtool /clip');
      launched = true;
    } catch {}
  }
  if (!launched) {
    // Final fallback: opens app (user may need one more click)
    try { cp.exec('start "" SnippingTool.exe'); } catch {}
  }

  // Tiny head start so the overlay can appear before we start polling
  await new Promise((r) => setTimeout(r, 180));

  // 3) Poll clipboard for a *new* image (not the previous one)
  const previousSig = getClipboardImageSignature(clipboard);
  const img = await waitForNewClipboardImage(clipboard, previousSig, 30000, 180);
  if (!img || img.isEmpty()) throw new Error("No image captured to clipboard.");

  // 4) Encode & save
  let buffer: Buffer;
  if (format === "png") buffer = img.toPNG();
  else if (format === "jpg") buffer = img.toJPEG(90);
  else buffer = img.toPNG(); // keep PNG for webp request

  await app.vault.adapter.writeBinary(
    relPath,
    bufferToArrayBuffer(buffer) as ArrayBuffer
  );

  // 5) Clear to reduce “every other capture” reusing stale clipboard content
  try { clipboard.clear(); } catch {}
}

// A light signature so we can tell "new clipboard image" vs the last one
function getClipboardImageSignature(clipboard: any): string {
  try {
    const img = clipboard.readImage();
    if (!img || img.isEmpty()) return "empty";
    const { width, height } = img.getSize();
    const len = img.toPNG()?.length ?? 0;
    return `${width}x${height}:${len}`;
  } catch {
    return "error";
  }
}

// Waits for a clipboard image whose signature differs from `prevSig`
function waitForNewClipboardImage(
  clipboard: any,
  prevSig: string,
  timeoutMs: number,
  intervalMs: number
): Promise<any | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const img = clipboard.readImage?.();
      if (img && !img.isEmpty()) {
        const { width, height } = img.getSize();
        const len = img.toPNG()?.length ?? 0;
        const sig = `${width}x${height}:${len}`;
        if (sig !== prevSig) return resolve(img);
      }
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}


function execFileAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    cp.execFile(cmd, args, (err: any) => (err ? reject(err) : resolve()));
  });
}

function waitForClipboardImage(
  clipboard: any,
  timeoutMs: number,
  intervalMs: number
): Promise<any | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const img = clipboard.readImage();
      if (img && !img.isEmpty()) return resolve(img);
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
