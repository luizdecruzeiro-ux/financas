// Parses monetary strings in either "1234.56" (OFX/US) or "1.234,56" (extrato BR) format.
export function parseAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let normalized = trimmed;
  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = trimmed.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = trimmed.replace(",", ".");
  }

  const value = parseFloat(normalized);
  return Number.isNaN(value) ? 0 : value;
}
