"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import type { BudgetView as Budget } from "@/types";
import { upsertBudget, deleteBudget } from "@/app/actions/budgets";
import { formatCurrency } from "@/lib/utils";
import formStyles from "@/components/form.module.css";
import styles from "./planejamento.module.css";

type Row = { category: Category; budget: Budget | null; spent: number };

export default function PlanejamentoClient({ rows, month, year }: { rows: Row[]; month: number; year: number }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(row: Row) {
    setEditingId(row.category.id);
    setValue(row.budget ? String(Number(row.budget.plannedAmount)) : "");
  }

  async function save(categoryId: string) {
    const amount = Number(value);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await upsertBudget({ categoryId, month, year, plannedAmount: amount });
      router.refresh();
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(budgetId: string) {
    if (!confirm("Remover o planejamento desta categoria?")) return;
    await deleteBudget(budgetId);
    router.refresh();
  }

  return (
    <div className={styles.card}>
      {rows.map((row) => {
        const planned = row.budget ? Number(row.budget.plannedAmount) : 0;
        const pct = planned > 0 ? Math.min(100, (row.spent / planned) * 100) : 0;
        const isEditing = editingId === row.category.id;

        return (
          <div key={row.category.id} className={styles.row}>
            <div className={styles.rowHeader}>
              <span className={styles.dot} style={{ background: row.category.color }} />
              <span className={styles.categoryName}>{row.category.name}</span>
              {isEditing ? (
                <div className={styles.editInline}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={formStyles.btnPrimary}
                    onClick={() => save(row.category.id)}
                    disabled={saving}
                  >
                    Salvar
                  </button>
                  <button type="button" className={formStyles.btnSecondary} onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className={styles.rowActions}>
                  <span className={styles.values}>
                    {formatCurrency(row.spent)} / {row.budget ? formatCurrency(planned) : "não definido"}
                  </span>
                  <button type="button" className={styles.linkBtn} onClick={() => startEdit(row)}>
                    {row.budget ? "Editar" : "Definir"}
                  </button>
                  {row.budget ? (
                    <button type="button" className={styles.linkBtnDanger} onClick={() => remove(row.budget!.id)}>
                      Remover
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {row.budget ? (
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${pct}%`,
                    background: row.spent > planned ? "var(--danger)" : "var(--primary)",
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
