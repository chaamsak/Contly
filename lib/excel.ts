import * as XLSX from "xlsx";
import type { ParseResult, ParsedRow } from "./types";

const ARABIC_REGEX = /[\u0600-\u06FF]/;

const ARABIC_HEADERS = ["arabic", "ARABIC", "Arabic", "عربي"];
const ENGLISH_HEADERS = ["english", "ENGLISH", "English", "إنجليزي"];

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // Remove diacritics
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrimary(cell: string): string {
  // Split on "\" or "/" and keep first non-empty token
  const tokens = cell.split(/[/\\]/).map((t) => t.trim());
  const first = tokens.find((t) => t.length > 0);
  return first ?? cell.trim();
}

function findColumnIndex(
  headers: (string | undefined)[],
  candidates: string[]
): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.trim();
    if (h && candidates.includes(h)) {
      return i;
    }
  }
  return -1;
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], totalRows: 0, skippedRows: 0, dupeRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw: (string | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: undefined,
    blankrows: false,
  });

  if (raw.length === 0) {
    return { rows: [], totalRows: 0, skippedRows: 0, dupeRows: 0 };
  }

  // Detect headers
  const firstRow = raw[0].map((c) => (c != null ? String(c) : undefined));
  let arabicCol = findColumnIndex(firstRow, ARABIC_HEADERS);
  let englishCol = findColumnIndex(firstRow, ENGLISH_HEADERS);
  let dataStartRow = 0;

  if (arabicCol >= 0) {
    // Headers found
    dataStartRow = 1;
  } else {
    // Fallback: column A = Arabic, column B = English
    arabicCol = 0;
    englishCol = 1;
    dataStartRow = 0;
  }

  const totalRows = raw.length - dataStartRow;
  let skippedRows = 0;
  let dupeRows = 0;
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];

  for (let i = dataStartRow; i < raw.length; i++) {
    const row = raw[i];
    const arabicCell = row[arabicCol] != null ? String(row[arabicCol]) : "";
    const englishCell =
      englishCol >= 0 && row[englishCol] != null
        ? String(row[englishCol])
        : null;

    // Skip rows with no Arabic Unicode
    if (!ARABIC_REGEX.test(arabicCell)) {
      skippedRows++;
      continue;
    }

    const arabicFull = arabicCell.trim();
    const arabicPrimary = extractPrimary(arabicFull);
    const normalized = normalizeArabic(arabicPrimary);

    // Deduplicate on normalized arabicPrimary
    if (seen.has(normalized)) {
      dupeRows++;
      continue;
    }
    seen.add(normalized);

    rows.push({
      arabicPrimary,
      arabicFull,
      english: englishCell?.trim() || null,
    });
  }

  return { rows, totalRows, skippedRows, dupeRows };
}
