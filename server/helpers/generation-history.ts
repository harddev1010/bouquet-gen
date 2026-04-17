import * as fs from "fs/promises";
import path from "path";
import { getProjectRoot } from "./path-utils";

const HISTORY_VERSION = 1;
const MAX_ENTRIES = 5000;

const dataDir = () => path.join(getProjectRoot(), "data");
const historyFile = () => path.join(dataDir(), "generation-history.json");

export type GenerationKind = "poster-line" | "poster-combined" | "bouquet-line";

export interface GenerationHistoryEntry {
  at: string;
  kind: GenerationKind;
  orderId: string;
  lineItemId?: string;
  filename: string;
  path: string;
  orderTitle?: string;
  customerEmail?: string;
  lineItemTitle?: string;
}

/** Serialize appends so concurrent requests do not corrupt the JSON file. */
let writeQueue: Promise<void> = Promise.resolve();

async function persistAppend(entry: GenerationHistoryEntry): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  let data: { version: number; entries: GenerationHistoryEntry[] };
  try {
    const raw = await fs.readFile(historyFile(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "entries" in parsed &&
      Array.isArray((parsed as { entries: unknown }).entries)
    ) {
      data = parsed as { version: number; entries: GenerationHistoryEntry[] };
    } else {
      data = { version: HISTORY_VERSION, entries: [] };
    }
  } catch {
    data = { version: HISTORY_VERSION, entries: [] };
  }
  data.version = HISTORY_VERSION;
  data.entries.push(entry);
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
  }
  await fs.writeFile(historyFile(), JSON.stringify(data, null, 2), "utf8");
}

/**
 * Append one PDF generation record (order-based poster flows).
 * Errors are logged only; callers should not block the HTTP response on this.
 */
export function appendGenerationHistory(
  entry: Omit<GenerationHistoryEntry, "at"> & { at?: string },
): Promise<void> {
  const full: GenerationHistoryEntry = {
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    orderId: entry.orderId,
    lineItemId: entry.lineItemId,
    filename: entry.filename,
    path: entry.path,
    orderTitle: entry.orderTitle,
    customerEmail: entry.customerEmail,
    lineItemTitle: entry.lineItemTitle,
  };
  writeQueue = writeQueue.then(() => persistAppend(full));
  return writeQueue;
}

export async function readGenerationHistory(): Promise<GenerationHistoryEntry[]> {
  try {
    const raw = await fs.readFile(historyFile(), "utf8");
    const parsed = JSON.parse(raw) as { entries?: GenerationHistoryEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}
