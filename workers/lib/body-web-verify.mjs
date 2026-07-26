/**
 * Verify tutor claims against official professional-body web sources.
 *
 * Evidence order:
 * 1. Guide card text + source quotes (always available)
 * 2. Cached body-page text in R2 (body-web/{hash}.json) when bound
 * 3. Live fetch of professional-body public pages
 *
 * Used by workers/ask.js (teach + verify) and workers/learn.js POST /verify.
 */
import {
  PROFESSIONAL_BODIES,
  bodiesForTopic,
  listProfessionalBodies,
} from "../../scripts/lib/professional-bodies.mjs";

const FETCH_TIMEOUT_MS = 12_000;
const MIN_TEXT_CHARS = 280;
const MAX_TEXT_CHARS = 24_000;
const VERIFY_OVERLAP = 0.28;
const STRONG_OVERLAP = 0.45;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

export function claimOverlap(claim, sourceText) {
  const claimTokens = tokens(claim);
  if (claimTokens.length === 0) return 0;
  const hay = new Set(tokens(sourceText));
  const hits = claimTokens.filter((token) => hay.has(token)).length;
  return hits / claimTokens.length;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function cacheKey(url) {
  let hash = 0;
  const value = String(url);
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `body-web/${hash.toString(16)}.json`;
}

function inventsStandardIds(claim, evidenceText) {
  const ids = claim.match(/\b(?:IFRS|IAS|IFRIC|SIC|FRS|ISA)\s?\d+[A-Z]?\b/gi) ?? [];
  if (ids.length === 0) return false;
  const hay = evidenceText.toUpperCase().replace(/\s+/g, " ");
  return ids.some((id) => {
    const normalized = id.toUpperCase().replace(/\s+/g, " ");
    const compact = normalized.replace(/\s+/g, "");
    return !hay.includes(normalized) && !hay.replace(/\s+/g, "").includes(compact);
  });
}

export function selectBodiesForCards(cards = []) {
  const selected = new Map();
  for (const card of cards) {
    for (const id of card.bodies ?? []) {
      if (PROFESSIONAL_BODIES[id]) selected.set(id, PROFESSIONAL_BODIES[id]);
    }
    const domain = card.classification?.domain;
    const topic = card.classification?.topic;
    if (domain) {
      for (const body of bodiesForTopic(domain, topic)) {
        selected.set(body.id, body);
      }
    }
  }
  if (selected.size === 0) {
    for (const id of ["IFRS", "FRC", "IIA"]) {
      if (PROFESSIONAL_BODIES[id]) selected.set(id, PROFESSIONAL_BODIES[id]);
    }
  }
  return [...selected.values()];
}

export function cardEvidence(cards = []) {
  const items = [];
  for (const card of cards.slice(0, 6)) {
    const text = [
      card.title,
      card.teachingSummary,
      card.body,
      card.workedExample,
      card.commonMistake,
      ...(card.sourceQuotes ?? []).map((quote) => quote.text),
    ]
      .filter(Boolean)
      .join("\n");
    if (text.trim().length < 40) continue;
    items.push({
      body: (card.bodies ?? [])[0] || "Guide",
      label: card.title,
      url: card.sources?.[0]?.path || `guide://${card.id}`,
      kind: "guide-card",
      text: text.slice(0, MAX_TEXT_CHARS),
    });
    for (const ref of card.officialReferences ?? []) {
      items.push({
        body: ref.body,
        label: ref.label,
        url: ref.url,
        kind: "official-reference",
        text: `${ref.label}\n${ref.url}\n${text.slice(0, 1200)}`,
      });
    }
  }
  return items;
}

async function readCache(bucket, url) {
  if (!bucket) return null;
  try {
    const object = await bucket.get(cacheKey(url));
    if (!object) return null;
    const parsed = await object.json();
    if (typeof parsed?.text === "string" && parsed.text.length >= MIN_TEXT_CHARS) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

async function writeCache(bucket, url, payload) {
  if (!bucket) return;
  try {
    await bucket.put(cacheKey(url), JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json" },
    });
  } catch {
    // Cache is best-effort.
  }
}

export async function fetchBodyPage(url, { bucket } = {}) {
  const cached = await readCache(bucket, url);
  if (cached) {
    return {
      ok: true,
      url,
      text: cached.text,
      label: cached.label || url,
      body: cached.body || null,
      fromCache: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MerixaGuideBot/1.0 (+body-web-verify; educational)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      return { ok: false, url, reason: `http-${response.status}` };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!/html|text|xml/i.test(contentType)) {
      return { ok: false, url, reason: "non-html" };
    }
    const text = htmlToText(await response.text());
    if (text.length < MIN_TEXT_CHARS) {
      return { ok: false, url, reason: "insufficient-text" };
    }
    const payload = {
      url: response.url || url,
      text,
      fetchedAt: new Date().toISOString(),
    };
    await writeCache(bucket, url, payload);
    return { ok: true, url: payload.url, text, fromCache: false };
  } catch (error) {
    return {
      ok: false,
      url,
      reason: error?.name === "AbortError" ? "timeout" : "fetch-failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gather official body web evidence for the bodies on these cards.
 */
export async function gatherBodyWebEvidence({
  cards = [],
  bucket = null,
  maxPages = 6,
} = {}) {
  const evidence = [...cardEvidence(cards)];
  const bodies = selectBodiesForCards(cards);
  const pages = [];
  for (const body of bodies) {
    for (const page of body.pages.slice(0, 2)) {
      pages.push({ bodyId: body.id, label: page.title, url: page.url });
    }
    // Prefer official refs already on cards.
    for (const card of cards) {
      for (const ref of card.officialReferences ?? []) {
        if (ref.body === body.id) {
          pages.push({ bodyId: body.id, label: ref.label, url: ref.url });
        }
      }
    }
  }

  const seen = new Set(evidence.map((item) => item.url));
  let fetched = 0;
  for (const page of pages) {
    if (seen.has(page.url) || fetched >= maxPages) continue;
    seen.add(page.url);
    const result = await fetchBodyPage(page.url, { bucket });
    if (!result.ok) continue;
    evidence.push({
      body: page.bodyId,
      label: page.label,
      url: result.url,
      kind: "body-web",
      text: result.text,
      fromCache: result.fromCache,
    });
    fetched += 1;
  }

  return {
    bodies: bodies.map((body) => body.id),
    evidence,
    fetched,
  };
}

export function verifyClaim(claim, evidenceItems = []) {
  const text = String(claim || "").trim();
  if (!text) {
    return {
      verified: false,
      confidence: 0,
      reason: "empty-claim",
      citations: [],
    };
  }

  const scored = evidenceItems
    .map((item) => {
      const overlap = claimOverlap(text, item.text);
      return {
        body: item.body,
        label: item.label,
        url: item.url,
        kind: item.kind,
        overlap: Number(overlap.toFixed(3)),
        excerpt: String(item.text || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 220),
      };
    })
    .filter((item) => item.overlap >= 0.12)
    .sort((left, right) => right.overlap - left.overlap);

  const best = scored[0];
  const combinedText = evidenceItems.map((item) => item.text).join("\n");
  const invented = inventsStandardIds(text, combinedText);
  const confidence = best?.overlap ?? 0;
  const verified =
    !invented && Boolean(best) && confidence >= VERIFY_OVERLAP;

  return {
    verified,
    confidence: Number(confidence.toFixed(3)),
    strength:
      confidence >= STRONG_OVERLAP
        ? "strong"
        : confidence >= VERIFY_OVERLAP
          ? "supported"
          : "weak",
    reason: invented
      ? "invented-standard-id"
      : verified
        ? "supported-by-body-web-or-card"
        : "insufficient-overlap",
    citations: scored.slice(0, 3),
  };
}

export async function verifyTutorSteps({
  steps = [],
  cards = [],
  bucket = null,
} = {}) {
  const gathered = await gatherBodyWebEvidence({ cards, bucket });
  const checked = steps.map((step, index) => {
    const claim = String(step?.body || step?.text || "").trim();
    const result = verifyClaim(claim, gathered.evidence);
    return {
      index,
      title: step?.title ? String(step.title) : undefined,
      cardId: step?.cardId ? String(step.cardId) : undefined,
      ...result,
    };
  });

  const verifiedCount = checked.filter((item) => item.verified).length;
  return {
    verifiedAt: new Date().toISOString(),
    bodies: gathered.bodies,
    pagesFetched: gathered.fetched,
    evidenceCount: gathered.evidence.length,
    steps: checked,
    verified: checked.length > 0 && verifiedCount === checked.length,
    score:
      checked.length === 0
        ? 0
        : Number((verifiedCount / checked.length).toFixed(3)),
    promptExcerpts: gathered.evidence
      .filter((item) => item.kind === "body-web")
      .slice(0, 4)
      .map((item) => ({
        body: item.body,
        label: item.label,
        url: item.url,
        excerpt: item.text.replace(/\s+/g, " ").trim().slice(0, 700),
      })),
  };
}

export function formatEvidenceForPrompt(verification) {
  const excerpts = verification?.promptExcerpts ?? [];
  if (excerpts.length === 0) return "";
  return excerpts
    .map(
      (item, index) =>
        `[Official ${index + 1}] ${item.body} — ${item.label}\nURL: ${item.url}\n${item.excerpt}`,
    )
    .join("\n\n");
}

export { listProfessionalBodies, PROFESSIONAL_BODIES };
