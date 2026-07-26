"use client";

import { TrialNudgeSheet } from "./TrialNudgeSheet";
import { WeeklyPathDigest } from "./WeeklyPathDigest";

/** Retention overlays — trial soft sheet and weekly path digest. */
export function RetentionSheets() {
  return (
    <>
      <TrialNudgeSheet />
      <WeeklyPathDigest />
    </>
  );
}
