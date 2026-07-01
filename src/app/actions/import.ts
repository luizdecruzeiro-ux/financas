"use server";

import { prisma } from "@/lib/prisma";
import { parseOfx } from "@/lib/parsers/ofx";
import { parseSpreadsheet } from "@/lib/parsers/spreadsheet";
import { suggestCategoryId } from "@/lib/categorySuggest";
import { createTransaction, type TransactionInput } from "./transactions";
import { toNumber } from "@/lib/utils";

export type ImportDestination =
  | { kind: "account"; accountId: string }
  | { kind: "creditCard"; creditCardId: string };

export type PreviewRow = {
  date: string;
  description: string;
  amount: number; // signed, as read from the file
  suggestedCategoryId: string | null;
  duplicate: boolean;
};

export async function analyzeStatement(formData: FormData): Promise<{ rows: PreviewRow[] } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Nenhum arquivo enviado." };

  const destinationKind = formData.get("destinationKind");
  const destinationId = formData.get("destinationId");
  if (typeof destinationKind !== "string" || typeof destinationId !== "string" || !destinationId) {
    return { error: "Selecione a conta ou cartão de destino." };
  }

  const filename = file.name.toLowerCase();

  let parsed;
  try {
    if (filename.endsWith(".ofx")) {
      parsed = parseOfx(await file.text());
    } else if (filename.endsWith(".csv")) {
      parsed = parseSpreadsheet(await file.text(), filename);
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      parsed = parseSpreadsheet(await file.arrayBuffer(), filename);
    } else {
      return { error: "Formato de arquivo não suportado. Use .ofx, .csv, .xlsx ou .xls." };
    }
  } catch {
    return { error: "Não foi possível ler o arquivo. Verifique se o formato está correto." };
  }

  if (parsed.length === 0) {
    return { error: "Nenhuma transação encontrada no arquivo." };
  }

  const categories = await prisma.category.findMany();

  const sortedDates = [...parsed.map((r) => r.date)].sort();
  const minDate = new Date(sortedDates[0]);
  const maxDate = new Date(sortedDates[sortedDates.length - 1]);
  maxDate.setUTCDate(maxDate.getUTCDate() + 1);

  const existing = await prisma.transaction.findMany({
    where: {
      date: { gte: minDate, lt: maxDate },
      ...(destinationKind === "account" ? { accountId: destinationId } : { creditCardId: destinationId }),
    },
  });

  const rows: PreviewRow[] = parsed.map((row) => {
    const duplicate = existing.some(
      (e) =>
        e.date.toISOString().slice(0, 10) === row.date &&
        Math.abs(toNumber(e.amount) - Math.abs(row.amount)) < 0.01
    );
    return {
      date: row.date,
      description: row.description,
      amount: row.amount,
      suggestedCategoryId: suggestCategoryId(row.description, categories),
      duplicate,
    };
  });

  return { rows };
}

export type ConfirmRow = {
  date: string;
  description: string;
  amount: number;
  categoryId: string | null;
};

export async function confirmImport(rows: ConfirmRow[], destination: ImportDestination) {
  for (const row of rows) {
    const input: TransactionInput =
      destination.kind === "account"
        ? {
            description: row.description,
            amount: Math.abs(row.amount),
            date: row.date,
            type: row.amount < 0 ? "EXPENSE" : "INCOME",
            status: "PAID",
            accountId: destination.accountId,
            categoryId: row.categoryId,
          }
        : {
            description: row.description,
            amount: Math.abs(row.amount),
            date: row.date,
            type: "CARD_EXPENSE",
            status: "PENDING",
            creditCardId: destination.creditCardId,
            categoryId: row.categoryId,
          };

    await createTransaction(input);
  }

  return { imported: rows.length };
}
