"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import type { AccountView, CreditCardView, TransactionView } from "@/types";
import { deleteTransaction } from "@/app/actions/transactions";
import { payInvoice } from "@/app/actions/creditCards";
import { formatCurrency, formatDate, monthName } from "@/lib/utils";
import MonthSwitcher from "@/components/MonthSwitcher";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import TransactionForm from "@/app/transacoes/TransactionForm";
import formStyles from "@/components/form.module.css";
import styles from "./fatura.module.css";

export default function FaturaClient({
  creditCardId,
  month,
  year,
  transactions,
  categories,
  accounts,
  creditCards,
  total,
  open,
  closingDate,
  dueDate,
}: {
  creditCardId: string;
  month: number;
  year: number;
  transactions: TransactionView[];
  categories: Category[];
  accounts: AccountView[];
  creditCards: CreditCardView[];
  total: number;
  open: boolean;
  closingDate: string;
  dueDate: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TransactionView | null>(null);
  const [paying, setPaying] = useState(false);

  const hasPending = transactions.some((t) => t.status === "PENDING");

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await deleteTransaction(id);
    router.refresh();
  }

  async function handlePayInvoice() {
    if (!confirm("Marcar toda a fatura deste mês como paga?")) return;
    setPaying(true);
    try {
      await payInvoice(creditCardId, month, year);
      router.refresh();
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.switcherRow}>
          <MonthSwitcher month={month} year={year} />
        </div>

        {transactions.length === 0 ? (
          <EmptyState title="Nenhum lançamento neste cartão para a fatura selecionada." />
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span
                        className={t.status === "PAID" ? styles.situacaoPaid : styles.situacaoPending}
                        title={t.status === "PAID" ? "Paga" : "Pendente"}
                      />
                    </td>
                    <td>{formatDate(t.date)}</td>
                    <td>
                      <button type="button" className={styles.descriptionBtn} onClick={() => setEditing(t)}>
                        {t.description}
                      </button>
                    </td>
                    <td>
                      {t.category ? (
                        <span className={styles.categoryChip}>
                          <span className={styles.categoryDot} style={{ background: t.category.color }} />
                          {t.category.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={styles.amount}>{formatCurrency(t.amount)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => setEditing(t)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtnDanger}
                          onClick={() => handleDelete(t.id)}
                          aria-label="Excluir"
                          title="Excluir"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasPending ? (
              <div className={styles.payRow}>
                <button type="button" className={formStyles.btnPrimary} onClick={handlePayInvoice} disabled={paying}>
                  {paying ? "Processando..." : "Marcar fatura como paga"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Valor da fatura</span>
          <span className={styles.summaryValue}>{formatCurrency(total)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Status</span>
          <span className={styles.summaryValue}>{open ? "Fatura aberta" : "Fatura fechada"}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Dia de fechamento</span>
          <span className={styles.summaryValue}>
            {new Date(closingDate).getUTCDate()} de {monthName(month).toLowerCase()}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Data vencimento</span>
          <span className={styles.summaryValue}>
            {new Date(dueDate).getUTCDate()} de {monthName(month).toLowerCase()}
          </span>
        </div>
      </aside>

      {editing ? (
        <Modal title="Editar despesa" onClose={() => setEditing(null)}>
          <TransactionForm
            transaction={editing}
            categories={categories}
            accounts={accounts}
            creditCards={creditCards}
            onDone={() => setEditing(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
