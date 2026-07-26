import { GuideDetailClient } from "@/components/GuideDetailClient";
import { loadDevGuideStaticParams } from "@/lib/guide/dev-guide-params";

/**
 * Static export cannot SSG 14k guide pages (OOM / incomplete out/).
 * Production emits one shell (`_shell`); stamp-guide-shell copies it to every id.
 * The client reads `useParams()` and loads `/corpus/details/*.json`.
 *
 * `dynamicParams` must be a static boolean (Next 16). Keep it false; in next
 * dev, generateStaticParams lists catalog ids from disk so deep links resolve.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  if (process.env.NODE_ENV === "production") {
    return [{ id: "_shell" }];
  }
  return loadDevGuideStaticParams();
}

export default function ConceptPage() {
  return <GuideDetailClient />;
}
