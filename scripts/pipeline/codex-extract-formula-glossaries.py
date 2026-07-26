"""
Extract Merixa-authored formula glossaries into structured terms for the
codex local feed (scripts/pipeline/codex-local-feed.mjs).

Merixa-owned formula-only DOCX packs: term + formula + components.
No third-party textbooks. No LLM calls.

Writes content/pipeline/codex-feed/extracted-formulas.json
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[2]
CODEX_DIR = ROOT.parent / "Merixa x Codex"
OUT_DIR = ROOT / "content" / "pipeline" / "codex-feed"
OUT = OUT_DIR / "extracted-formulas.json"

# (pack id, filename, human label) — Merixa formula glossaries only.
PACKS = [
    (
        "formula-risk-management",
        "Merixa_Risk_Management_Formula_Glossary_750_Terms_v1_0.docx",
        "Merixa Risk Management Formula Glossary v1.0",
    ),
    (
        "formula-financial-analysis",
        "Merixa_Financial_Analysis_Formula_Glossary_606_Terms_v0_1.docx",
        "Merixa Financial Analysis Formula Glossary v0.1",
    ),
    (
        "formula-internal-controls",
        "Merixa_Internal_Controls_Formula_Glossary_500_Terms_v1_0.docx",
        "Merixa Internal Controls Formula Glossary v1.0",
    ),
    (
        "formula-audit",
        "Merixa_Audit_Formula_Glossary_450_Terms_v1_0.docx",
        "Merixa Audit Formula Glossary v1.0",
    ),
    (
        "formula-governance",
        "Merixa_Governance_Formula_Glossary_350_Terms_v1_0.docx",
        "Merixa Governance Formula Glossary v1.0",
    ),
    (
        "formula-financial-reporting",
        "Merixa_Financial_Reporting_Formula_Glossary_550_Terms_v1_0.docx",
        "Merixa Financial Reporting Formula Glossary v1.0",
    ),
    (
        "formula-ifrs-consolidation",
        "Merixa_IFRS_Consolidation_Group_Reporting_Formula_Glossary_450_Terms_v1_0.docx",
        "Merixa IFRS Consolidation & Group Reporting Formula Glossary v1.0",
    ),
    (
        "formula-management-reporting",
        "Merixa_Management_Reporting_Formula_Glossary_500_Terms_v1_0.docx",
        "Merixa Management Reporting Formula Glossary v1.0",
    ),
    (
        "formula-performance-management",
        "Merixa_Performance_Management_Formula_Glossary_400_Terms_v1_0.docx",
        "Merixa Performance Management Formula Glossary v1.0",
    ),
]

NOT_A_FORMULA = re.compile(r"^(n/?a|none|not applicable|qualitative)\b[.\s]*$", re.I)


def clean(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def parse_formula_tables(document: Document) -> list[dict]:
    terms: list[dict] = []
    seen: set[str] = set()
    for table in document.tables:
        if not table.rows or len(table.columns) < 3:
            continue
        header = [clean(c.text).lower() for c in table.rows[0].cells]
        # Expect: No. | Term | Formula / calculation | Components / breakdown
        if len(header) < 3 or "term" not in header[1]:
            continue
        for row in table.rows[1:]:
            cells = [clean(c.text) for c in row.cells]
            if len(cells) < 3:
                continue
            title = cells[1]
            formula = cells[2]
            components = cells[3] if len(cells) > 3 else ""
            if not title or len(title) < 3:
                continue
            if not formula or NOT_A_FORMULA.match(formula):
                continue
            key = title.casefold()
            if key in seen:
                continue
            seen.add(key)
            terms.append(
                {
                    "title": title,
                    "formula": formula,
                    "components": components,
                    # Grounded definition from Merixa formula row (no invented encyclopedia prose).
                    "definition": (
                        f"{title} is computed as {formula}."
                        + (f" Inputs: {components}." if components else "")
                    ),
                    "example": (
                        f"Scenario: a practitioner computes “{title}” as {formula}"
                        + (f", assembling inputs ({components})" if components else "")
                        + ", records the figure with the evidence trail, and confirms "
                        "the decision the number supports before sign-off."
                    ),
                    "commonError": (
                        f"Do not treat “{title}” as decision-ready without confirming "
                        "the formula inputs match the intended measure"
                        + (f" ({components})" if components else "")
                        + "; wrong components misstate the figure."
                    ),
                }
            )
    return terms


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "packs": [],
    }
    total = 0
    for pack_id, filename, label in PACKS:
        path = CODEX_DIR / filename
        if not path.exists():
            print(f"skip-missing {filename}", flush=True)
            continue
        document = Document(str(path))
        terms = parse_formula_tables(document)
        payload["packs"].append(
            {
                "pack": pack_id,
                "label": label,
                "source": f"Merixa x Codex/{filename}",
                "termCount": len(terms),
                "terms": terms,
            }
        )
        total += len(terms)
        print(f"ok {pack_id}: {len(terms)} terms", flush=True)

    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", "utf-8")
    print(f"Extracted {total} terms from {len(payload['packs'])} packs -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
