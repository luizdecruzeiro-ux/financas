"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import { createCategory, updateCategory, type CategoryInput } from "@/app/actions/categories";
import formStyles from "@/components/form.module.css";

const COLOR_OPTIONS = [
  "#2E7D6B",
  "#3FA796",
  "#D9773C",
  "#C2542E",
  "#A63D3D",
  "#B23A5C",
  "#8B5CF6",
  "#D9B043",
  "#C77DB1",
  "#5C6BC0",
];

export default function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState(category?.type ?? "EXPENSE");
  const [color, setColor] = useState(category?.color ?? COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome para a categoria.");
      return;
    }
    setSaving(true);
    setError(null);
    const input: CategoryInput = {
      name: name.trim(),
      type: type as CategoryInput["type"],
      icon: category?.icon ?? "tag",
      color,
    };
    try {
      if (category) {
        await updateCategory(category.id, input);
      } else {
        await createCategory(input);
      }
      router.refresh();
      onDone();
    } catch {
      setError("Não foi possível salvar a categoria. Verifique se o nome já existe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label htmlFor="name">Nome</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" />
      </div>

      <div className={formStyles.field}>
        <label htmlFor="type">Tipo</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value as CategoryInput["type"])}>
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
      </div>

      <div className={formStyles.field}>
        <label>Cor</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COLOR_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: c,
                border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                cursor: "pointer",
              }}
              aria-label={`Selecionar cor ${c}`}
            />
          ))}
        </div>
      </div>

      {error ? <p className={formStyles.error}>{error}</p> : null}

      <div className={formStyles.actions}>
        <button type="button" className={formStyles.btnSecondary} onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className={formStyles.btnPrimary} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
