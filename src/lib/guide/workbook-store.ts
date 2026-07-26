import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { TutorSpreadsheetVisual } from "@/lib/guide/tutor-visuals";
import {
  workbookFromSpreadsheet,
  type WorkbookBuildOptions,
} from "@/lib/guide/workbook-from-visual";

const CATALOG_KEY = "merixa.guide.savedWorkbooks.v1";
const WORKBOOK_DIR = "Merixa/Workbooks";
const SHARE_DIR = "merixa-workbook-share";

export type SavedWorkbookMeta = {
  id: string;
  title: string;
  filename: string;
  relativePath: string;
  savedAt: string;
  source: "tutor-spreadsheet";
};

export type WorkbookActionResult =
  | { kind: "saved"; meta: SavedWorkbookMeta }
  | { kind: "shared"; meta: SavedWorkbookMeta }
  | { kind: "downloaded"; meta: SavedWorkbookMeta }
  | { kind: "cancelled" }
  | { kind: "unavailable"; message: string };

function readCatalog(): SavedWorkbookMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CATALOG_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedWorkbookMeta =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedWorkbookMeta).id === "string" &&
        typeof (item as SavedWorkbookMeta).filename === "string",
    );
  } catch {
    return [];
  }
}

function writeCatalog(items: SavedWorkbookMeta[]) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(items.slice(0, 40)));
}

export function listSavedWorkbooks(): SavedWorkbookMeta[] {
  return readCatalog().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function upsertCatalog(meta: SavedWorkbookMeta) {
  const next = [
    meta,
    ...readCatalog().filter((item) => item.filename !== meta.filename),
  ];
  writeCatalog(next);
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function downloadBlob(filename: string, bytes: Uint8Array, mimeType: string) {
  const blob = new Blob([toBlobPart(bytes)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function ensureDir(path: string, directory: Directory) {
  try {
    await Filesystem.mkdir({ path, directory, recursive: true });
  } catch {
    /* may already exist */
  }
}

async function writeNativeWorkbook(
  relativePath: string,
  base64: string,
  directory: Directory,
): Promise<string> {
  const parent = relativePath.includes("/")
    ? relativePath.slice(0, relativePath.lastIndexOf("/"))
    : WORKBOOK_DIR;
  await ensureDir(parent, directory);
  await Filesystem.writeFile({
    path: relativePath,
    data: base64,
    directory,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({ path: relativePath, directory });
  return uri;
}

function buildMeta(
  visual: TutorSpreadsheetVisual,
  filename: string,
): SavedWorkbookMeta {
  return {
    id: `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    title: visual.title,
    filename,
    relativePath: `${WORKBOOK_DIR}/${filename}`,
    savedAt: new Date().toISOString(),
    source: "tutor-spreadsheet",
  };
}

/**
 * Persist a Tutor spreadsheet as a real .xlsx.
 * Native: Documents/Merixa/Workbooks (Files app when file sharing enabled).
 * Web: browser download + catalog entry.
 */
export async function saveWorkbookFromVisual(
  visual: TutorSpreadsheetVisual,
  buildOptions?: WorkbookBuildOptions,
): Promise<WorkbookActionResult> {
  try {
    const built = workbookFromSpreadsheet(visual, buildOptions);
    const meta = buildMeta(visual, built.filename);

    if (Capacitor.isNativePlatform()) {
      await writeNativeWorkbook(
        meta.relativePath,
        built.base64,
        Directory.Documents,
      );
      upsertCatalog(meta);
      return { kind: "saved", meta };
    }

    downloadBlob(built.filename, built.bytes, built.mimeType);
    upsertCatalog(meta);
    return { kind: "downloaded", meta };
  } catch (error) {
    return {
      kind: "unavailable",
      message:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not save the workbook.",
    };
  }
}

/**
 * Save (if needed) then open the system share sheet with the .xlsx attached.
 * Offline-safe: builds from the in-memory visual payload — no network.
 */
export async function shareWorkbookFromVisual(
  visual: TutorSpreadsheetVisual,
  buildOptions?: WorkbookBuildOptions,
): Promise<WorkbookActionResult> {
  try {
    const built = workbookFromSpreadsheet(visual, buildOptions);
    const meta = buildMeta(visual, built.filename);

    if (Capacitor.isNativePlatform()) {
      // Keep a durable copy under Documents, then share from Cache.
      await writeNativeWorkbook(
        meta.relativePath,
        built.base64,
        Directory.Documents,
      );
      const sharePath = `${SHARE_DIR}/${built.filename}`;
      const uri = await writeNativeWorkbook(
        sharePath,
        built.base64,
        Directory.Cache,
      );
      upsertCatalog(meta);

      await Share.share({
        title: built.title,
        text: `${built.title} — Merixa Practitioner’s Guide workbook`,
        files: [uri],
        dialogTitle: "Share workbook",
      });
      return { kind: "shared", meta };
    }

    const file = new File([toBlobPart(built.bytes)], built.filename, {
      type: built.mimeType,
    });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (typeof nav.share === "function") {
      const data: ShareData = {
        title: built.title,
        text: `${built.title} — Merixa workbook`,
        files: [file],
      };
      try {
        if (!nav.canShare || nav.canShare(data)) {
          await nav.share(data);
          upsertCatalog(meta);
          return { kind: "shared", meta };
        }
      } catch (error) {
        if (
          error instanceof Error &&
          /abort|cancel/i.test(error.name + error.message)
        ) {
          return { kind: "cancelled" };
        }
      }
    }

    downloadBlob(built.filename, built.bytes, built.mimeType);
    upsertCatalog(meta);
    return { kind: "downloaded", meta };
  } catch (error) {
    if (
      error instanceof Error &&
      /abort|cancel/i.test(error.name + error.message)
    ) {
      return { kind: "cancelled" };
    }
    return {
      kind: "unavailable",
      message:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not share the workbook.",
    };
  }
}
