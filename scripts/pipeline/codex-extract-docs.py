"""
Extract Merixa-authored method notes, delivery guides and checklists into
section-based terms for the codex local feed.

Merixa-owned content only (same usage-rights policy as codex-extract-glossaries.py;
third-party textbooks stay excluded per BLOCKED_SOURCE_PATTERN in extract-sources.py).

Each document is segmented by headings; every section becomes a candidate term:
  title      <- section heading (contextualised with its parent heading)
  definition <- first sentences of the section
  example    <- concrete sentence (numbers / "for example") or checklist items
  commonError<- warning sentences ("do not", "avoid", ...) with a doc-level
                boundary-note fallback

Writes content/pipeline/codex-feed/extracted-docs.json
"""

from __future__ import annotations

import json
import re
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[2]
CODEX_DIR = ROOT.parent / "Merixa x Codex"
OUT_DIR = ROOT / "content" / "pipeline" / "codex-feed"
OUT = OUT_DIR / "extracted-docs.json"

# (doc id, filename or zip member, label). Zips list members at runtime.
DOCS = [
    ("mr-method-notes", "Merixa_Management_Reporting_Technical_Method_Notes.docx", "Merixa Management Reporting Technical Method Notes"),
    ("mr-delivery-guide", "Merixa_Management_Reporting_Onsite_Delivery_User_Guide.docx", "Merixa Management Reporting Onsite Delivery User Guide"),
    ("mr-delivery-checklist", "Merixa_Management_Reporting_Full_Onsite_Delivery_Checklist.docx", "Merixa Management Reporting Full Onsite Delivery Checklist"),
    ("ma-service-checklist", "Merixa_Management_Accounts_Service_Checklist.docx", "Merixa Management Accounts Service Checklist"),
    ("ft-method-notes", "Merixa_Finance_Transformation_Technical_Method_Notes.docx", "Merixa Finance Transformation Technical Method Notes"),
    ("ft-delivery-guide", "Merixa_Finance_Transformation_Onsite_Delivery_User_Guide.docx", "Merixa Finance Transformation Onsite Delivery User Guide"),
    ("ft-delivery-checklist", "Merixa_Finance_Transformation_Full_Onsite_Delivery_Checklist.docx", "Merixa Finance Transformation Full Onsite Delivery Checklist"),
    ("ifrs-method-notes", "Merixa_IFRS_Reporting_Technical_Method_Notes.docx", "Merixa IFRS Reporting Technical Method Notes"),
    ("ifrs-standards-guideline", "Merixa_IFRS_Reporting_Technical_Accounting_Standards_Guideline.docx", "Merixa IFRS Reporting Technical Accounting Standards Guideline"),
    ("ifrs-extended-checklist", "Merixa_IFRS_Reporting_Technical_Accounting_Extended_Checklist.docx", "Merixa IFRS Reporting Technical Accounting Extended Checklist"),
    ("ifrs-conso-guide", "Merixa_IFRS_Consolidation_Reporting_Onsite_Delivery_User_Guide.docx", "Merixa IFRS Consolidation Reporting Onsite Delivery User Guide"),
    ("ifrs-conso-checklist", "Merixa_IFRS_Consolidation_Reporting_Full_Onsite_Delivery_Checklist.docx", "Merixa IFRS Consolidation Reporting Full Onsite Delivery Checklist"),
    ("rcg-method-notes", "Merixa_Risk_Controls_Governance_Technical_Method_Notes.docx", "Merixa Risk Controls & Governance Technical Method Notes"),
    ("rcg-delivery-guide", "Merixa_Risk_Controls_Governance_Onsite_Delivery_User_Guide.docx", "Merixa Risk Controls & Governance Onsite Delivery User Guide"),
    ("rcg-delivery-checklist", "Merixa_Risk_Controls_Governance_Full_Onsite_Delivery_Checklist.docx", "Merixa Risk Controls & Governance Full Onsite Delivery Checklist"),
    ("ic-phase1-guide", "Merixa_Internal_Control_Phase1_Method_and_User_Guide.docx", "Merixa Internal Control Phase 1 Method and User Guide"),
    ("ic-phase2-guide", "Merixa_Internal_Control_Phase2_Process_Packs_Method_Guide.docx", "Merixa Internal Control Phase 2 Process Packs Method Guide"),
    ("ic-phase3-guide", "Merixa_Internal_Control_Phase3_Specialist_Modules_Method_Guide.docx", "Merixa Internal Control Phase 3 Specialist Modules Method Guide"),
    ("ic-phase4-manual", "Merixa_Internal_Control_Phase4_Internal_Methodology_Manual.docx", "Merixa Internal Control Phase 4 Internal Methodology Manual"),
]

ZIPS = [
    ("ifrs-ar-checklists", "Merixa_Annual_Report_IFRS_Checklists_v2_QA_Fixed_All_DOCX.zip", "Merixa Annual Report IFRS Checklists v2"),
    ("service-checklists", "Merixa_Service_Checklists_v2_QA_Rebuilt_All_DOCX.zip", "Merixa Service Checklists v2"),
]

SKIP_HEADING = re.compile(
    r"^(?:\d+[.\s]*)?(controlled use|purpose|technical boundary|service boundary|"
    r"general delivery|step reference|how to use|use of this|document control|"
    r"version|scope|contents|coverage map|rebuild method|qa basis|standards? applicability|"
    r"working paper rules|operating boundary|boundary wording|core delivery rule)",
    re.I,
)
GENERIC_HEADING = re.compile(
    r"^(?:\d+(?:\.\d+)*\s*)?(procedure|minimum outputs|action checklist|method|"
    r"outputs?|steps?|workflow|evidence|checklist)\s*$",
    re.I,
)
TRAP_SENTENCE = re.compile(
    r"\b(do not|does not|avoid|never|must not|should not|cannot|is not a substitute|"
    r"common (error|failure|mistake)|risk of|without (confirming|evidence|review))\b",
    re.I,
)
EXAMPLE_SENTENCE = re.compile(r"(\d|for example|e\.g\.|worked example)", re.I)
ACTION_SENTENCE = re.compile(
    r"^(use|prepare|confirm|document|agree|test|trace|reconcile|obtain|review|"
    r"record|check|walk|map|assess|challenge|compare|escalate)\b",
    re.I,
)

# Labeled per-section tables in the technical method notes.
SECTION_LABELS = {
    "use when": "usewhen",
    "inputs required": "components",
    "method": "method",
    "formula / rule": "formula",
    "validation checks": "validation",
    "output": "output",
    "red flags": "redflags",
    "reference point": "reference",
    "minimum procedure": "procedure",
    "evidence standard": "evidence",
    "sap / excel application": "application",
    "escalation point": "escalation",
    "applicability triggers": "triggers",
    "procedure": "procedure",
    "required output": "output",
    "partner escalation": "escalation",
    "confirmation source": "reference",
}


def clean(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("\ufffd", "-")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    return text.strip()


def sentences(text: str) -> list[str]:
    return [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if len(s.strip()) >= 25
    ]


def clean_heading(text: str) -> str:
    text = clean(text)
    text = re.sub(r"^TN-\d+\s*[-—]\s*", "", text, flags=re.I)
    text = re.sub(r"^[A-Z]\.\s+", "", text)
    text = re.sub(r"^\d+(?:\.\d+)*\s*[.\-—]?\s*", "", text)
    return text.strip()


def iter_blocks(document: Document):
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def segment(document: Document) -> tuple[list[dict], str]:
    """Split into heading-bounded sections; return (sections, doc boundary note)."""
    sections: list[dict] = []
    current: dict | None = None
    last_h1 = ""
    boundary_bits: list[str] = []

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = clean(block.text)
            if not text:
                continue
            style = (block.style.name or "").lower()
            match = re.match(r"heading (\d)", style)
            if match:
                level = int(match.group(1))
                if level <= 2:
                    heading = clean_heading(text)
                    if level == 1:
                        last_h1 = heading
                    title = heading
                    if level == 2 and (
                        GENERIC_HEADING.match(text) or len(heading) < 12
                    ):
                        title = f"{last_h1} — {heading}" if last_h1 else heading
                    current = {
                        "title": title,
                        "raw": text,
                        "paras": [],
                        "rows": [],
                        "fields": {},
                    }
                    sections.append(current)
                continue
            if current is not None:
                current["paras"].append(text)
            if TRAP_SENTENCE.search(text) and len(boundary_bits) < 4:
                boundary_bits.append(text)
        else:  # Table
            if current is None:
                continue
            for row in block.rows:
                cells = [clean(cell.text) for cell in row.cells]
                if len(cells) >= 2:
                    field = SECTION_LABELS.get(cells[0].lower().rstrip(":"))
                    if field and cells[1] and field not in current["fields"]:
                        current["fields"][field] = cells[1]
                        continue
                unique: list[str] = []
                for cell in cells:
                    if cell and (not unique or unique[-1] != cell):
                        unique.append(cell)
                if unique:
                    current["rows"].append(" | ".join(unique)[:220])

    boundary = ""
    for bit in boundary_bits:
        found = [s for s in sentences(bit) if TRAP_SENTENCE.search(s)]
        if found:
            boundary = found[0][:400]
            break
    return sections, boundary


def build_labeled_term(section: dict) -> dict | None:
    """Method-note sections whose content lives in a labeled table."""
    fields = section["fields"]
    title = section["title"]
    intro = " ".join(sentences(" ".join(section["paras"]))[:2])
    definition = " ".join(
        part
        for part in (
            intro,
            fields.get("usewhen", "") or fields.get("triggers", ""),
            fields.get("output", ""),
        )
        if part
    ).strip()
    if len(definition) < 100:
        definition = f"{definition} {fields.get('method', '')}".strip()
    example = fields.get("procedure", "") or fields.get("method", "")
    trap = fields.get("redflags", "") or fields.get("escalation", "")
    if len(definition) < 100 or not example or not trap:
        return None
    how_to = fields.get("validation", "") or fields.get("application", "")
    formula = fields.get("formula", "")
    if re.match(r"^(no formula|n/?a|none|not applicable|qualitative)\b", formula, re.I):
        formula = ""
    return {
        "title": title,
        "definition": definition[:900],
        "example": re.sub(r"\s*\n\s*", " ", example)[:900],
        "commonError": trap[:500],
        **({"formula": formula[:400]} if formula else {}),
        **({"howToUse": how_to[:600]} if how_to else {}),
        **({"evidence": fields["evidence"][:400]} if fields.get("evidence") else {}),
        **(
            {"components": fields["components"][:300]}
            if fields.get("components")
            else {}
        ),
    }


def build_term(section: dict, boundary: str) -> dict | None:
    if SKIP_HEADING.match(section["raw"]) or SKIP_HEADING.match(section["title"]):
        return None
    title = section["title"]
    if len(title) < 8 or len(title) > 120:
        return None
    if len(section["fields"]) >= 3:
        return build_labeled_term(section)
    text = " ".join(section["paras"])
    sents = sentences(text)
    if len(" ".join(sents)) < 120:
        return None

    definition = ""
    for sentence in sents:
        definition = f"{definition} {sentence}".strip()
        if len(definition) >= 220 or definition.count(".") >= 3:
            break
    if len(definition) < 100:
        return None
    used = set(sentences(definition))
    rest = [s for s in sents if s not in used]

    example = next((s for s in rest if EXAMPLE_SENTENCE.search(s)), "")
    if not example and section["rows"]:
        example = "In practice: " + "; ".join(section["rows"][:3])
    if not example:
        actions = [s for s in rest if ACTION_SENTENCE.match(s)]
        example = " ".join(actions[:2])
    if not example:
        return None

    traps = [s for s in rest if TRAP_SENTENCE.search(s) and s != example]
    trap = " ".join(traps[:2]) or boundary
    if not trap:
        return None

    how_to = " ".join(
        s for s in rest if ACTION_SENTENCE.match(s) and s not in example
    )[:600]

    return {
        "title": title,
        "definition": definition[:900],
        "example": example[:900],
        "commonError": trap[:500],
        **({"howToUse": how_to} if how_to else {}),
    }


def extract_document(path: Path) -> list[dict]:
    document = Document(str(path))
    sections, boundary = segment(document)
    terms: list[dict] = []
    seen: set[str] = set()
    for section in sections:
        term = build_term(section, boundary)
        if not term:
            continue
        key = term["title"].casefold()
        if key in seen:
            continue
        seen.add(key)
        terms.append(term)
    return terms


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(), "packs": []}
    total = 0

    for doc_id, name, label in DOCS:
        path = CODEX_DIR / name
        if not path.exists():
            print(f"skip-missing {name}", flush=True)
            continue
        terms = extract_document(path)
        payload["packs"].append(
            {
                "pack": doc_id,
                "label": label,
                "source": f"Merixa x Codex/{name}",
                "termCount": len(terms),
                "terms": terms,
            }
        )
        total += len(terms)
        print(f"ok {doc_id}: {len(terms)} terms", flush=True)

    for zip_id, zip_name, zip_label in ZIPS:
        zip_path = CODEX_DIR / zip_name
        if not zip_path.exists():
            print(f"skip-missing {zip_name}", flush=True)
            continue
        with zipfile.ZipFile(zip_path) as archive:
            members = [m for m in archive.namelist() if m.endswith(".docx")]
            zip_terms: list[dict] = []
            for member in members:
                with tempfile.TemporaryDirectory() as tmp:
                    extracted = Path(tmp) / "doc.docx"
                    extracted.write_bytes(archive.read(member))
                    for term in extract_document(extracted):
                        term["memberDoc"] = Path(member).stem
                        zip_terms.append(term)
        payload["packs"].append(
            {
                "pack": zip_id,
                "label": zip_label,
                "source": f"Merixa x Codex/{zip_name}",
                "termCount": len(zip_terms),
                "terms": zip_terms,
            }
        )
        total += len(zip_terms)
        print(f"ok {zip_id}: {len(zip_terms)} terms ({len(members)} docs)", flush=True)

    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", "utf-8")
    print(f"Extracted {total} doc terms -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
