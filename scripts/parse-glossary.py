"""
Parse Merixa Management Reporting Practitioner Glossary DOCX tables into
structured encyclopedia terms (no LLM invention).

Writes content/pipeline/glossary-terms.json
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT.parent
DOCX = (
    DOWNLOADS
    / "Merixa_Management_Reporting_Practitioner_Glossary_v2_QA_Rebuilt_Pack"
    / "Merixa_Management_Reporting_Practitioner_Glossary_v2_QA_Rebuilt.docx"
)
OUT = ROOT / "content" / "pipeline" / "glossary-terms.json"
CACHE = ROOT / "content" / "raw-cache"
CACHE_NAME = "Merixa-Management-Reporting-Practitioner-Glossar-encyclopedia.txt"

FIELD_LABELS = (
    "Plain professional definition",
    "How to use it in practice",
    "Interpretation",
    "Common errors / misuse",
    "Evidence required",
    "Related terms / cross-reference",
    "Professional alignment note",
    "Formula / calculation",
    "Components and data inputs",
)


def clean(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_fields(blob: str) -> dict[str, str]:
    text = clean(blob)
    pattern = "|".join(re.escape(label) for label in FIELD_LABELS)
    parts = re.split(rf"(?=(?:{pattern})\s*:)", text)
    fields: dict[str, str] = {}
    for part in parts:
        part = part.strip()
        if not part:
            continue
        match = re.match(r"^([^:]+):\s*(.*)$", part, flags=re.S)
        if not match:
            continue
        label = match.group(1).strip()
        value = clean(match.group(2))
        if label in FIELD_LABELS and value:
            fields[label] = value
    return fields


def parse_term_header(left: str) -> tuple[str | None, str, str]:
    text = clean(left)
    match = re.match(
        r"^(?P<num>\d{3})\s+(?P<title>.+?)(?:\n|Formula / calculation:|$)",
        text,
        flags=re.S,
    )
    if not match:
        return None, "", text
    number = match.group("num")
    title = clean(match.group("title").split("\n")[0])
    fields = split_fields(text)
    formula = fields.get("Formula / calculation", "")
    components = fields.get("Components and data inputs", "")
    return number, title, "\n".join(
        part for part in (formula, components) if part
    )


def main() -> int:
    if not DOCX.exists():
        raise SystemExit(f"Missing glossary DOCX: {DOCX}")

    document = Document(str(DOCX))
    terms: list[dict] = []
    seen: set[str] = set()

    for table in document.tables:
        for row in table.rows:
            cells = [clean(cell.text) for cell in row.cells]
            # Skip QA control tables and blank rows.
            if len(cells) < 2:
                continue
            left, right = cells[0], cells[1]
            if left.lower() in {"control point", "term"}:
                continue
            if "plain professional definition" not in right.lower():
                continue

            number, title, formula_block = parse_term_header(left)
            if not title or not number:
                continue
            key = title.casefold()
            if key in seen:
                continue
            seen.add(key)

            fields = split_fields(right)
            definition = fields.get("Plain professional definition", "")
            if len(definition) < 40:
                continue

            terms.append(
                {
                    "number": number,
                    "title": title,
                    "definition": definition,
                    "howToUse": fields.get("How to use it in practice", ""),
                    "interpretation": fields.get("Interpretation", ""),
                    "commonError": fields.get("Common errors / misuse", ""),
                    "evidence": fields.get("Evidence required", ""),
                    "related": fields.get("Related terms / cross-reference", ""),
                    "alignment": fields.get("Professional alignment note", ""),
                    "formula": formula_block,
                    "source": str(DOCX.relative_to(DOWNLOADS)).replace("\\", "/"),
                }
            )

    terms.sort(key=lambda item: item["number"])

    # Refresh raw-cache encyclopedia extract for terminology learner.
    CACHE.mkdir(parents=True, exist_ok=True)
    lines = [
        f"@@META::{json.dumps({'source': terms[0]['source'] if terms else '', 'titleHint': 'Merixa Management Reporting Practitioner Glossary', 'chars': 0}, ensure_ascii=True)}",
        "",
        "MERIXA Management Reporting Practitioner Glossary — encyclopedia extract",
        "",
    ]
    for term in terms:
        block = [
            f"{term['number']} {term['title']}",
            f"Plain professional definition: {term['definition']}",
        ]
        if term["formula"]:
            block.append(f"Formula / calculation: {term['formula']}")
        if term["howToUse"]:
            block.append(f"How to use it in practice: {term['howToUse']}")
        if term["interpretation"]:
            block.append(f"Interpretation: {term['interpretation']}")
        if term["commonError"]:
            block.append(f"Common errors / misuse: {term['commonError']}")
        if term["evidence"]:
            block.append(f"Evidence required: {term['evidence']}")
        if term["related"]:
            block.append(f"Related terms / cross-reference: {term['related']}")
        lines.append("\n".join(block))
        lines.append("")
    cache_text = "\n".join(lines)
    meta = {
        "source": terms[0]["source"] if terms else "",
        "titleHint": "Merixa Management Reporting Practitioner Glossary",
        "chars": len(cache_text),
    }
    lines[0] = f"@@META::{json.dumps(meta, ensure_ascii=True)}"
    (CACHE / CACHE_NAME).write_text("\n".join(lines), encoding="utf-8")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(DOCX.relative_to(DOWNLOADS)).replace("\\", "/"),
        "termCount": len(terms),
        "terms": terms,
        "cacheFile": CACHE_NAME,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Parsed {len(terms)} glossary terms -> {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
