"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountView as Account } from "@/types";
import { createAccount, updateAccount, type AccountInput } from "@/app/actions/accounts";
import { toNumber } from "@/lib/utils";
import formStyles from "@/components/form.module.css";

const TYPE_OPTIONS = [
  { value: "CHECKING", label: "Conta corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "WALLET", label: "Carteira" },
  { value: "INVESTMENT", label: "Investimento" },
];

const COLOR_OPTIONS = ["#2E7D6B", "#3FA796", "#6D4AFF", "#D9773C", "#C2542E", "#5C6BC0"];

export default function AccountForm({
  account,
  onDone,
}: {
  account: Account | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.type ?? "CHECKING");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [balance, setBalance] = useState(account ? String(toNumber(account.balance)) : "0");
  const [color, setColor] = useState(account?.color ?? COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome para a conta.");
      return;
    }
    setSaving(true);
    setError(null);
    const input: AccountInput = {
      name: name.trim(),
      type: type as AccountInput["type"],
      institution: institution.trim() || undefined,
      balance: Number(balance) || 0,
      color,
    };
    try {
      if (account) {
        await updateAccount(account.id, input);
      } else {
        await createAccount(input);
      }
      router.refresh();
      onDone();
    } catch {
      setError("Não foi possível salvar a conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label htmlFor="name">Nome</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" />
      </div>

      <div className={formStyles.row}>
        <div className={formStyles.field}>
          <label htmlFor="type">Tipo</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as AccountInput["type"])}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={formStyles.field}>
          <label htmlFor="balance">Saldo atual</label>
          <input
            id="balance"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
      </div>

      <div className={formStyles.field}>
        <label htmlFor="institution">Instituição (opcional)</label>
        <input
          id="institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="Ex: Banco do Brasil"
        />
      </div>

      <div className={formStyles.field}>
        <label>Cor</label>
        <div style={{ display: "flex", gap: 8 }}>
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
