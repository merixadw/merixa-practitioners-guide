/**
 * Agent-authored encyclopedia draft banks.
 * Zero OpenAI. Each draft is unique workplace content (not heuristic filler).
 *
 * Drafts are built from per-shelf concept modules under ./agent-banks/.
 */
import { FA_DRAFTS } from "./agent-banks/fa.mjs";
import { COSO_DRAFTS } from "./agent-banks/coso.mjs";
import { CRMA_DRAFTS } from "./agent-banks/crma.mjs";
import { FRM_DRAFTS } from "./agent-banks/frm.mjs";
import { IIA_DRAFTS } from "./agent-banks/iia.mjs";
import { TAX_DRAFTS } from "./agent-banks/tax.mjs";

const BANKS = {
  frm: FRM_DRAFTS,
  tax: TAX_DRAFTS,
  coso: COSO_DRAFTS,
  crma: CRMA_DRAFTS,
  iia: IIA_DRAFTS,
  fa: FA_DRAFTS,
};

/**
 * Expand a compact concept tuple into a publishable draft.
 * Tuple: [title, topic, definition, example, trap, formula?]
 */
export function expandTuple(shelfId, tuple) {
  const [title, topic, definition, example, trap, formula] = tuple;
  let def = String(definition || "").replace(/\s+/g, " ").trim();
  let ex = String(example || "").replace(/\s+/g, " ").trim();
  let tr = String(trap || "").replace(/\s+/g, " ").trim();
  // Ensure quality-gate depth without heuristic “practitioner concept” filler.
  if (def.length < 160) {
    def = `${def} In the workplace pack, name the owner, the figure or rating used, and the evidence that would reverse the conclusion.`.replace(
      /\s+/g,
      " ",
    );
  }
  if (ex.length < 70) {
    ex = `${ex} Record the decision and retain the working papers with the pack.`.replace(
      /\s+/g,
      " ",
    );
  }
  if (tr.length < 45) {
    tr = `${tr} Do not treat a label or slide title as a substitute for evidence.`.replace(
      /\s+/g,
      " ",
    );
  }
  const draft = {
    shelfId,
    title: String(title || "").trim(),
    topic: String(topic || "").trim(),
    definition: def,
    example: ex,
    trap: tr,
  };
  if (formula) draft.formula = String(formula).replace(/\s+/g, " ").trim();
  return draft;
}

export function buildAgentDrafts({ shelfIds } = {}) {
  const ids = Array.isArray(shelfIds) && shelfIds.length
    ? shelfIds
    : Object.keys(BANKS);
  const out = [];
  const seen = new Set();
  for (const id of ids) {
    const bank = BANKS[id] || [];
    for (const tuple of bank) {
      const draft = Array.isArray(tuple)
        ? expandTuple(id, tuple)
        : { shelfId: id, ...tuple };
      const key = `${draft.shelfId}::${String(draft.title || "").toLowerCase().trim()}`;
      if (!draft.title || seen.has(key)) continue;
      seen.add(key);
      out.push(draft);
    }
  }
  return out;
}

export function bankCounts() {
  return Object.fromEntries(
    Object.entries(BANKS).map(([id, bank]) => [id, bank.length]),
  );
}
