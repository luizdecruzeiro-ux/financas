import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import CartoesClient from "./CartoesClient";
import { serializeAccount, serializeCreditCard } from "@/types";
import { currentInvoiceMonthYear, invoiceRange, isInvoiceOpen, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CartoesCreditoPage() {
  const [creditCards, accounts] = await Promise.all([
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const summaries = await Promise.all(
    creditCards.map(async (card) => {
      const { month, year } = currentInvoiceMonthYear(card.closingDay);
      const { start, end } = invoiceRange(month, year, card.closingDay);

      const [currentInvoiceTx, pendingTx] = await Promise.all([
        prisma.transaction.findMany({
          where: { creditCardId: card.id, type: "CARD_EXPENSE", date: { gte: start, lt: end } },
        }),
        prisma.transaction.findMany({
          where: { creditCardId: card.id, type: "CARD_EXPENSE", status: "PENDING" },
        }),
      ]);

      const currentInvoiceTotal = currentInvoiceTx.reduce((sum, t) => sum + toNumber(t.amount), 0);
      const limitUsed = pendingTx.reduce((sum, t) => sum + toNumber(t.amount), 0);
      const dueDay = Math.min(card.dueDay, 28);

      return {
        cardId: card.id,
        month,
        year,
        currentInvoiceTotal,
        availableLimit: toNumber(card.limit) - limitUsed,
        dueDate: new Date(Date.UTC(year, month - 1, dueDay)).toISOString(),
        open: isInvoiceOpen(end),
      };
    })
  );

  return (
    <div>
      <PageHeader title="Cartões de crédito" subtitle="Gerencie seus cartões e acompanhe as faturas" />
      <CartoesClient
        creditCards={creditCards.map(serializeCreditCard)}
        accounts={accounts.map(serializeAccount)}
        summaries={summaries}
      />
    </div>
  );
}
