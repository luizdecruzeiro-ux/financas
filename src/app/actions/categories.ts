"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CategoryType } from "@/generated/prisma/enums";

export type CategoryInput = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export async function createCategory(input: CategoryInput) {
  await prisma.category.create({ data: input });
  revalidatePath("/", "layout");
}

export async function updateCategory(id: string, input: CategoryInput) {
  await prisma.category.update({ where: { id }, data: input });
  revalidatePath("/", "layout");
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}
