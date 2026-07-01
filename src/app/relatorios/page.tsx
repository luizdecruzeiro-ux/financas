import { prisma } from "@/lib/prisma";
import { formatCurrency, lastNMonths, monthName, monthRange, toNumber } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import RangeSwitcher from "./RangeSwitcher";
import EvolutionChart from "@/components/charts/EvolutionChart";
import CategoryDonutChart, { type CategorySlice } from "@/components/charts/CategoryDonutChart";
import styles from "./relatorios.module.css";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const query = await searchParams;
  const range = Number(query.range) === 12 ? 12 : 6;

  const months = lastNMonths(range);
  const overallStart = monthRange(months[0].month, months[0].year).start;
  const overallEnd = monthRange(months[months.length - 1].month, months[months.length - 1].year).end;

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: overallStart, lt: overallEnd }, ignored: false },
    include: { category: true },
  });

  const evolution = months.map(({ month, year }) => {
    const { start, end } = monthRange(month, year);
    const inRange = transactions.filter((t) => t.date >= start && t.date < end);
    const income = inRange.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + toNumber(t.amount), 0);
    const expense = inRange
      .filter((t) => t.type === "EXPENSE" || t.type === "CARD_EXPENSE")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
    return { label: `${monthName(month).slice(0, 3)}/${String(year).slice(2)}`, income, expense };
  });

  const totalIncome = evolution.reduce((s, m) => s + m.income, 0);
  const totalExpense = evolution.reduce((s, m) => s + m.expense, 0);

  const expenseByCategory = new Map<string, CategorySlice>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE" && t.type !== "CARD_EXPENSE") continue;
    const key = t.category?.name ?? "Sem categoria";
    const color = t.category?.color ?? "#9aa5b1";
    const existing = expenseByCategory.get(key);
    if (existing) existing.value += toNumber(t.amount);
    else expenseByCategory.set(key, { name: key, value: toNumber(t.amount), color });
  }
  const categorySlices = Array.from(expenseByCategory.values()).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Evolução de receitas e despesas ao longo do tempo"
        actions={<RangeSwitcher range={range} />}
      />

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Receitas no período</span>
          <span className={styles.summaryIncome}>{formatCurrency(totalIncome)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Despesas no período</span>
          <span className={styles.summaryExpense}>{formatCurrency(totalExpense)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Saldo do período</span>
          <span className={totalIncome - totalExpense >= 0 ? styles.summaryIncome : styles.summaryExpense}>
            {formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Evolução mensal</h3>
        {totalIncome === 0 && totalExpense === 0 ? (
          <EmptyState title="Ainda não há transações neste período para exibir." />
        ) : (
          <EvolutionChart data={evolution} />
        )}
      </div>

      <div className={styles.card}>
        <h3>Despesas por categoria no período</h3>
        {categorySlices.length === 0 ? (
          <EmptyState title="Ainda não há despesas neste período." />
        ) : (
          <CategoryDonutChart data={categorySlices} />
        )}
      </div>
    </div>
  );
}
