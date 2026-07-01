"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Category } from "@/generated/prisma/client";
import type { AccountView as Account, CreditCardView as CreditCard, TransactionView } from "@/types";
import { deleteTransaction, toggleTransactionPaid } from "@/app/actions/transactions";
import { formatCurrency, formatDate, isOverdue, toNumber } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import FilterBar from "./FilterBar";
import TransactionForm from "./TransactionForm";
import formStyles from "@/components/form.module.css";
import styles from "./transacoes.module.css";

type TransactionWithRelations = TransactionView;

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  CARD_EXPENSE: "Despesa cartão",
  TRANSFER: "Transferência",
};

export default function TransacoesClient({
  transactions,
  categories,
  accounts,
  creditCards,
  filters,
}: {
  transactions: TransactionWithRelations[];
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  filters: { categoryId?: string; accountId?: string; type?: string };
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: TransactionWithRelations) {
    setEditing(t);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await deleteTransaction(id);
    router.refresh();
  }

  async function handleTogglePaid(id: string) {
    await toggleTransactionPaid(id);
    router.refresh();
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <FilterBar categories={categories} accounts={accounts} filters={filters} />
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/transacoes/importar" className={formStyles.btnSecondary}>
            Importar extrato
          </Link>
          <button type="button" className={formStyles.btnPrimary} onClick={openCreate}>
            Nova transação
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="Opa! Você ainda não possui transações cadastradas em seu balanço mensal."
          description="Que tal começar adicionando suas despesas e receitas este mês?"
          action={
            <button type="button" className={formStyles.btnPrimary} onClick={openCreate}>
              Nova transação
            </button>
          }
        />
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th>Valor</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const overdue = isOverdue(t.date, t.status);
                const statusClass = t.status === "PAID" ? styles.paid : overdue ? styles.overdue : styles.pending;
                const statusLabel = t.status === "PAID" ? "Paga" : overdue ? "Vencida" : "Pendente";
                return (
                <tr key={t.id} className={t.ignored ? styles.ignoredRow : undefined}>
                  <td>{formatDate(t.date)}</td>
                  <td>
                    {t.description}
                    {t.ignored ? <span className={styles.ignoredTag}>Ignorada</span> : null}
                  </td>
                  <td>{TYPE_LABELS[t.type]}</td>
                  <td>{t.category?.name ?? "—"}</td>
                  <td>
                    {t.type === "TRANSFER"
                      ? `${t.account?.name ?? "—"} → ${t.toAccount?.name ?? "—"}`
                      : t.type === "CARD_EXPENSE"
                      ? t.creditCard?.name ?? "—"
                      : t.account?.name ?? "—"}
                  </td>
                  <td
                    className={
                      t.type === "INCOME"
                        ? styles.amountIncome
                        : t.type === "TRANSFER"
                        ? undefined
                        : styles.amountExpense
                    }
                  >
                    {t.type === "INCOME" ? "+" : t.type === "TRANSFER" ? "" : "-"}
                    {formatCurrency(toNumber(t.amount))}
                  </td>
                  <td>
                    {t.type === "TRANSFER" ? (
                      <span className={styles.paid}>Paga</span>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.statusBtn} ${statusClass}`}
                        onClick={() => handleTogglePaid(t.id)}
                        title="Clique para alternar entre paga e pendente"
                      >
                        {statusLabel}
                      </button>
                    )}
                  </td>
                  <td className={styles.actions}>
                    <button type="button" onClick={() => openEdit(t)} className={styles.linkBtn}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(t.id)} className={styles.linkBtnDanger}>
                      Excluir
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <Modal title={editing ? "Editar transação" : "Nova transação"} onClose={closeModal}>
          <TransactionForm
            transaction={editing}
            categories={categories}
            accounts={accounts}
            creditCards={creditCards}
            onDone={closeModal}
          />
        </Modal>
      ) : null}
    </div>
  );
}
