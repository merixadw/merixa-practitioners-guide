import { GuideDetailClient } from "@/components/GuideDetailClient";

/**
 * Static export cannot afford 14k SSG pages (OOM / incomplete out/).
 * Production builds emit one shell (`_shell`); `scripts/pipeline/stamp-guide-shell.mjs`
 * copies that HTML to every catalog id. The client reads `useParams()` from the URL
 * and loads the card from `/corpus/details/*.json`.
 *
 * In development, skip generateStaticParams so Turbopack never walks the corpus.
 */
export const dynamicParams = process.env.NODE_ENV !== "production";

export function generateStaticParams() {
  if (process.env.NODE_ENV !== "production") {
    return [];
  }
  return [{ id: "_shell" }];
}

export default function ConceptPage() {
  return <GuideDetailClient />;
}
