/**
 * Tight practitioner teaching copy.
 * Body chips / tags already name the professional bodies — prose must not.
 * Every sentence should add a definition, rule, action, or trap.
 */
import { workplaceGuidance } from "./practitioner-taxonomy.mjs";

const LEAD_NOISE =
  /^(?:practitioner\s+(?:requirement|guidance|procedure|control|analysis|disclosure)|accounting\s+translation|illustrative\s+workplace\s+example|at\s+work|common\s+mistake|framework\s+references)\s*[:.—–-]\s*/i;

const FILLER_OPENERS =
  /^(?:however|therefore|in addition|furthermore|moreover|note that|it should be noted that|please note that)\s*,?\s*/i;

const HEADING_ONLY =
  /^(?:principles?|presentation|introduction|overview|scope|definition|background|objective|requirements?|procedure|process|group reporting|notes?)(?:\s+of|\s+for|\s+to)?\s+[a-z].{0,80}$/i;

function normalizeSpace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripLeadNoise(value) {
  let text = normalizeSpace(value);
  for (let i = 0; i < 3; i += 1) {
    const next = text
      .replace(LEAD_NOISE, "")
      .replace(FILLER_OPENERS, "")
      .trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

function cutAtWord(value, maxChars) {
  const text = normalizeSpace(value);
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const boundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("; "),
    slice.lastIndexOf(", "),
    slice.lastIndexOf(" "),
  );
  return (boundary > Math.floor(maxChars * 0.55)
    ? slice.slice(0, boundary)
    : slice
  )
    .replace(/[,:;–—-]+$/, "")
    .trim();
}

function sentences(value) {
  return stripLeadNoise(value)
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((part) => stripLeadNoise(part).replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 40)
    .filter((part) => !HEADING_ONLY.test(part))
    .filter((part) => !/^[a-z]/.test(part))
    .filter((part) => !/^(?:IFRS|IAS|FRS|IFRIC|SIC)\s*\d+[A-Z]?\s*,/i.test(part))
    .filter((part) => !/^\d+[A-Z]?\s/.test(part)) ?? [];
}

function scoreDefinition(text) {
  let points = 0;
  if (/\b(is|means|refers to|defined as|shall|must|requires?|recognised?|recognized?|measured|classified|includes?)\b/i.test(text)) {
    points += 4;
  }
  if (/\b(asset|liability|expense|income|control|evidence|policy|report|statement)\b/i.test(text)) {
    points += 1;
  }
  if (text.length >= 100 && text.length <= 480) points += 2;
  if (text.length > 560) points -= 1;
  if (/^(?:And|Or|The following|This section)\b/.test(text)) points -= 2;
  if (/\([A-Z]{2,}\s*$/.test(text)) points -= 2;
  return points;
}

function pickDefinition(body, maxChars = 520) {
  const parts = sentences(body);
  if (parts.length === 0) {
    return cutAtWord(stripLeadNoise(body), maxChars);
  }

  const ranked = [...parts].sort(
    (left, right) => scoreDefinition(right) - scoreDefinition(left),
  );
  let out = ranked[0];
  if (
    ranked[1] &&
    out.length < 120 &&
    scoreDefinition(ranked[1]) >= 3 &&
    !out.includes(ranked[1].slice(0, 40))
  ) {
    out = `${out.replace(/[.!?]$/, ".")} ${ranked[1]}`;
  }
  return cutAtWord(out, maxChars);
}

function extractStandards(text) {
  return [
    ...new Set(
      (String(text || "").match(/\b(?:IFRS|IAS|IFRIC|SIC|FRS)\s+\d+[A-Z]?\b/gi) ??
        []
      ).map((item) => item.replace(/\s+/g, " ").trim()),
    ),
  ].slice(0, 4);
}

function standardsCue(standards, alreadyInText) {
  const hay = String(alreadyInText || "").toUpperCase().replace(/\s+/g, " ");
  const missing = (standards ?? [])
    .map((item) => String(item).replace(/\s+/g, " ").trim())
    .filter((item) => /\b(?:IFRS|IAS|IFRIC|SIC|FRS)\s+\d+/i.test(item))
    .filter((item) => !hay.includes(item.toUpperCase()))
    .slice(0, 2);
  if (missing.length === 0) return "";
  return ` (${missing.join(", ")})`;
}

function titleNoun(title) {
  const clean = stripLeadNoise(String(title || ""))
    .replace(/:.*/, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  return cutAtWord(clean, 56);
}

function topicFitsCard(topic, title, body) {
  if (!topic) return false;
  const hay = `${title}\n${body}`
    .toLowerCase()
    .replace(/\([^)]*exclud[^)]*\)/g, " ")
    .replace(/\bexcluding\b[\s\S]{0,80}/g, " ");
  const topicLower = String(topic).toLowerCase();
  if (hay.includes(topicLower)) return true;
  const tokens = topicLower
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
  if (tokens.length === 0) return false;
  // Single-token topics (e.g. Revenue) need a clean hit outside exclusion clauses.
  if (tokens.length === 1) {
    return new RegExp(`\\b${tokens[0]}\\b`, "i").test(hay);
  }
  const hits = tokens.filter((token) => hay.includes(token)).length;
  return hits >= Math.ceil(tokens.length / 2);
}

/**
 * Definition-first summary. No body-name name-dropping; standards only if absent.
 */
export function craftTeachingSummary({ body, standards }) {
  const definition = pickDefinition(body, 520);
  const cue = standardsCue(
    [...(standards ?? []), ...extractStandards(body)],
    definition,
  );
  return `${definition}${cue}`.slice(0, 720);
}

/**
 * One concrete workplace move grounded in the concept, not a lecture.
 */
export function craftWorkedExample({ title, body, classification }) {
  const noun = titleNoun(title) || classification?.topic || "this concept";
  const fromBody = sentences(body).find((part) =>
    /\b(review|reconcile|prepare|document|assess|calculate|identify|trace|test|record|approve|classify|measure|recognis|recogniz)\b/i.test(
      part,
    ),
  );

  if (fromBody) {
    return cutAtWord(
      `In the next pack, apply “${noun}”: ${fromBody} Record the evidence trail, the decision owner, and the conclusion on the working paper.`,
      720,
    );
  }

  const topic = classification?.topic || "";
  const useTopic = topicFitsCard(topic, title, body);
  const workplace = useTopic
    ? workplaceGuidance(classification)
    : {
        example:
          "Trace the rule to source evidence, name the decision owner, and write the conclusion on the working paper with the judgement that would change the answer.",
      };

  let example = stripLeadNoise(workplace.example);
  if (!example.toLowerCase().includes(noun.toLowerCase().slice(0, 16))) {
    example = `For “${noun}”: ${example}`;
  }
  return cutAtWord(example, 720);
}

/**
 * Trap only — section label already says “Trap”.
 */
export function craftCommonMistake({ title, body, classification }) {
  const noun = titleNoun(title) || classification?.topic || "the concept";
  const trap = sentences(body).find((part) => {
    if (
      !/\b(without|do not|must not|should not|incorrect|omit|fail to|instead of)\b/i.test(
        part,
      )
    ) {
      return false;
    }
    if (
      /\bgoing concern\b/i.test(part) &&
      !/\bgoing concern\b/i.test(String(title || ""))
    ) {
      return false;
    }
    return true;
  });
  if (trap) {
    return cutAtWord(
      `On “${noun}”: ${trap} Leave the working paper with the counter-evidence that would reverse the conclusion.`,
      480,
    );
  }

  const topic = classification?.topic || "";
  const useTopic = topicFitsCard(topic, title, body);
  const workplace = useTopic
    ? workplaceGuidance(classification)
    : {
        mistake:
          "Restating the rule without evidence, judgement, ownership, or a decision that can be challenged.",
      };

  let mistake = stripLeadNoise(workplace.mistake)
    .replace(/^a common mistake is to\s+/i, "")
    .replace(/^treating\s+/i, "Treating ");
  if (!mistake.toLowerCase().includes(noun.toLowerCase().slice(0, 16))) {
    mistake = `${mistake.replace(/[.!?]$/, "")} on “${noun}”.`;
  }
  return cutAtWord(mistake, 480);
}

export function craftCheckQuestion({ title, classification }) {
  const noun = titleNoun(title) || classification?.topic || "this concept";
  return `What evidence would change your conclusion on “${noun}”, and who owns the decision if that evidence arrives?`.slice(
    0,
    200,
  );
}

export function craftWorkplaceTask({ title, classification }) {
  const noun = titleNoun(title) || classification?.topic || "concept";
  const topic = classification?.topic || "";
  const useTopic = topicFitsCard(topic, title, "");
  const workplace = useTopic
    ? workplaceGuidance(classification)
    : {
        task: "Apply the concept on one live working paper and document the conclusion",
      };
  const label = stripLeadNoise(workplace.task);
  if (label.toLowerCase().includes(noun.toLowerCase().slice(0, 14))) {
    return { id: "practitioner-application", label: cutAtWord(label, 110) };
  }
  return {
    id: "practitioner-application",
    label: cutAtWord(`${label.replace(/[.!?]$/, "")} for “${noun}”`, 110),
  };
}

/**
 * Rebuild teaching fields on an existing card without inventing facts.
 */
export function clarifyCardTeaching(card) {
  const body = stripLeadNoise(card.body || card.teachingSummary || "");
  const mergedStandards = extractStandards(
    `${body} ${card.teachingSummary || ""} ${(card.standards ?? []).join(" ")}`,
  );

  const classification = card.classification ?? {
    domain: "Strategy and performance",
    topic: "guidance",
  };

  const teachingSummary = craftTeachingSummary({
    body,
    standards: mergedStandards,
  });
  const workedExample = craftWorkedExample({
    title: card.title,
    body,
    classification,
  });
  const commonMistake = craftCommonMistake({
    title: card.title,
    body,
    classification,
  });
  const checkQuestion = craftCheckQuestion({
    title: card.title,
    classification,
  });
  const task = craftWorkplaceTask({
    title: card.title,
    classification,
  });

  const qualityBump =
    teachingSummary.length >= 50 &&
    workedExample.length >= 36 &&
    commonMistake.length >= 24
      ? 0.82
      : 0.75;

  return {
    ...card,
    body: cutAtWord(body, 1600),
    teachingSummary,
    workedExample,
    commonMistake,
    checkQuestion,
    workplaceTasks:
      Array.isArray(card.workplaceTasks) && card.workplaceTasks.length > 0
        ? card.workplaceTasks.map((item, index) =>
            index === 0 ? { ...item, label: task.label } : item,
          )
        : [task],
    editorialStatus:
      card.editorialStatus === "model-reviewed"
        ? "model-reviewed"
        : "machine-reviewed",
    qualityScore: Math.max(Number(card.qualityScore || 0), qualityBump),
    clarifiedAt: new Date().toISOString(),
  };
}
