import type { ParsedRow } from "./types";
import { parseAmount } from "./amount";

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
  return match ? match[1].trim() : null;
}

// OFX dates look like "20260701" or "20260701120000[-3:BRT]" — we only care
// about the calendar day, so grab the first 8 digits (YYYYMMDD).
function parseOfxDate(raw: string): string | null {
  const digits = raw.match(/^(\d{8})/);
  if (!digits) return null;
  const y = digits[1].slice(0, 4);
  const m = digits[1].slice(4, 6);
  const d = digits[1].slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function parseOfx(content: string): ParsedRow[] {
  const blocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];
  const rows: ParsedRow[] = [];

  for (const block of blocks) {
    const dtposted = extractTag(block, "DTPOSTED");
    const trnamt = extractTag(block, "TRNAMT");
    const name = extractTag(block, "NAME") ?? extractTag(block, "MEMO") ?? "Sem descrição";

    if (!dtposted || !trnamt) continue;
    const date = parseOfxDate(dtposted);
    if (!date) continue;

    rows.push({ date, description: name, amount: parseAmount(trnamt) });
  }

  return rows;
}
