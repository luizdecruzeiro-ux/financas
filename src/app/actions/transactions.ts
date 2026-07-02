"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addInterval, type RepeatUnit } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { TransactionType, TransactionStatus } from "@/generated/prisma/enums";

export type TransactionInput = {
  description: string;
  amount: number;
  date: string; // ISO date
  type: TransactionType;
  status: TransactionStatus;
  accountId?: string | null;
  toAccountId?: string | null;
  creditCardId?: string | null;
  categoryId?: string | null;
  isRecurring?: boolean;
  installments?: number; // parcelamento de cartão: divide o valor, sempre mensal
  repeatCount?: number; // recorrência genérica: repete o valor cheio
  repeatUnit?: RepeatUnit;
  suppressOccurrenceLabel?: boolean; // não sufixar "(i/N)" na descrição — usado por despesa/receita fixa
  ignored?: boolean;
  tags?: string[];
  note?: string | null;
  attachmentUrl?: string | null;
};

type BalanceEffect = {
  type: TransactionType;
  amount: number;
  accountId?: string | null;
  toAccountId?: string | null;
};

async function applyBalanceEffect(tx: Prisma.TransactionClient, effect: BalanceEffect, sign: 1 | -1) {
  if (effect.type === "INCOME" && effect.accountId) {
    await tx.account.update({
      where: { id: effect.accountId },
      data: { balance: { increment: sign * effect.amount } },
    });
  } else if (effect.type === "EXPENSE" && effect.accountId) {
    await tx.account.update({
      where: { id: effect.accountId },
      data: { balance: { decrement: sign * effect.amount } },
    });
  } else if (effect.type === "TRANSFER") {
    if (effect.accountId) {
      await tx.account.update({
        where: { id: effect.accountId },
        data: { balance: { decrement: sign * effect.amount } },
      });
    }
    if (effect.toAccountId) {
      await tx.account.update({
        where: { id: effect.toAccountId },
        data: { balance: { increment: sign * effect.amount } },
      });
    }
  }
  // CARD_EXPENSE does not touch account balances directly; settled via payInvoice.
}

export async function createTransaction(input: TransactionInput) {
  const isCardInstallmentPath = input.type === "CARD_EXPENSE" && (input.installments ?? 1) > 1;
  const occurrences = isCardInstallmentPath ? input.installments! : Math.max(1, input.repeatCount ?? 1);
  const unit: RepeatUnit = isCardInstallmentPath ? "month" : input.repeatUnit ?? "month";
  const divideAmount = isCardInstallmentPath;
  // Transfers move money between the user's own accounts right away, so every
  // occurrence stays with the chosen status. For everything else, only the
  // first occurrence keeps the chosen status — future occurrences haven't
  // happened yet, so they start as PENDING regardless of what was picked.
  const downgradeFutureOccurrences = input.type !== "TRANSFER";

  const baseDate = new Date(input.date);
  const ignored = input.ignored ?? false;
  const perOccurrenceAmount = divideAmount ? Math.round((input.amount / occurrences) * 100) / 100 : input.amount;

  // Build all occurrence rows up front and insert them in a single query —
  // looping create() calls one at a time against a remote pooled connection
  // easily blows past Prisma's interactive-transaction timeout once
  // `occurrences` gets into the dozens (e.g. a 24x "despesa fixa").
  let paidOccurrences = 0;
  const rows = Array.from({ length: occurrences }, (_, i) => {
    const occurrenceStatus: TransactionStatus = i === 0 || !downgradeFutureOccurrences ? input.status : "PENDING";
    if (occurrenceStatus === "PAID") paidOccurrences += 1;

    return {
      description:
        occurrences > 1 && !input.suppressOccurrenceLabel
          ? `${input.description} (${i + 1}/${occurrences})`
          : input.description,
      amount: perOccurrenceAmount,
      date: addInterval(baseDate, unit, i),
      type: input.type,
      status: occurrenceStatus,
      accountId: input.accountId || null,
      toAccountId: input.toAccountId || null,
      creditCardId: input.creditCardId || null,
      categoryId: input.categoryId || null,
      isRecurring: input.isRecurring ?? occurrences > 1,
      installmentNumber: occurrences > 1 ? i + 1 : null,
      installmentTotal: occurrences > 1 ? occurrences : null,
      ignored,
      tags: input.tags ?? [],
      note: input.note || null,
      attachmentUrl: input.attachmentUrl || null,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.transaction.createMany({ data: rows });

    if (paidOccurrences > 0 && !ignored) {
      await applyBalanceEffect(
        tx,
        {
          type: input.type,
          amount: perOccurrenceAmount * paidOccurrences,
          accountId: input.accountId,
          toAccountId: input.toAccountId,
        },
        1
      );
    }
  });

  revalidatePath("/", "layout");
}

export async function updateTransaction(id: string, input: TransactionInput) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUniqueOrThrow({ where: { id } });

    if (existing.status === "PAID" && !existing.ignored) {
      await applyBalanceEffect(
        tx,
        {
          type: existing.type,
          amount: Number(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId,
        },
        -1
      );
    }

    await tx.transaction.update({
      where: { id },
      data: {
        description: input.description,
        amount: input.amount,
        date: new Date(input.date),
        type: input.type,
        status: input.status,
        accountId: input.accountId || null,
        toAccountId: input.toAccountId || null,
        creditCardId: input.creditCardId || null,
        categoryId: input.categoryId || null,
        isRecurring: input.isRecurring ?? false,
        ignored: input.ignored ?? false,
        tags: input.tags ?? [],
        note: input.note || null,
        attachmentUrl: input.attachmentUrl || null,
      },
    });

    if (input.status === "PAID" && !(input.ignored ?? false)) {
      await applyBalanceEffect(
        tx,
        { type: input.type, amount: input.amount, accountId: input.accountId, toAccountId: input.toAccountId },
        1
      );
    }
  });

  revalidatePath("/", "layout");
}

export async function deleteTransaction(id: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUniqueOrThrow({ where: { id } });

    if (existing.status === "PAID" && !existing.ignored) {
      await applyBalanceEffect(
        tx,
        {
          type: existing.type,
          amount: Number(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId,
        },
        -1
      );
    }

    await tx.transaction.delete({ where: { id } });
  });

  revalidatePath("/", "layout");
}

export async function toggleTransactionPaid(id: string) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUniqueOrThrow({ where: { id } });
    const newStatus: TransactionStatus = existing.status === "PAID" ? "PENDING" : "PAID";

    await tx.transaction.update({ where: { id }, data: { status: newStatus } });

    if (!existing.ignored) {
      const sign = newStatus === "PAID" ? 1 : -1;
      await applyBalanceEffect(
        tx,
        {
          type: existing.type,
          amount: Number(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId,
        },
        sign
      );
    }
  });

  revalidatePath("/", "layout");
}
