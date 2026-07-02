import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentInvoiceMonthYear, invoiceRange, isInvoiceOpen, toNumber } from "@/lib/utils";
import { serializeAccount, serializeCreditCard, type TransactionView } from "@/types";
import PageHeader from "@/components/PageHeader";
import FaturaClient from "./FaturaClient";

export const dynamic = "force-dynamic";

export default async function FaturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const card = await prisma.creditCard.findUnique({ where: { id } });
  if (!card) notFound();

  const defaults = currentInvoiceMonthYear(card.closingDay);
  const month = Number(query.month) || defaults.month;
  const year = Number(query.year) || defaults.year;
  const { start, end } = invoiceRange(month, year, card.closingDay);

  const [transactions, categories, accounts, creditCards] = await Promise.all([
    prisma.transaction.findMany({
      where: { creditCardId: id, type: "CARD_EXPENSE", date: { gte: start, lt: end } },
      include: { category: true, account: true, toAccount: true, creditCard: true },
      orderBy: { date: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedTransactions: TransactionView[] = transactions.map((t) => ({
    ...t,
    amount: toNumber(t.amount),
    account: t.account ? serializeAccount(t.account) : null,
    toAccount: t.toAccount ? serializeAccount(t.toAccount) : null,
    creditCard: t.creditCard ? serializeCreditCard(t.creditCard) : null,
  }));

  const total = serializedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const open = isInvoiceOpen(end);

  // Closing/due dates for the invoice labelled (month, year). Day is clamped
  // to 28 to avoid rolling over on short months.
  const closingDate = new Date(Date.UTC(year, month - 1, Math.min(card.closingDay, 28)));
  const dueDate = new Date(Date.UTC(year, month - 1, Math.min(card.dueDay, 28)));

  return (
    <div>
      <PageHeader
        title={`Fatura — ${card.name}`}
        subtitle={`Limite de ${toNumber(card.limit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
      />
      <FaturaClient
        creditCardId={id}
        month={month}
        year={year}
        transactions={serializedTransactions}
        categories={categories}
        accounts={accounts.map(serializeAccount)}
        creditCards={creditCards.map(serializeCreditCard)}
        total={total}
        open={open}
        closingDate={closingDate.toISOString()}
        dueDate={dueDate.toISOString()}
      />
    </div>
  );
}
