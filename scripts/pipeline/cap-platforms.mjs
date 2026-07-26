/**
 * Shared Capacitor platform detection — honest about ios/ stub vs real project.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function hasIosProject(root = process.cwd()) {
  if (existsSync(join(root, "ios", "App"))) return true;
  const iosDir = join(root, "ios");
  if (!existsSync(iosDir)) return false;
  try {
    return readdirSync(iosDir).some(
      (name) => name.endsWith(".xcodeproj") || name.endsWith(".xcworkspace"),
    );
  } catch {
    return false;
  }
}

export function hasAndroidProject(root = process.cwd()) {
  return existsSync(join(root, "android", "app"));
}

export function isIosStubOnly(root = process.cwd()) {
  return existsSync(join(root, "ios", ".gitkeep")) && !hasIosProject(root);
}

export function readCapWebDir(root = process.cwd()) {
  const tsPath = join(root, "capacitor.config.ts");
  const jsonPath = join(root, "capacitor.config.json");
  if (existsSync(tsPath)) {
    const text = readFileSync(tsPath, "utf8");
    return text.match(/webDir\s*:\s*["']([^"']+)["']/)?.[1] ?? null;
  }
  if (existsSync(jsonPath)) {
    try {
      return JSON.parse(readFileSync(jsonPath, "utf8")).webDir ?? null;
    } catch {
      return null;
    }
  }
  return null;
}
