import { readFileSync, writeFileSync } from "node:fs";

const curriculum = JSON.parse(
  readFileSync(
    "C:/Users/hmkay/Downloads/merixa-practitioners-guide/content/pipeline/curriculum-by-domain.json",
    "utf8",
  ),
);
const anatomy = JSON.parse(
  readFileSync(
    "C:/Users/hmkay/Downloads/merixa-practitioners-guide/content/pipeline/full-library-anatomy.json",
    "utf8",
  ),
);

const colors = [
  "blue",
  "purple",
  "orange",
  "green",
  "pink",
  "yellow",
  "gray",
  "cyan",
  "red",
  "olive",
];

const shelves = Object.entries(anatomy.byShelf).map(([name, cards]) => ({
  name,
  cards,
}));
const bodies = Object.entries(anatomy.byBody).map(([name, cards]) => ({
  name,
  cards,
}));
const paths = Object.entries(anatomy.pathSummary).map(([name, v]) => ({
  name,
  paths: v.paths,
  steps: v.steps,
}));

const content = `import {
  BarChart,
  Callout,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  UsageBar,
} from "cursor/canvas";

const totals = ${JSON.stringify(anatomy.totals)} as const;
const shelves = ${JSON.stringify(shelves)} as const;
const bodies = ${JSON.stringify(bodies)} as const;
const paths = ${JSON.stringify(paths)} as const;
const curriculum = ${JSON.stringify(curriculum)} as const;
const shelfColors = ${JSON.stringify(colors)} as const;

export default function FullLibraryCurriculum() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Full Library curriculum — every domain, every topic</H1>
        <Text tone="secondary" size="small">
          Complete anatomy of {totals.cards.toLocaleString()} cards ·{" "}
          {totals.topics} topic keys · {totals.domains} domains · live index
        </Text>
      </Stack>

      <Callout tone="info" title="How to read this">
        Domain = major practice area. Topic = folder inside that domain. Cards =
        individual teaching units. Expand each domain below to study every topic
        and card count. Shelves show origin (FA, FRM, IFRS, CRMA, COSO, MA, tax,
        spine, ingested).
      </Callout>

      <H2>Universe totals</H2>
      <Grid columns={4} gap={16}>
        <Stat value={String(totals.cards)} label="Library cards" />
        <Stat value={String(totals.topics)} label="Topic keys" />
        <Stat value={String(totals.domains)} label="Domains" />
        <Stat value={String(totals.chunks)} label="Retrieval chunks" />
      </Grid>
      <Grid columns={4} gap={16}>
        <Stat
          value={String(totals.withExample)}
          label="With worked example"
          tone="success"
        />
        <Stat
          value={String(totals.withSummary)}
          label="With teaching summary"
          tone="success"
        />
        <Stat value={String(totals.withFormula)} label="With formula" />
        <Stat value={String(totals.withOfficial)} label="With official refs" />
      </Grid>

      <H2>Cards by shelf (origin)</H2>
      <UsageBar
        total={totals.cards}
        topLeftLabel="Origin mix"
        topRightLabel={totals.cards + " cards"}
        segments={shelves.map((s, i) => ({
          id: s.name,
          value: s.cards,
          color: shelfColors[i % shelfColors.length],
        }))}
      />
      <Table
        headers={["Shelf", "Cards", "Share"]}
        rows={shelves.map((s) => [
          s.name,
          String(s.cards),
          Math.round((s.cards / totals.cards) * 100) + "%",
        ])}
        striped
      />

      <H2>Professional body tags</H2>
      <Text tone="secondary" size="small">
        A card can carry multiple bodies, so body tags sum above card count.
      </Text>
      <Table
        headers={["Body", "Card tags"]}
        rows={bodies.map((b) => [b.name, String(b.cards)])}
        striped
      />

      <H2>Learning paths</H2>
      <Table
        headers={["Path shelf", "Paths", "Steps"]}
        rows={paths.map((p) => [p.name, String(p.paths), String(p.steps)])}
      />

      <H2>Domain overview</H2>
      <BarChart
        categories={curriculum.map((d) => d.domain)}
        series={[
          {
            name: "Cards",
            data: curriculum.map((d) => d.cards),
            tone: "info",
          },
        ]}
        height={280}
        horizontal
      />
      <Table
        headers={["Domain", "Cards", "Topics", "Cards per topic"]}
        rows={curriculum.map((d) => [
          d.domain,
          String(d.cards),
          String(d.topicCount),
          String(Math.round(d.cards / Math.max(1, d.topicCount))),
        ])}
        striped
      />

      <Divider />
      <H2>Learn every topic by domain</H2>
      <Text tone="secondary" size="small">
        Expand a domain. Topics sorted by card count (largest first). All{" "}
        {totals.topics} topic keys are listed.
      </Text>

      {curriculum.map((d, idx) => (
        <CollapsibleSection
          key={d.domain}
          title={d.domain}
          count={d.topicCount}
          trailing={
            <Text size="small" tone="tertiary">
              {d.cards} cards
            </Text>
          }
          defaultOpen={idx < 2}
        >
          <Stack gap={12}>
            <Row gap={8} wrap>
              <Pill size="sm">{d.topicCount} topics</Pill>
              <Pill size="sm" tone="info">
                {d.cards} cards
              </Pill>
            </Row>
            <Table
              headers={["#", "Topic", "Cards", "Shelves (origin)"]}
              columnAlign={["right", "left", "right", "left"]}
              rows={d.topics.map((t, i) => [
                String(i + 1),
                t.topic,
                String(t.cards),
                t.shelves,
              ])}
              striped
              stickyHeader
            />
          </Stack>
        </CollapsibleSection>
      ))}

      <Callout tone="warning" title="Classification noise">
        Some topics are near-duplicates (Business combinations vs Business
        Combinations; Tax vs current tax). That is label drift from mixed
        encyclopedia + IFRS naming — not missing content. Sustainability and
        Project delivery remain thin and need expansion.
      </Callout>
    </Stack>
  );
}
`;

const out =
  "C:/Users/hmkay/.cursor/projects/c-Users-hmkay-Downloads-merixa-management-micro/canvases/full-library-curriculum.canvas.tsx";
writeFileSync(out, content);
console.log("wrote", out, "bytes", content.length);
