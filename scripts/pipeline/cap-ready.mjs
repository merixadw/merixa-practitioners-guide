#!/usr/bin/env node
/**
 * Verify Capacitor webDir (out/) is ship-ready and matches capacitor.config.
 * Usage: node scripts/pipeline/cap-ready.mjs
 */
import { spawnSync } from "node:child_process";
import {
  hasAndroidProject,
  hasIosProject,
  isIosStubOnly,
  readCapWebDir,
} from "./cap-platforms.mjs";

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

const webDir = readCapWebDir();
if (webDir !== "out") {
  fail(
    `capacitor webDir must be "out" (found ${JSON.stringify(webDir)}) — aligns with npm run build:web`,
  );
}

const smoke = spawnSync(
  process.execPath,
  ["scripts/pipeline/smoke-out-web.mjs"],
  { cwd: process.cwd(), stdio: "inherit", shell: false },
);
if (smoke.status !== 0) {
  process.exit(smoke.status ?? 1);
}

const platforms = {
  iosStubOnly: isIosStubOnly(),
  iosProject: hasIosProject(),
  androidProject: hasAndroidProject(),
};

console.log(
  JSON.stringify(
    {
      ok: true,
      webDir: "out",
      smoke: "smoke-out-web ok",
      platforms,
      next:
        platforms.androidProject || platforms.iosProject
          ? "npm run cap:sync"
          : "Windows prep done — add ios on a Mac (see CAPACITOR_SHIP.md)",
    },
    null,
    2,
  ),
);
