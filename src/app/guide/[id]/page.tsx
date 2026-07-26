import { GuideDetailClient } from "@/components/GuideDetailClient";

/**
 * Static export cannot SSG 14k guide pages (OOM / incomplete out/).
 * Emit one shell (`_shell`); `scripts/pipeline/stamp-guide-shell.mjs` copies
 * that HTML to every catalog id. The client reads `useParams()` from the URL
 * and loads the card from `/corpus/details/*.json`.
 *
 * Must be a literal `false` — static export rejects `dynamicParams: true`,
 * and a NODE_ENV ternary is not reliably inlined by the production bundler.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "_shell" }];
}

export default function ConceptPage() {
  return <GuideDetailClient />;
}
