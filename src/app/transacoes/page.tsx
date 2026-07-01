import { prisma } from "@/lib/prisma";
import { currentMonthYear, monthRange } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import MonthSwitcher from "@/components/MonthSwitcher";
import TransacoesClient from "./TransacoesClient";
import type { Prisma } from "@/generated/prisma/client";
import { serializeAccount, serializeCreditCard, type TransactionView } from "@/types";

export const dynamic = "force-dynamic";

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; categoryId?: string; accountId?: string; type?: string }>;
}) {
  const query = await searchParams;
  const defaults = currentMonthYear();
  const month = Number(query.month) || defaults.month;
  const year = Number(query.year) || defaults.year;
  const { start, end } = monthRange(month, year);

  const where: Prisma.TransactionWhereInput = { date: { gte: start, lt: end } };
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.accountId) where.accountId = query.accountId;
  if (query.type) where.type = query.type as Prisma.TransactionWhereInput["type"];

  const [transactions, categories, accounts, creditCards] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true, toAccount: true, creditCard: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedAccounts = accounts.map(serializeAccount);
  const serializedCreditCards = creditCards.map(serializeCreditCard);

  const serializedTransactions: TransactionView[] = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: t.account ? serializeAccount(t.account) : null,
    toAccount: t.toAccount ? serializeAccount(t.toAccount) : null,
    creditCard: t.creditCard ? serializeCreditCard(t.creditCard) : null,
  }));

  return (
    <div>
      <PageHeader
        title="Transações"
        subtitle="Receitas, despesas, transferências e faturas de cartão"
        actions={<MonthSwitcher month={month} year={year} />}
      />
      <TransacoesClient
        transactions={serializedTransactions}
        categories={categories}
        accounts={serializedAccounts}
        creditCards={serializedCreditCards}
        filters={{ categoryId: query.categoryId, accountId: query.accountId, type: query.type }}
      />
    </div>
  );
}
