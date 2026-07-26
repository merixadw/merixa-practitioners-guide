/**
 * Re-export shared weekly target + verification for the local pipeline.
 */
export {
  WEEKLY_DEFAULTS,
  isoWeekId,
  isoWeekBounds,
  planWeeklyTarget,
  verifyWeeklyTarget,
  ensureWeeklyTarget,
  focusAgendaOnWeeklyTarget,
} from "../../workers/lib/weekly-target.mjs";
