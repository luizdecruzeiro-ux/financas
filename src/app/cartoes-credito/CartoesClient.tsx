"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreditCardView as CreditCard, AccountView as Account } from "@/types";
import { deleteCreditCard } from "@/app/actions/creditCards";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import CreditCardForm from "./CreditCardForm";
import formStyles from "@/components/form.module.css";
import styles from "./cartoes.module.css";

export default function CartoesClient({
  creditCards,
  accounts,
}: {
  creditCards: CreditCard[];
  accounts: Account[];
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
          {creditCards.map((card) => (
            <div key={card.id} className={styles.card} style={{ borderTopColor: card.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{card.name}</span>
              </div>
              <p className={styles.limit}>Limite: {Number(card.limit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className={styles.days}>
                Fecha dia {card.closingDay} · Vence dia {card.dueDay}
              </p>
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
          ))}
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
