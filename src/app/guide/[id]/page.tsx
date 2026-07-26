import { notFound, redirect } from "next/navigation";
import { ConceptDetail } from "@/components/ConceptDetail";
import {
  getCanonicalCard,
  getGeneratedIdAliases,
} from "@/lib/guide/canonical";
import { loadGuideIndex } from "@/lib/guide/corpus";
import {
  readCardDetailFromDisk,
  readCatalogFromDisk,
} from "@/lib/guide/seamless-disk";

export const dynamicParams = false;

export function generateStaticParams() {
  const catalog = readCatalogFromDisk();
  const seen = new Set<string>();
  const params: { id: string }[] = [];
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    params.push({ id });
  };

  if (catalog) {
    for (const card of catalog.cards) push(card.id);
  } else {
    const index = loadGuideIndex();
    for (const card of index.cards) {
      push(card.id);
      for (const fromId of card.mergedFrom ?? []) push(fromId);
    }
  }

  const liveTargets = new Set(params.map((entry) => entry.id));
  for (const [fromId, toId] of Object.entries(getGeneratedIdAliases())) {
    if (liveTargets.has(toId)) push(fromId);
  }
  return params;
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fromDisk = readCardDetailFromDisk(id);
  if (fromDisk) {
    if (fromDisk.id !== id) redirect(`/guide/${fromDisk.id}/`);
    return <ConceptDetail card={fromDisk} />;
  }

  const index = loadGuideIndex();
  const card = getCanonicalCard(index, id);
  if (!card) notFound();
  if (card.id !== id) {
    redirect(`/guide/${card.id}/`);
  }
  return <ConceptDetail card={card} />;
}
