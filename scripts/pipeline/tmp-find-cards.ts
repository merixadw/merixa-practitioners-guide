import { loadGuideIndex } from "../../src/lib/guide/corpus";
import { isVisibleInLibraryBrowse } from "../../src/lib/guide/publishable";

const index = loadGuideIndex();
const visible = index.cards.filter((c) => isVisibleInLibraryBrowse(c));

const searches: Record<string, RegExp> = {
  "etr reconciliation": /effective tax rate|etr/i,
  "transfer pricing": /transfer pricing/i,
  "intercompany recharge": /intercompany|recharge/i,
  "audit committee": /audit committee/i,
  "materiality sustainability": /materiality/i,
  emissions: /emission/i,
  "disclosure controls": /disclosure control|controls over.*disclos|disclos.*control/i,
  "sustainability bridge/reporting": /sustainab/i,
  "adjusting events": /adjusting event/i,
  "termination benefits": /termination/i,
  "equity method": /equity method/i,
  "impairment reversal": /reversal/i,
  "lease discount rate": /incremental borrowing|discount rate/i,
  "uncertain tax": /uncertain tax/i,
};

for (const [label, re] of Object.entries(searches)) {
  const hits = visible
    .filter((c) => re.test(c.title))
    .slice(0, 8)
    .map((c) => `${c.id}  «${c.title}»${c.enrichedAt ? " [enriched]" : ""}`);
  console.log(`\n== ${label}`);
  for (const h of hits) console.log("   " + h);
}
