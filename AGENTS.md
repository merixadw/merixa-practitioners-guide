<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Library ship gates

Do **not** soft-launch or release on vanity / structural metrics. Banned from ship decisions:

- `competitivenessScore` / structural diagnostic (can hit 100 while `liveSharePct≈22`)
- Shelf floor % / agent wave published counts
- Any `ship-check-report.json` older than `content/index.json` mtime or past `maxReportAgeHours` (default 6h) — treat as `STALE_SHIP_REPORT`

Ship only on **fresh** liveShare + QA gates. Public `liveShareCatalog` uses the **seamless runtime** denominator (cards users load), not abandoned index orphans. Informational `liveShareIndex` / `truthBoard.liveSharePct` = enrichedAt / total index cards.

Ship criteria: `content/pipeline/ship-gates.json`. Enforce with `npm run library:ship-check` (soft) or `--gate=public`. Prefer always-recompute (default). `--report-only` prints without failing the process exit for CI climbing, but still recomputes and never treats a stale on-disk report as pass. Truth screen: `npm run library:truth-board`.
