import type { LearningPath } from "./types";
import generatedCrossBodyPathIds from "./cross-body-path-ids.generated.json";
import {
  isFaDomainPath,
  isFrmDomainPath,
  isIfrsStandardPath,
  LEARNING_PATHS,
} from "./paths";

/**
 * Flagship “Start here” journeys — cross-body practitioner routes.
 * IFRS standard paths stay in the Standards library; FRM/FA domain packs
 * stay grouped under their body libraries.
 */
export const FLAGSHIP_PATH_IDS = [
  "profit-to-cash",
  "liquidity-breadth",
  "tb-to-variance",
  "controls-lite",
  "liquidity-risk-path",
  "risk-appetite-kri",
  "encyclopedia-management-accounting",
  "encyclopedia-financial-analysis",
  "encyclopedia-frm-spine",
  "priority-path-tax-reporting-close",
  "priority-path-sustainability-reporting",
  "priority-path-governance-controls-spine",
  "priority-path-risk-management-spine",
  "encyclopedia-audit",
  "encyclopedia-cfa-finance",
  "group-fx",
  "mi-decisions",
  ...(Array.isArray(generatedCrossBodyPathIds)
    ? generatedCrossBodyPathIds
    : []),
] as const;

export type PathShelf =
  | "yours"
  | "flagship"
  | "standards"
  | "frm"
  | "financial-analysis"
  | "practice"
  | "more";

export function pathShelf(path: LearningPath): PathShelf {
  if (path.id.startsWith("custom-")) return "yours";
  if (path.id.startsWith("domain-shelf-")) return "practice";
  if ((FLAGSHIP_PATH_IDS as readonly string[]).includes(path.id)) {
    return "flagship";
  }
  if (isIfrsStandardPath(path)) return "standards";
  if (isFrmDomainPath(path)) return "frm";
  if (isFaDomainPath(path)) return "financial-analysis";
  return "more";
}

export function shelvePaths(paths: LearningPath[] = LEARNING_PATHS): Record<
  PathShelf,
  LearningPath[]
> {
  const shelves: Record<PathShelf, LearningPath[]> = {
    yours: [],
    flagship: [],
    standards: [],
    frm: [],
    "financial-analysis": [],
    practice: [],
    more: [],
  };
  for (const path of paths) {
    shelves[pathShelf(path)].push(path);
  }
  shelves.flagship.sort(
    (left, right) =>
      (FLAGSHIP_PATH_IDS as readonly string[]).indexOf(left.id) -
      (FLAGSHIP_PATH_IDS as readonly string[]).indexOf(right.id),
  );
  return shelves;
}

/** Next step after the current card inside a path (for Tutor + detail CTAs). */
export function nextStepInPath(
  path: LearningPath,
  cardId: string,
): LearningPath["steps"][number] | null {
  const index = path.steps.findIndex((step) => step.cardId === cardId);
  if (index < 0 || index >= path.steps.length - 1) return null;
  return path.steps[index + 1] ?? null;
}

export function pathsContainingCard(
  cardId: string,
  paths: LearningPath[] = LEARNING_PATHS,
): LearningPath[] {
  return paths.filter((path) =>
    path.steps.some((step) => step.cardId === cardId),
  );
}
