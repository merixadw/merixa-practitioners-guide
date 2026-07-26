/**
 * Atomic JSON/text writes — avoid torn reads when enrich + shelf expand race.
 */
import { renameSync, unlinkSync, writeFileSync } from "node:fs";

export function atomicWriteFile(path, contents, encoding = "utf8") {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tmp, contents, encoding);
    renameSync(tmp, path);
  } catch (error) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw error;
  }
}

export function atomicWriteJson(path, value) {
  atomicWriteFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
