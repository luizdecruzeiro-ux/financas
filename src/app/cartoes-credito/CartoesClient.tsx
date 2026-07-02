"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreditCardView as CreditCard, AccountView as Account } from "@/types";
import { deleteCreditCard } from "@/app/actions/creditCards";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import CreditCardForm from "./CreditCardForm";
import formStyles from "@/components/form.module.css";
import styles from "./cartoes.module.css";

type CardSummary = {
  cardId: string;
  month: number;
  year: number;
  currentInvoiceTotal: number;
  availableLimit: number;
  dueDate: string;
  open: boolean;
};

export default function CartoesClient({
  creditCards,
  accounts,
  summaries,
}: {
  creditCards: CreditCard[];
  accounts: Account[];
  summaries: CardSummary[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(card: CreditCard) {
    setEditing(card);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cartão? As transações vinculadas perderão a referência.")) return;
    await deleteCreditCard(id);
    router.refresh();
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={formStyles.btnPrimary} onClick={openCreate}>
          Novo cartão
        </button>
      </div>

      {creditCards.length === 0 ? (
        <EmptyState
          title="Cadastre um cartão de crédito"
          description="Comece a organizar a sua vida financeira por aqui"
        />
      ) : (
        <div className={styles.grid}>
          {creditCards.map((card) => {
            const summary = summaries.find((s) => s.cardId === card.id);
            const limit = toNumber(card.limit);
            const usedPct = summary && limit > 0 ? Math.min(100, Math.max(0, ((limit - summary.availableLimit) / limit) * 100)) : 0;

            return (
              <div key={card.id} className={styles.card} style={{ borderTopColor: card.color }}>
                <div className={styles.cardHeader}>
                  <span className={styles.name}>{card.name}</span>
                  {summary ? (
                    <span className={summary.open ? styles.badgeOpen : styles.badgeClosed}>
                      {summary.open ? "Fatura aberta" : "Fatura fechada"}
                    </span>
                  ) : null}
                </div>

                {summary ? (
                  <>
                    <p className={styles.invoiceTotal}>{formatCurrency(summary.currentInvoiceTotal)}</p>
                    <p className={styles.days}>Vence em {formatDate(summary.dueDate)}</p>

                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${usedPct}%` }} />
                    </div>
                    <p className={styles.availableLimit}>
                      Limite disponível: {formatCurrency(summary.availableLimit)} / {formatCurrency(limit)}
                    </p>
                  </>
                ) : null}

                <div className={styles.cardActions}>
                  <Link href={`/cartoes-credito/${card.id}`} className={styles.linkBtn}>
                    Ver fatura
                  </Link>
                  <button type="button" onClick={() => openEdit(card)} className={styles.linkBtn}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(card.id)} className={styles.linkBtnDanger}>
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <Modal title={editing ? "Editar cartão" : "Novo cartão"} onClose={closeModal}>
          <CreditCardForm creditCard={editing} accounts={accounts} onDone={closeModal} />
        </Modal>
      ) : null}
    </div>
  );
}
