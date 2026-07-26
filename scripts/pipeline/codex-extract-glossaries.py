"""
Extract Merixa-authored practitioner glossary packs into structured terms
for the codex local feed (scripts/pipeline/codex-local-feed.mjs).

Merixa-owned content only — no third-party textbooks, no LLM calls.
Each pack is a zip containing a *_QA_Rebuilt.docx where every term is its
own 2-column table (label / value rows).

Writes content/pipeline/codex-feed/extracted-terms.json
"""

from __future__ import annotations

import json
import re
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[2]
CODEX_DIR = ROOT.parent / "Merixa x Codex"
OUT_DIR = ROOT / "content" / "pipeline" / "codex-feed"
OUT = OUT_DIR / "extracted-terms.json"

# (pack id, zip filename, human label)
PACKS = [
    (
        "audit",
        "Merixa_Audit_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Audit Practitioner Glossary v2",
    ),
    (
        "governance",
        "Merixa_Governance_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Governance Practitioner Glossary v2",
    ),
    (
        "risk-management",
        "Merixa_Risk_Management_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Risk Management Practitioner Glossary v2",
    ),
    (
        "internal-controls",
        "Merixa_Internal_Controls_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Internal Controls Practitioner Glossary v2",
    ),
    (
        "ifrs-consolidation",
        "Merixa_IFRS_Consolidation_Group_Reporting_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa IFRS Consolidation & Group Reporting Practitioner Glossary v2",
    ),
    (
        "financial-reporting",
        "Merixa_Financial_Reporting_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Financial Reporting Practitioner Glossary v2",
    ),
    (
        "financial-analysis",
        "Merixa_Financial_Analysis_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Financial Analysis Practitioner Glossary v2",
    ),
    (
        "management-reporting",
        "Merixa_Management_Reporting_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Management Reporting Practitioner Glossary v2",
    ),
    (
        "performance-management",
        "Merixa_Performance_Management_Practitioner_Glossary_v2_QA_Rebuilt_Pack.zip",
        "Merixa Performance Management Practitioner Glossary v2",
    ),
]

LABEL_TO_FIELD = {
    "term": "title",
    "plain professional definition": "definition",
    "formula / calculation": "formula",
    "components and data inputs": "components",
    "how to use it in practice": "howToUse",
    "interpretation": "interpretation",
    "common errors / misuse": "commonError",
    "evidence required": "evidence",
    "related terms / cross-reference": "related",
    "practitioner warning": "warning",
    "example wording or mini-example": "example",
    "professional alignment note": "alignment",
    "source components": "components",
}

VALUE_LABELS = [label for label in LABEL_TO_FIELD if label != "term"]
FIELD_LABEL_PATTERN = "|".join(
    re.escape(label) for label in sorted(VALUE_LABELS, key=len, reverse=True)
)

NOT_A_FORMULA = re.compile(r"^(n/?a|none|not applicable|qualitative)\b[.\s]*$", re.I)


def clean(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


TERM_HEADING = re.compile(r"^\d{3}\s+(?P<title>.+)$")
LABEL_LINE = re.compile(r"^(?P<label>[A-Z][^:]{2,60})\s*:\s*(?P<value>.+)$", re.S)


def parse_paragraph_terms(document: Document) -> list[dict]:
    """Packs where each term is a Heading 2 ('NNN Title') + labeled paragraphs."""
    terms: list[dict] = []
    seen: set[str] = set()
    current: dict[str, str] | None = None

    def flush() -> None:
        nonlocal current
        if not current:
            return
        title = current.get("title", "")
        definition = current.get("definition", "")
        if title and len(definition) >= 60 and title.casefold() not in seen:
            seen.add(title.casefold())
            formula = current.get("formula", "")
            if formula and NOT_A_FORMULA.match(formula):
                current.pop("formula", None)
            terms.append(current)
        current = None

    for paragraph in document.paragraphs:
        text = clean(paragraph.text)
        if not text:
            continue
        style = (paragraph.style.name or "").lower()
        heading_match = TERM_HEADING.match(text)
        if style.startswith("heading 2") and heading_match:
            flush()
            current = {"title": clean(heading_match.group("title"))}
            continue
        if current is None:
            continue
        label_match = LABEL_LINE.match(text)
        if not label_match:
            continue
        field = LABEL_TO_FIELD.get(label_match.group("label").strip().lower())
        if field and field != "title":
            current[field] = clean(label_match.group("value"))
    flush()
    return terms


def parse_table_terms(document: Document) -> list[dict]:
    terms: list[dict] = []
    seen: set[str] = set()
    for table in document.tables:
        fields: dict[str, str] = {}
        for row in table.rows:
            if len(row.cells) < 2:
                continue
            label = clean(row.cells[0].text).lower().rstrip(":")
            value = clean(row.cells[1].text)
            field = LABEL_TO_FIELD.get(label)
            if field and value:
                fields[field] = value
        title = fields.get("title", "")
        definition = fields.get("definition", "")
        if not title or len(definition) < 60:
            continue
        key = title.casefold()
        if key in seen:
            continue
        seen.add(key)
        formula = fields.get("formula", "")
        if formula and NOT_A_FORMULA.match(formula):
            fields.pop("formula", None)
        terms.append(fields)
    return terms


def split_labeled(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    parts = re.split(rf"(?i)\n(?=(?:{FIELD_LABEL_PATTERN})\s*:)", "\n" + text)
    for part in parts:
        part = part.strip()
        match = re.match(rf"(?is)^({FIELD_LABEL_PATTERN})\s*:\s*(.*)$", part)
        if not match:
            continue
        field = LABEL_TO_FIELD[match.group(1).strip().lower()]
        value = clean(match.group(2))
        if value:
            fields[field] = value
    return fields


def parse_combined_table_terms(document: Document) -> list[dict]:
    """Packs where each term is one single-row table: 'NNN Title\\n<fields>' | '<fields>'."""
    terms: list[dict] = []
    seen: set[str] = set()
    for table in document.tables:
        if not table.rows or len(table.rows[0].cells) < 2:
            continue
        left = clean(table.rows[0].cells[0].text)
        right = clean(table.rows[0].cells[1].text)
        header = re.match(r"^(\d{3})\s+(?P<title>[^\n]+)", left)
        if not header:
            continue
        title = clean(header.group("title"))
        if not title or title.casefold() in seen:
            continue
        fields = {**split_labeled(left), **split_labeled(right)}
        definition = fields.get("definition", "")
        if len(definition) < 60:
            continue
        seen.add(title.casefold())
        formula = fields.get("formula", "")
        if formula and NOT_A_FORMULA.match(formula):
            fields.pop("formula", None)
        fields["title"] = title
        terms.append(fields)
    return terms


def parse_docx(path: Path) -> list[dict]:
    document = Document(str(path))
    terms = parse_table_terms(document)
    if len(terms) < 10:
        terms = parse_paragraph_terms(document)
    if len(terms) < 10:
        terms = parse_combined_table_terms(document)
    return terms


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "packs": [],
    }
    total = 0
    for pack_id, zip_name, label in PACKS:
        zip_path = CODEX_DIR / zip_name
        if not zip_path.exists():
            print(f"skip-missing {zip_name}", flush=True)
            continue
        with zipfile.ZipFile(zip_path) as archive:
            docx_names = [
                name for name in archive.namelist() if name.endswith("_QA_Rebuilt.docx")
            ]
            if not docx_names:
                print(f"skip-no-docx {zip_name}", flush=True)
                continue
            with tempfile.TemporaryDirectory() as tmp:
                extracted = Path(tmp) / "glossary.docx"
                extracted.write_bytes(archive.read(docx_names[0]))
                terms = parse_docx(extracted)
        payload["packs"].append(
            {
                "pack": pack_id,
                "label": label,
                "source": f"Merixa x Codex/{zip_name}",
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
