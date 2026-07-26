/**
 * Minimal OOXML (.xlsx) builder — STORE zip, no third-party deps.
 * Enough for Tutor spreadsheet demos: headers + string/number cells + coach sheet.
 */

export type XlsxCell = string | number | null | undefined;

export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
};

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:\[\]]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet1";
}

function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function isNumericCell(value: string): boolean {
  if (!value.trim()) return false;
  const normalized = value.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?%?$/.test(normalized)) return false;
  return Number.isFinite(Number(normalized.replace(/%$/, "")));
}

function cellXml(value: XlsxCell, ref: string): string {
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}"/>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const text = String(value);
  if (isNumericCell(text)) {
    const n = Number(text.replace(/,/g, "").replace(/%$/, "").trim());
    return `<c r="${ref}"><v>${n}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(text)}</t></is></c>`;
}

function sheetXml(rows: XlsxCell[][]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row
        .map((cell, colIndex) => cellXml(cell, `${colName(colIndex)}${r}`))
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowXml}</sheetData>` +
    `</worksheet>`
  );
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i]!;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

type ZipEntry = { name: string; data: Uint8Array };

function zipStore(entries: ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0x0800), // UTF-8
      u16(0), // store
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);

    localParts.push(localHeader, entry.data);

    const centralHeader = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);

  return concatBytes([...localParts, central, end]);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/** Build a real .xlsx workbook from one or more sheets. */
export function buildXlsx(sheets: XlsxSheet[]): Uint8Array {
  if (sheets.length === 0) {
    throw new Error("At least one sheet is required.");
  }

  const usedNames = new Set<string>();
  const named = sheets.map((sheet, index) => {
    let name = sanitizeSheetName(sheet.name);
    if (usedNames.has(name)) name = sanitizeSheetName(`${name} ${index + 1}`);
    usedNames.add(name);
    return { ...sheet, name };
  });

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    named
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    named
      .map(
        (sheet, i) =>
          `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join("") +
    `</sheets></workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    named
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `</Relationships>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encodeUtf8(contentTypes) },
    { name: "_rels/.rels", data: encodeUtf8(rootRels) },
    { name: "xl/workbook.xml", data: encodeUtf8(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: encodeUtf8(workbookRels) },
  ];

  named.forEach((sheet, i) => {
    entries.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encodeUtf8(sheetXml(sheet.rows)),
    });
  });

  return zipStore(entries);
}

export function uint8ToBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

export function buildXlsxBase64(sheets: XlsxSheet[]): string {
  return bytesToBase64(buildXlsx(sheets));
}

export function xlsxMimeType(): string {
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
