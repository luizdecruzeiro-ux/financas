import * as XLSX from "xlsx";
import type { ParsedRow } from "./types";
import { parseAmount } from "./amount";

function normalizeDateCell(value: unknown): string | null {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(value ?? "").trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // ISO: YYYY-MM-DD
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY (padrão BR)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); // DD-MM-YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  return null;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Parsed manually (not via XLSX) because SheetJS's CSV reader auto-detects
// date-looking strings and assumes US MM/DD/YYYY, silently swapping day/month
// for Brazilian DD/MM/YYYY dates. Keeping CSV cells as plain strings lets
// normalizeDateCell parse them unambiguously instead.
function parseCsv(content: string): string[][] {
  const lines = content.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function parseWorkbookSheet(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false });
}

// Reads .csv / .xlsx / .xls uniformly. Tries to find date/description/amount
// columns by header name; falls back to positional (date, description, amount)
// when no recognizable header row is present.
export function parseSpreadsheet(input: string | ArrayBuffer, filename: string): ParsedRow[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const raw: unknown[][] = isCsv ? parseCsv(input as string) : parseWorkbookSheet(input as ArrayBuffer);

  if (raw.length === 0) return [];

  const headerCandidates = raw[0].map((c) => String(c ?? "").toLowerCase());
  const findIdx = (pattern: RegExp) => headerCandidates.findIndex((c) => pattern.test(c));
  const hasHeader = /data|date|descri|histor|memo|valor|amount/.test(headerCandidates.join(" "));

  let dateIdx = 0;
  let descIdx = 1;
  let amountIdx = 2;
  let startRow = 0;

  if (hasHeader) {
    startRow = 1;
    const d = findIdx(/data|date/);
    const desc = findIdx(/descri|histor|memo/);
    const amt = findIdx(/valor|amount|value/);
    if (d >= 0) dateIdx = d;
    if (desc >= 0) descIdx = desc;
    if (amt >= 0) amountIdx = amt;
  }

  const rows: ParsedRow[] = [];
  for (let i = startRow; i < raw.length; i++) {
    const line = raw[i];
    if (!line || line.length === 0) continue;

    const dateRaw = line[dateIdx];
    const descRaw = line[descIdx];
    const amountRaw = line[amountIdx];
    if (dateRaw == null || amountRaw == null) continue;

    const date = normalizeDateCell(dateRaw);
    if (!date) continue;

    const amount = typeof amountRaw === "number" ? amountRaw : parseAmount(String(amountRaw));

    rows.push({
      date,
      description: descRaw != null ? String(descRaw).trim() : "Sem descrição",
      amount,
    });
  }

  return rows;
}
