import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  currentInvoiceMonthYear,
  formatCurrency,
  formatDate,
  invoiceRange,
  isInvoiceOpen,
  monthName,
  toNumber,
} from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import MonthSwitcher from "@/components/MonthSwitcher";
import EmptyState from "@/components/EmptyState";
import FaturaActions from "./FaturaActions";
import styles from "./fatura.module.css";

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

  const transactions = await prisma.transaction.findMany({
    where: { creditCardId: id, type: "CARD_EXPENSE", date: { gte: start, lt: end } },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const total = transactions.reduce((sum, t) => sum + toNumber(t.amount), 0);
  const hasPending = transactions.some((t) => t.status === "PENDING");
  const open = isInvoiceOpen(end);

  const dueDay = Math.min(card.dueDay, 28);
  const dueDate = new Date(Date.UTC(year, month - 1, dueDay));

  return (
    <div>
      <PageHeader
        title={`Fatura — ${card.name}`}
        subtitle={`Limite de ${formatCurrency(toNumber(card.limit))}`}
        actions={<MonthSwitcher month={month} year={year} />}
      />

      <div className={styles.card}>
        <div className={styles.totalRow}>
          <div>
            <span>Total da fatura</span>
            <span className={open ? styles.badgeOpen : styles.badgeClosed}>
              {open ? "Fatura aberta" : "Fatura fechada"}
            </span>
          </div>
          <span className={styles.total}>{formatCurrency(total)}</span>
        </div>
        <p className={styles.dueDate}>
          {monthName(month)}/{year} · vence em {formatDate(dueDate)}
        </p>

        {transactions.length === 0 ? (
          <EmptyState title="Nenhum lançamento neste cartão para a fatura selecionada." />
        ) : (
          <>
            <table className={styles.table}>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.description}</td>
                    <td>{t.category?.name ?? "—"}</td>
                    <td className={styles.amount}>{formatCurrency(toNumber(t.amount))}</td>
                    <td>
                      <span className={t.status === "PAID" ? styles.paid : styles.pending}>
                        {t.status === "PAID" ? "Paga" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasPending ? <FaturaActions creditCardId={id} month={month} year={year} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
