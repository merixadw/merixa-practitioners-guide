"use client";

/**
 * Client shell for /guide/[id] — card body comes from public/corpus shards.
 * Static export stamps one shell HTML per id; useParams() reads the live URL.
 */
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptDetail } from "@/components/ConceptDetail";
import { getGeneratedIdAliases } from "@/lib/guide/canonical";
import { fetchGuideCardDetail } from "@/lib/guide/detail-fetch";
import type { GuideCard } from "@/lib/guide/types";

export function GuideDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = typeof params?.id === "string" ? params.id : "";
  const [card, setCard] = useState<GuideCard | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!rawId || rawId === "_shell") {
      setMissing(true);
      return;
    }

    const aliases = getGeneratedIdAliases();
    const targetId = aliases[rawId] ?? rawId;
    if (targetId !== rawId) {
      router.replace(`/guide/${targetId}/`);
      return;
    }

    const controller = new AbortController();
    setCard(null);
    setMissing(false);

    void (async () => {
      try {
        const detail = await fetchGuideCardDetail(targetId, controller.signal);
        if (controller.signal.aborted) return;
        if (!detail) {
          setMissing(true);
          return;
        }
        if (detail.id !== targetId) {
          router.replace(`/guide/${detail.id}/`);
          return;
        }
        setCard(detail);
      } catch {
        if (!controller.signal.aborted) setMissing(true);
      }
    })();

    return () => controller.abort();
  }, [rawId, router]);

  if (missing) {
    return (
      <main className="guide-detail-shell">
        <p className="muted">This concept was not found in the on-device library.</p>
        <a href="/library/">Back to Library</a>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="guide-detail-shell" aria-busy="true">
        <p className="muted">Loading concept…</p>
      </main>
    );
  }

  return <ConceptDetail card={card} />;
}
