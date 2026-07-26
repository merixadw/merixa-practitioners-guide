/** Shared helpers for wave-4 final floor close. */
export function t(title, topic, definition, example, trap, formula) {
  return formula
    ? [title, topic, definition, example, trap, formula]
    : [title, topic, definition, example, trap];
}

export function expand(specs) {
  return specs.map(([title, topic, mech, example, trap, formula]) =>
    t(title, topic, `${title} ${mech}`, example, trap, formula),
  );
}

export function dedupe(drafts) {
  const seen = new Set();
  const out = [];
  for (const d of drafts) {
    const key = String(d[0] || "")
      .toLowerCase()
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}
