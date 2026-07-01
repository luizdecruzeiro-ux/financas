import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentMonthYear, formatCurrency, formatDate, monthRange, toNumber } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import MonthSwitcher from "@/components/MonthSwitcher";
import SummaryCard from "@/components/SummaryCard";
import EmptyState from "@/components/EmptyState";
import BalanceBarChart from "@/components/charts/BalanceBarChart";
import CategoryDonutChart, { type CategorySlice } from "@/components/charts/CategoryDonutChart";
import styles from "./page.module.css";
import formStyles from "@/components/form.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const defaults = currentMonthYear();
  const month = Number(params.month) || defaults.month;
  const year = Number(params.year) || defaults.year;
  const { start, end } = monthRange(month, year);

  const [accounts, monthTransactions, creditCards, budgets] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end }, ignored: false },
      include: { category: true, account: true, creditCard: true },
      orderBy: { date: "desc" },
    }),
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.budget.findMany({ where: { month, year }, include: { category: true } }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);

  const incomeTx = monthTransactions.filter((t) => t.type === "INCOME");
  const expenseTx = monthTransactions.filter((t) => t.type === "EXPENSE" || t.type === "CARD_EXPENSE");

  const incomeTotal = incomeTx.reduce((sum, t) => sum + toNumber(t.amount), 0);
  const expenseTotal = expenseTx.reduce((sum, t) => sum + toNumber(t.amount), 0);

  function groupByCategory(transactions: typeof monthTransactions): CategorySlice[] {
    const map = new Map<string, CategorySlice>();
    for (const t of transactions) {
      const key = t.category?.name ?? "Sem categoria";
      const color = t.category?.color ?? "#9aa5b1";
      const existing = map.get(key);
      if (existing) {
        existing.value += toNumber(t.amount);
      } else {
        map.set(key, { name: key, value: toNumber(t.amount), color });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }

  const expenseByCategory = groupByCategory(expenseTx);
  const incomeByCategory = groupByCategory(incomeTx);

  const cardSummaries = creditCards.map((card) => {
    const invoice = monthTransactions
      .filter((t) => t.type === "CARD_EXPENSE" && t.creditCardId === card.id)
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
    return { card, invoice };
  });

  const budgetSummaries = budgets.map((budget) => {
    const spent = expenseTx
      .filter((t) => t.categoryId === budget.categoryId)
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
    return { budget, spent };
  });

  const latestTransactions = monthTransactions.slice(0, 6);

  const needsOnboarding = accounts.length === 0 || creditCards.length === 0 || budgets.length === 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das suas finanças"
        actions={<MonthSwitcher month={month} year={year} />}
      />

      <div className={styles.summaryRow}>
        <SummaryCard label="Saldo atual" value={formatCurrency(totalBalance)} />
        <SummaryCard label="Receitas do mês" value={formatCurrency(incomeTotal)} tone="income" />
        <SummaryCard label="Despesas do mês" value={formatCurrency(expenseTotal)} tone="expense" />
      </div>

      {needsOnboarding ? (
        <div className={styles.onboarding}>
          <h3>Primeiros passos</h3>
          <p className={styles.onboardingSubtitle}>Comece a organizar a sua vida financeira por aqui</p>
          <div className={styles.onboardingList}>
            {accounts.length === 0 ? (
              <Link href="/contas" className={styles.onboardingItem}>
                Cadastre uma conta bancária
              </Link>
            ) : null}
            {creditCards.length === 0 ? (
              <Link href="/cartoes-credito" className={styles.onboardingItem}>
                Cadastre um cartão de crédito
              </Link>
            ) : null}
            {budgets.length === 0 ? (
              <Link href="/planejamento" className={styles.onboardingItem}>
                Definir meu planejamento
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Balanço mensal</h3>
          {incomeTotal === 0 && expenseTotal === 0 ? (
            <EmptyState
              title="Opa! Você ainda não possui transações cadastradas em seu balanço mensal."
              description="Que tal começar adicionando suas despesas e receitas este mês?"
            />
          ) : (
            <BalanceBarChart income={incomeTotal} expense={expenseTotal} />
          )}
        </div>

        <div className={styles.card}>
          <h3>Despesas por categoria</h3>
          {expenseByCategory.length === 0 ? (
            <EmptyState title="Opa! Você ainda não possui despesas neste mês" />
          ) : (
            <CategoryDonutChart data={expenseByCategory} />
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3>Receitas por categoria</h3>
          {incomeByCategory.length === 0 ? (
            <EmptyState title="Opa! Você ainda não possui receitas este mês." />
          ) : (
            <CategoryDonutChart data={incomeByCategory} />
          )}
        </div>

        <div className={styles.card}>
          <h3>Cartões de crédito</h3>
          {cardSummaries.length === 0 ? (
            <EmptyState
              title="Opa! Você ainda não possui cartões de crédito cadastrados."
              action={
                <Link href="/cartoes-credito" className={formStyles.btnPrimary}>
                  Adicionar cartões
                </Link>
              }
            />
          ) : (
            <ul className={styles.list}>
              {cardSummaries.map(({ card, invoice }) => (
                <li key={card.id} className={styles.listRow}>
                  <span className={styles.dot} style={{ background: card.color }} />
                  <span className={styles.listLabel}>{card.name}</span>
                  <span className={styles.listValue}>{formatCurrency(invoice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3>Planejamento mensal</h3>
        {budgetSummaries.length === 0 ? (
          <EmptyState
            title="Opa! Você ainda não possui um planejamento definido para este mês."
            action={
              <Link href="/planejamento" className={formStyles.btnPrimary}>
                Definir planejamento
              </Link>
            }
          />
        ) : (
          <ul className={styles.list}>
            {budgetSummaries.map(({ budget, spent }) => {
              const planned = toNumber(budget.plannedAmount);
              const pct = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0;
              return (
                <li key={budget.id} className={styles.budgetRow}>
                  <div className={styles.budgetLabelRow}>
                    <span>{budget.category.name}</span>
                    <span>
                      {formatCurrency(spent)} / {formatCurrency(planned)}
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${pct}%`,
                        background: spent > planned ? "var(--danger)" : "var(--primary)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h3>Últimas transações</h3>
        {latestTransactions.length === 0 ? (
          <EmptyState title="Opa! Você ainda não possui transações cadastradas em seu balanço mensal." />
        ) : (
          <table className={styles.table}>
            <tbody>
              {latestTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.description}</td>
                  <td>{t.category?.name ?? "—"}</td>
                  <td
                    className={
                      t.type === "INCOME"
                        ? styles.amountIncome
                        : t.type === "EXPENSE" || t.type === "CARD_EXPENSE"
                        ? styles.amountExpense
                        : undefined
                    }
                  >
                    {t.type === "INCOME" ? "+" : t.type === "TRANSFER" ? "" : "-"}
                    {formatCurrency(toNumber(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
