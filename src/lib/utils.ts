export function formatCurrency(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

export function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

// Dates are stored as UTC midnight (date-only); format in UTC so the
// calendar day shown matches what was picked, regardless of server timezone.
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function monthRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function shiftMonth(month: number, year: number, delta: number): { month: number; year: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

export function lastNMonths(n: number, from?: { month: number; year: number }): { month: number; year: number }[] {
  const base = from ?? currentMonthYear();
  const result: { month: number; year: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(shiftMonth(base.month, base.year, -i));
  }
  return result;
}

// "Today" as UTC midnight, built from the local calendar date, so it lines up
// with dates stored as UTC-midnight date-only values (see monthRange/formatDate).
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function isOverdue(date: Date | string, status: string): boolean {
  if (status !== "PENDING") return false;
  return new Date(date) < todayUTC();
}

export type RepeatUnit = "day" | "week" | "month" | "year";

// Credit card billing cycle: charges on/after `closingDay` of a month belong
// to the invoice that closes the following month, not the current one. The
// invoice "labelled" (month, year) covers [closingDay of previous month,
// closingDay of this month).
export function invoiceRange(month: number, year: number, closingDay: number): { start: Date; end: Date } {
  const end = new Date(Date.UTC(year, month - 1, closingDay));
  const start = new Date(Date.UTC(year, month - 2, closingDay));
  return { start, end };
}

// Which invoice (month/year label) today's charges currently fall into.
export function currentInvoiceMonthYear(closingDay: number): { month: number; year: number } {
  const today = todayUTC();
  const base = { month: today.getUTCMonth() + 1, year: today.getUTCFullYear() };
  return today.getUTCDate() >= closingDay ? shiftMonth(base.month, base.year, 1) : base;
}

export function isInvoiceOpen(invoiceEnd: Date): boolean {
  return invoiceEnd > todayUTC();
}

export function addInterval(date: Date, unit: RepeatUnit, amount: number): Date {
  const result = new Date(date);
  switch (unit) {
    case "day":
      result.setUTCDate(result.getUTCDate() + amount);
      break;
    case "week":
      result.setUTCDate(result.getUTCDate() + amount * 7);
      break;
    case "month":
      result.setUTCMonth(result.getUTCMonth() + amount);
      break;
    case "year":
      result.setUTCFullYear(result.getUTCFullYear() + amount);
      break;
  }
  return result;
}
