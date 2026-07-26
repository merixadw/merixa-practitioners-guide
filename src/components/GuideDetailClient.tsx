"use client";

/**
 * Client shell for /guide/[id] — card body comes from public/corpus shards.
 * Static export stamps one shell HTML per id; useParams() reads the live URL.
 */
import Link from "next/link";
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId || rawId === "_shell") {
      setMissing(true);
      setLoadError(null);
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
    setLoadError(null);

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
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load concept",
        );
        setMissing(true);
      }
    })();

    return () => controller.abort();
  }, [rawId, router]);

  if (missing) {
    return (
      <main className="screen-stack guide-detail-shell">
        <div className="empty-state">
          <h2>Concept not found</h2>
          <p>
            {loadError
              ? `Could not open this concept (${loadError}).`
              : "This concept is not in the on-device library."}{" "}
            Browse the Library or pick a Path instead.
          </p>
          <div className="chat-home-links">
            <Link href="/library/" className="chat-home-link">
              Library
            </Link>
            <Link href="/paths/" className="chat-home-link">
              Paths
            </Link>
            <Link href="/" className="chat-home-link quiet">
              Tutor
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="screen-stack guide-detail-shell" aria-busy="true">
        <div className="empty-state">
          <h2>Loading concept</h2>
          <p className="muted">Opening from the on-device library…</p>
        </div>
      </main>
    );
  }

  return <ConceptDetail card={card} />;
}
