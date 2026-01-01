// src/utils/captureScreenshot.ts
import { App, Notice, MarkdownView, normalizePath, FileSystemAdapter,Platform, } from "obsidian";
import { generateDateTimestamp, DateTimestampFormat } from "../utils/date-timestamp";
import type { Buffer } from "buffer";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as electron from "electron";


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

function tryLaunch(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    // Intentionally ignored: launch methods are platform / availability dependent
    return false;
  }
}


async function ensureFolder(app: App, folder: string): Promise<void> {
  const norm = normalizePath(folder);

  try {
    await app.vault.createFolder(norm);
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : String(e);

    if (!msg.includes("already exists")) throw e;
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

function getClipboardImageSignature(
  clipboard: Electron.Clipboard
): string {
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) return "";

    const size = img.getSize();
    return `${size.width}x${size.height}:${img
      .toDataURL()
      .slice(0, 64)}`;
  } catch {
    // Clipboard access can fail depending on OS / permissions
    return "";
  }
}


function waitForNewClipboardImage(
  clipboard: Electron.Clipboard,
  previousSig: string,
  timeoutMs: number,
  intervalMs: number
): Promise<Electron.NativeImage | null> {
  const start = Date.now();

  return new Promise((resolve) => {
    const tick = () => {
      const img = clipboard.readImage();
      if (!img.isEmpty()) {
        const sig = getClipboardImageSignature(clipboard);
        if (sig && sig !== previousSig) {
          return resolve(img);
        }
      }

      if (Date.now() - start > timeoutMs) {
        return resolve(null);
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });
}



// ============ BUTTON MAIN ENTRY ===============
export async function captureScreenshot(app: App, opts: ScreenshotOptions): Promise<void> {
  if (!Platform.isDesktopApp) {
    new Notice("Screenshots are only supported on desktop.", 2500);
    return;
  }

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
    if (Platform.isMacOS) {
      await captureOnMac(absPath, opts.format);
    } else if (Platform.isWin) {
      // pass through your reuseLastRegion flag (optional)
      await captureOnWindows(app, relPath, opts.format, opts.reuseLastRegion ?? false);
    } else {
      new Notice("Screenshot: unsupported desktop OS.", 2500);
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
    cp.execFile(cmd, args, (err: unknown) => (err ? reject(err) : resolve()));
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
  void clipboard.clear?.();
}

  let launched = false;
  launched ||= tryLaunch(() => shell.openExternal("ms-screenclip:"));
  launched ||= tryLaunch(() => cp.exec('start "" ms-screenclip:'));
  launched ||= tryLaunch(() => cp.exec('start "" SnippingTool.exe /clip'));
  launched ||= tryLaunch(() => cp.exec('start "" snippingtool /clip'));
  launched ||= tryLaunch(() => cp.exec('start "" SnippingTool.exe'));


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
  void clipboard.clear?.();
}
}