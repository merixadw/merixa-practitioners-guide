/**
 * next.dev helper — list catalog ids for generateStaticParams so
 * dynamicParams can stay a literal `false` (required by Next 16) while
 * deep links still resolve locally. Production export uses `_shell` only.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadDevGuideStaticParams(): { id: string }[] {
  const catalogPath = join(process.cwd(), "public", "corpus", "catalog.json");
  if (!existsSync(catalogPath)) {
    return [{ id: "_shell" }];
  }
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
      cards?: Array<{ id?: string }>;
    };
    const params: { id: string }[] = [{ id: "_shell" }];
    const seen = new Set<string>(["_shell"]);
    for (const card of catalog.cards ?? []) {
      if (!card?.id || seen.has(card.id)) continue;
      seen.add(card.id);
      params.push({ id: card.id });
    }
    return params;
  } catch {
    return [{ id: "_shell" }];
  }
}
