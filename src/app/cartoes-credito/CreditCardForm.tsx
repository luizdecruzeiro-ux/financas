"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreditCardView as CreditCard, AccountView as Account } from "@/types";
import { createCreditCard, updateCreditCard, type CreditCardInput } from "@/app/actions/creditCards";
import formStyles from "@/components/form.module.css";

const COLOR_OPTIONS = ["#6D4AFF", "#2E7D6B", "#D9773C", "#C2542E", "#5C6BC0", "#B23A5C"];

export default function CreditCardForm({
  creditCard,
  accounts,
  onDone,
}: {
  creditCard: CreditCard | null;
  accounts: Account[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(creditCard?.name ?? "");
  const [limit, setLimit] = useState(creditCard ? String(Number(creditCard.limit)) : "");
  const [closingDay, setClosingDay] = useState(creditCard ? String(creditCard.closingDay) : "1");
  const [dueDay, setDueDay] = useState(creditCard ? String(creditCard.dueDay) : "10");
  const [paymentAccountId, setPaymentAccountId] = useState(creditCard?.paymentAccountId ?? "");
  const [color, setColor] = useState(creditCard?.color ?? COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !limit) {
      setError("Preencha nome e limite do cartão.");
      return;
    }
    setSaving(true);
    setError(null);
    const input: CreditCardInput = {
      name: name.trim(),
      limit: Number(limit),
      closingDay: Number(closingDay),
      dueDay: Number(dueDay),
      color,
      paymentAccountId: paymentAccountId || null,
    };
    try {
      if (creditCard) {
        await updateCreditCard(creditCard.id, input);
      } else {
        await createCreditCard(input);
      }
      router.refresh();
      onDone();
    } catch {
      setError("Não foi possível salvar o cartão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label htmlFor="name">Nome</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank Ultravioleta" />
      </div>

      <div className={formStyles.row}>
        <div className={formStyles.field}>
          <label htmlFor="limit">Limite</label>
          <input id="limit" type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <div className={formStyles.field}>
          <label htmlFor="closingDay">Dia de fechamento</label>
          <input
            id="closingDay"
            type="number"
            min={1}
            max={31}
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor="dueDay">Dia de vencimento</label>
          <input id="dueDay" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
      </div>

      <div className={formStyles.field}>
        <label htmlFor="paymentAccount">Conta para pagamento da fatura (opcional)</label>
        <select id="paymentAccount" value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>
          <option value="">Nenhuma</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
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
