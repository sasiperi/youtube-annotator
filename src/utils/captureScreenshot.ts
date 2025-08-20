// src/utils/captureScreenshot.ts
import { App, Notice, MarkdownView, normalizePath, FileSystemAdapter } from "obsidian";
import { generateDateTimestamp, DateTimestampFormat } from "../utils/date-timestamp";
import type { Buffer } from "buffer";

/* Node/Electron requires (kept inline for Obsidian/Electron env) */
const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const electron = require("electron");

export type ImageFormat = "png" | "jpg" | "webp";

// ============ BUTTOM COMMAND OPTIONS ===============
export interface ScreenshotOptions {
  folder: string;
  format: ImageFormat;
  timestampFmt?: DateTimestampFormat;
  // ============ EXPERIMENTAL WINDOWS ONLY ===============
  reuseLastRegion?: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
  if (ab instanceof ArrayBuffer) return ab;
  const src = new Uint8Array(ab as ArrayBufferLike);
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(src);
  return out;
}

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


const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

// ============ BUTTON MAIN ENTRY ===============
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

// ============ FOR MAC OS ===============

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

// ============ FOR WINDOWS  ===============
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

  // clear the clipboard now for fresh clean clip
  if (!reuseLastRegion) {
    try { clipboard.clear(); } catch {}
  }
}