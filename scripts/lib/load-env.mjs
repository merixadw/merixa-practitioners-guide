/**
 * Load .env / .env.local into process.env without printing values.
 * Does not override variables already set in the shell.
 * On Windows, also pulls User-scope env vars when process.env is empty
 * (Cursor shells often start before a newly set User variable is visible).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readWindowsUserEnv(name) {
  if (process.platform !== "win32") return "";
  if (process.env[name]?.trim()) return "";
  const script = `[Environment]::GetEnvironmentVariable('${name}','User')`;
  try {
    return execSync(`powershell -NoProfile -Command ${JSON.stringify(script)}`, {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

export function loadEnvFiles(rootDir) {
  const files = [".env", ".env.local", ".env.local.txt"];
  let loaded = 0;
  for (const name of files) {
    const path = join(rootDir, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(
        /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
      );
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
    loaded += 1;
  }

  for (const key of [
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_MODEL_PREMIUM",
    "OPENAI_MODEL_PREMIUM_LIGHT",
    "OPENAI_MODEL_LITE",
    "OPENAI_BASE_URL",
  ]) {
    if (process.env[key]?.trim()) continue;
    const fromUser = readWindowsUserEnv(key);
    if (fromUser) process.env[key] = fromUser;
  }

  // Prefer Premium model for library enrichment when only PREMIUM is set.
  if (
    !process.env.OPENAI_MODEL?.trim() &&
    process.env.OPENAI_MODEL_PREMIUM?.trim()
  ) {
    process.env.OPENAI_MODEL = process.env.OPENAI_MODEL_PREMIUM.trim();
  }

  return {
    loaded,
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };
}
