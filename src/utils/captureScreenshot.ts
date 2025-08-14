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
  // Prefer the built-in protocol that opens selection overlay immediately
  const electron = require("electron");
  try {
    // Fast path on most Win10/11 installs (no Snipping Tool window)
    electron.shell.openExternal("ms-screenclip:");
  } catch {
    try {
      // Fallback: still tries to invoke the protocol via shell
      cp.exec('start "" ms-screenclip:');
    } catch {
      try {
        // Fallback 2: Snipping Tool in direct clip mode (selection overlay)
        cp.exec('start "" SnippingTool.exe /clip');
      } catch {
        try {
          // Fallback 3: some systems register lowercase alias
          cp.exec('start "" snippingtool /clip');
        } catch {
          // Final fallback: open app (user may need one extra click)
          cp.exec('start "" SnippingTool.exe');
        }
      }
    }
  }

  // Now poll clipboard for the captured image (same as before)
  const clipboard = electron.clipboard;
  const img = await waitForClipboardImage(clipboard, 30000, 250);
  if (!img || img.isEmpty()) throw new Error("No image captured to clipboard.");

  let buffer: Buffer;
  if (format === "png") buffer = img.toPNG();
  else if (format === "jpg") buffer = img.toJPEG(90);
  else buffer = img.toPNG(); // Electron doesn't emit webp directly; keep PNG

  await app.vault.adapter.writeBinary(
    relPath,
    bufferToArrayBuffer(buffer) as ArrayBuffer
  );
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
