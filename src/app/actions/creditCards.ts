"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { monthRange } from "@/lib/utils";

export type CreditCardInput = {
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  paymentAccountId?: string | null;
};

export async function createCreditCard(input: CreditCardInput) {
  await prisma.creditCard.create({ data: input });
  revalidatePath("/", "layout");
}

export async function updateCreditCard(id: string, input: CreditCardInput) {
  await prisma.creditCard.update({ where: { id }, data: input });
  revalidatePath("/", "layout");
}

export async function deleteCreditCard(id: string) {
  await prisma.creditCard.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function payInvoice(creditCardId: string, month: number, year: number) {
  const { start, end } = monthRange(month, year);

  await prisma.$transaction(async (tx) => {
    const pending = await tx.transaction.findMany({
      where: {
        creditCardId,
        type: "CARD_EXPENSE",
        status: "PENDING",
        date: { gte: start, lt: end },
      },
    });

    if (pending.length === 0) return;

    await tx.transaction.updateMany({
      where: { id: { in: pending.map((t) => t.id) } },
      data: { status: "PAID" },
    });

    const card = await tx.creditCard.findUnique({ where: { id: creditCardId } });
    if (card?.paymentAccountId) {
      const total = pending.reduce((sum, t) => sum + Number(t.amount), 0);
      await tx.account.update({
        where: { id: card.paymentAccountId },
        data: { balance: { decrement: total } },
      });
    }
  });

  revalidatePath("/cartoes-credito");
  revalidatePath("/");
}
