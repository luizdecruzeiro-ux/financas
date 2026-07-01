"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountView as Account } from "@/types";
import { formatCurrency, toNumber } from "@/lib/utils";
import { deleteAccount } from "@/app/actions/accounts";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import AccountForm from "./AccountForm";
import formStyles from "@/components/form.module.css";
import styles from "./contas.module.css";

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  WALLET: "Carteira",
  INVESTMENT: "Investimento",
};

export default function ContasClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta? As transações vinculadas perderão a referência.")) return;
    await deleteAccount(id);
    router.refresh();
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={formStyles.btnPrimary} onClick={openCreate}>
          Nova conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Cadastre uma conta bancária"
          description="Comece a organizar a sua vida financeira por aqui"
        />
      ) : (
        <div className={styles.grid}>
          {accounts.map((account) => (
            <div key={account.id} className={styles.card} style={{ borderTopColor: account.color }}>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{account.name}</span>
                <span className={styles.type}>{TYPE_LABELS[account.type] ?? account.type}</span>
              </div>
              {account.institution ? <p className={styles.institution}>{account.institution}</p> : null}
              <p className={styles.balance}>{formatCurrency(toNumber(account.balance))}</p>
              <div className={styles.cardActions}>
                <button type="button" onClick={() => openEdit(account)} className={styles.linkBtn}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(account.id)} className={styles.linkBtnDanger}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <Modal title={editing ? "Editar conta" : "Nova conta"} onClose={closeModal}>
          <AccountForm account={editing} onDone={closeModal} />
        </Modal>
      ) : null}
    </div>
  );
}
