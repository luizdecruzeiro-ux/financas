"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import type { AccountView as Account } from "@/types";

const TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "INCOME", label: "Receita" },
  { value: "EXPENSE", label: "Despesa" },
  { value: "CARD_EXPENSE", label: "Despesa cartão" },
  { value: "TRANSFER", label: "Transferência" },
];

export default function FilterBar({
  categories,
  accounts,
  filters,
}: {
  categories: Category[];
  accounts: Account[];
  filters: { categoryId?: string; accountId?: string; type?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <select
        value={filters.type ?? ""}
        onChange={(e) => update("type", e.target.value)}
        style={{ minWidth: 160, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.categoryId ?? ""}
        onChange={(e) => update("categoryId", e.target.value)}
        style={{ minWidth: 160, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}
      >
        <option value="">Todas as categorias</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={filters.accountId ?? ""}
        onChange={(e) => update("accountId", e.target.value)}
        style={{ minWidth: 160, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}
      >
        <option value="">Todas as contas</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
