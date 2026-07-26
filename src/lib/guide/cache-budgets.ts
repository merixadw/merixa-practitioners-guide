/**
 * Simple cut-end cache standard — ship target constants + helpers.
 *
 * 1. Library ≤ 50 MB compressed — grow by compressing, never skim cards
 * 2. Inventory ≤ 48 MB — 70% heavy coach / 30% light asks
 * 3. Total cut-end ≤ 100 MB hard rail
 */

/** Published Library index ceiling (compressed on device / wire). */
export const LIBRARY_MAX_BYTES = 50 * 1024 * 1024;

/** Soft warn — tighten representation / prefer stronger compression. */
export const LIBRARY_WARN_BYTES = Math.floor(LIBRARY_MAX_BYTES * 0.8);

/** Premium coach inventory Done-column ceiling (compressed payloads). */
export const INVENTORY_MAX_BYTES = 48 * 1024 * 1024;

/** Soft operate band before hard inventory ceiling. */
export const INVENTORY_WARN_BYTES = 32 * 1024 * 1024;

/** Heavy (+ pinned heavy) may use this share of inventory bytes. */
export const INVENTORY_HEAVY_BYTE_SHARE = 0.7;

/** Light / demo asks may only fill the remainder. */
export const INVENTORY_LIGHT_BYTE_SHARE = 1 - INVENTORY_HEAVY_BYTE_SHARE;

export const INVENTORY_MAX_ENTRIES = 1_500;
export const INVENTORY_MAX_HEAVY = 360;
export const INVENTORY_MAX_LIGHT = 600;

/** Workbook artefact reserve inside the hard rail. */
export const WORKBOOK_RESERVE_BYTES = 6 * 1024 * 1024;

/** Habits / entitlements / sighting / journey meta. */
export const META_RESERVE_BYTES = 2 * 1024 * 1024;

/**
 * Design total when Library and inventory both approach their ceilings.
 * Soft ops target; hard rail is CUT_END_HARD_CEILING_BYTES.
 */
export const CUT_END_DESIGN_MAX_BYTES =
  LIBRARY_MAX_BYTES + INVENTORY_MAX_BYTES;

/** Absolute abort — never design product behaviour above this. */
export const CUT_END_HARD_CEILING_BYTES = 100 * 1024 * 1024;

export const CACHE_STANDARD = {
  libraryMaxMb: 50,
  inventoryMaxMb: 48,
  heavyShare: INVENTORY_HEAVY_BYTE_SHARE,
  lightShare: INVENTORY_LIGHT_BYTE_SHARE,
  hardCeilingMb: 100,
  policy: "compress-to-retain; heavy-first; replay-free; silent-30d-sweep",
} as const;

export function inventoryHeavyByteBudget(
  maxBytes: number = INVENTORY_MAX_BYTES,
): number {
  return Math.floor(maxBytes * INVENTORY_HEAVY_BYTE_SHARE);
}

export function inventoryLightByteBudget(
  maxBytes: number = INVENTORY_MAX_BYTES,
): number {
  return Math.floor(maxBytes * INVENTORY_LIGHT_BYTE_SHARE);
}
