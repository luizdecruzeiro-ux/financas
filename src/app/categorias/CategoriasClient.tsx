"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import { deleteCategory } from "@/app/actions/categories";
import Modal from "@/components/Modal";
import CategoryForm from "./CategoryForm";
import formStyles from "@/components/form.module.css";
import styles from "./categorias.module.css";

export default function CategoriasClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria? Transações e planejamentos vinculados perderão a categoria.")) return;
    await deleteCategory(id);
    router.refresh();
  }

  function renderGroup(title: string, items: Category[]) {
    return (
      <div className={styles.group}>
        <h3>{title}</h3>
        {items.length === 0 ? (
          <p className={styles.empty}>Nenhuma categoria cadastrada.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((c) => (
              <li key={c.id} className={styles.item}>
                <span className={styles.dot} style={{ background: c.color }} />
                <span className={styles.name}>{c.name}</span>
                <div className={styles.itemActions}>
                  <button type="button" className={styles.linkBtn} onClick={() => openEdit(c)}>
                    Editar
                  </button>
                  <button type="button" className={styles.linkBtnDanger} onClick={() => handleDelete(c.id)}>
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={formStyles.btnPrimary} onClick={openCreate}>
          Nova categoria
        </button>
      </div>

      <div className={styles.grid}>
        {renderGroup("Receitas", incomeCategories)}
        {renderGroup("Despesas", expenseCategories)}
      </div>

      {modalOpen ? (
        <Modal title={editing ? "Editar categoria" : "Nova categoria"} onClose={closeModal}>
          <CategoryForm category={editing} onDone={closeModal} />
        </Modal>
      ) : null}
    </div>
  );
}
