"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function upsertBudget(input: {
  categoryId: string;
  month: number;
  year: number;
  plannedAmount: number;
}) {
  await prisma.budget.upsert({
    where: {
      categoryId_month_year: {
        categoryId: input.categoryId,
        month: input.month,
        year: input.year,
      },
    },
    update: { plannedAmount: input.plannedAmount },
    create: input,
  });
  revalidatePath("/planejamento");
  revalidatePath("/");
}

export async function deleteBudget(id: string) {
  await prisma.budget.delete({ where: { id } });
  revalidatePath("/planejamento");
  revalidatePath("/");
}
