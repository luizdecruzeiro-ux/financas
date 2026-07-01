"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType } from "@/generated/prisma/enums";

export type AccountInput = {
  name: string;
  type: AccountType;
  institution?: string;
  balance: number;
  color: string;
};

export async function createAccount(input: AccountInput) {
  await prisma.account.create({ data: input });
  revalidatePath("/", "layout");
}

export async function updateAccount(id: string, input: AccountInput) {
  await prisma.account.update({ where: { id }, data: input });
  revalidatePath("/", "layout");
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/", "layout");
}
