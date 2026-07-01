import { prisma } from "@/lib/prisma";
import { currentMonthYear, monthRange, toNumber } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import MonthSwitcher from "@/components/MonthSwitcher";
import PlanejamentoClient from "./PlanejamentoClient";
import { serializeBudget } from "@/types";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const query = await searchParams;
  const defaults = currentMonthYear();
  const month = Number(query.month) || defaults.month;
  const year = Number(query.year) || defaults.year;
  const { start, end } = monthRange(month, year);

  const [categories, budgets, expenseTransactions] = await Promise.all([
    prisma.category.findMany({ where: { type: "EXPENSE" }, orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { month, year } }),
    prisma.transaction.findMany({
      where: {
        date: { gte: start, lt: end },
        type: { in: ["EXPENSE", "CARD_EXPENSE"] },
        ignored: false,
      },
    }),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const t of expenseTransactions) {
    if (!t.categoryId) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + toNumber(t.amount));
  }

  const rows = categories.map((category) => {
    const budget = budgets.find((b) => b.categoryId === category.id) ?? null;
    return {
      category,
      budget: budget ? serializeBudget(budget) : null,
      spent: spentByCategory.get(category.id) ?? 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Planejamento"
        subtitle="Defina quanto pretende gastar por categoria este mês"
        actions={<MonthSwitcher month={month} year={year} />}
      />
      <PlanejamentoClient rows={rows} month={month} year={year} />
    </div>
  );
}
