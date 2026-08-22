import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), ".generate-debug.log");

export function debugLog(...parts: unknown[]): void {
  try {
    const text = parts
      .map((p) => (typeof p === "string" ? p : safeStringify(p)))
      .join(" | ");
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${text}\n`);
  } catch {
    // logging jangan pernah mengganggu alur utama
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}