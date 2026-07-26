#!/usr/bin/env node
/**
 * Sync Capacitor native projects with webDir=out.
 *
 * Usage:
 *   node scripts/pipeline/cap-sync.mjs           # sync whatever platforms exist
 *   node scripts/pipeline/cap-sync.mjs --ios     # require real ios/ project
 *   node scripts/pipeline/cap-sync.mjs --android # require android/ project
 *   node scripts/pipeline/cap-sync.mjs --check-only
 *
 * Windows: ios/ is usually a stub (.gitkeep only). This script will not pretend
 * `cap sync ios` works — see CAPACITOR_SHIP.md for Mac steps.
 */
import { spawnSync } from "node:child_process";
import {
  hasAndroidProject,
  hasIosProject,
  isIosStubOnly,
  readCapWebDir,
} from "./cap-platforms.mjs";

const args = new Set(process.argv.slice(2));
const wantIos = args.has("--ios");
const wantAndroid = args.has("--android");
const checkOnly = args.has("--check-only");
const skipReady = args.has("--skip-ready");

function fail(message) {
  console.error(`cap-sync: ${message}`);
  process.exit(1);
}

function run(command, cmdArgs, { shell = false } = {}) {
  console.log(`\n» ${command} ${cmdArgs.join(" ")}`);
  const result = spawnSync(command, cmdArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (readCapWebDir() !== "out") {
  fail('capacitor.config webDir must be "out"');
}

if (!skipReady) {
  // shell:false — Windows paths with spaces break when shell-quoted poorly.
  run(process.execPath, ["scripts/pipeline/cap-ready.mjs"], { shell: false });
}

if (checkOnly) {
  console.log("cap-sync: check-only ok");
  process.exit(0);
}

const iosOk = hasIosProject();
const androidOk = hasAndroidProject();
const synced = [];

if (wantIos && !iosOk) {
  if (isIosStubOnly()) {
    fail(
      "ios/ is a stub (.gitkeep only). On a Mac: npx cap add ios && npm run ios:sync — see CAPACITOR_SHIP.md",
    );
  }
  fail("No iOS Capacitor project found under ios/");
}

if (wantAndroid && !androidOk) {
  fail(
    "No Android Capacitor project found. Optional: npx cap add android (then npm run android:sync)",
  );
}

const syncIos = wantIos || (!wantIos && !wantAndroid && iosOk);
const syncAndroid = wantAndroid || (!wantIos && !wantAndroid && androidOk);

if (syncAndroid) {
  run("npx", ["cap", "sync", "android"], { shell: true });
  synced.push("android");
}

if (syncIos) {
  run("npx", ["cap", "sync", "ios"], { shell: true });
  synced.push("ios");
}

if (synced.length === 0) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        synced: [],
        note: isIosStubOnly()
          ? "out/ is Cap-ready; ios/ is stub-only (Mac: cap add ios). No android/ platform."
          : "out/ is Cap-ready; no native platforms to sync.",
        docs: "CAPACITOR_SHIP.md",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(
  JSON.stringify({ ok: true, synced, webDir: "out" }, null, 2),
);
