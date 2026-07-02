"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import type { AccountView as Account, CreditCardView as CreditCard, TransactionView } from "@/types";
import { createTransaction, updateTransaction, type TransactionInput } from "@/app/actions/transactions";
import { uploadTransactionAttachment } from "@/app/actions/attachments";
import { toNumber, type RepeatUnit } from "@/lib/utils";
import formStyles from "@/components/form.module.css";
import styles from "./TransactionForm.module.css";

type TransactionWithRelations = TransactionView;

const TYPE_OPTIONS = [
  { value: "INCOME", label: "Receita" },
  { value: "EXPENSE", label: "Despesa" },
  { value: "CARD_EXPENSE", label: "Despesa cartão" },
  { value: "TRANSFER", label: "Transferência" },
];

// "Despesa/Receita fixa" gera lançamentos mensais pelos próximos 2 anos de
// uma vez — não existe recorrência "infinita" no modelo atual, cada ocorrência
// é uma linha própria. Passado esse prazo, um novo lançamento fixo pode ser criado.
const FIXED_MONTHS = 24;

const REPEAT_UNIT_OPTIONS: { value: RepeatUnit; label: string }[] = [
  { value: "day", label: "Diária" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "year", label: "Anual" },
];

// For existing transactions, `date` is stored as UTC midnight representing the
// calendar day, so reading it back in UTC round-trips correctly. For a brand
// new transaction we build the input value from local date parts instead, so
// "today" matches the user's calendar day even close to midnight.
function toDateInputValue(date: Date, useUTC: boolean): string {
  const y = useUTC ? date.getUTCFullYear() : date.getFullYear();
  const m = useUTC ? date.getUTCMonth() : date.getMonth();
  const d = useUTC ? date.getUTCDate() : date.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function yesterdayInputValue(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateInputValue(d, false);
}

export default function TransactionForm({
  transaction,
  categories,
  accounts,
  creditCards,
  onDone,
}: {
  transaction: TransactionWithRelations | null;
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState(transaction?.type ?? "EXPENSE");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(transaction ? String(toNumber(transaction.amount)) : "");
  const [date, setDate] = useState(
    transaction ? toDateInputValue(new Date(transaction.date), true) : toDateInputValue(new Date(), false)
  );
  const [dateMode, setDateMode] = useState<"hoje" | "ontem" | "outros">(transaction ? "outros" : "hoje");
  const [paid, setPaid] = useState(transaction ? transaction.status === "PAID" : true);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId ?? "");
  const [creditCardId, setCreditCardId] = useState(transaction?.creditCardId ?? "");
  const [installments, setInstallments] = useState("1");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState(transaction?.tags?.join(", ") ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [isFixed, setIsFixed] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatCount, setRepeatCount] = useState("2");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("month");
  const [ignored, setIgnored] = useState(transaction?.ignored ?? false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantCategories = useMemo(() => {
    const categoryType = type === "INCOME" ? "INCOME" : "EXPENSE";
    return categories.filter((c) => c.type === categoryType);
  }, [categories, type]);

  function pickDate(mode: "hoje" | "ontem") {
    setDateMode(mode);
    setDate(mode === "hoje" ? toDateInputValue(new Date(), false) : yesterdayInputValue());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) {
      setError("Informe descrição e valor válidos.");
      return;
    }
    if (type === "TRANSFER" && (!accountId || !toAccountId)) {
      setError("Selecione a conta de origem e destino.");
      return;
    }
    if (type === "TRANSFER" && accountId === toAccountId) {
      setError("As contas de origem e destino devem ser diferentes.");
      return;
    }
    if (type === "CARD_EXPENSE" && !creditCardId) {
      setError("Selecione o cartão de crédito.");
      return;
    }
    if ((type === "INCOME" || type === "EXPENSE") && !accountId) {
      setError("Selecione a conta.");
      return;
    }

    setSaving(true);
    setError(null);

    let attachmentUrl = transaction?.attachmentUrl ?? null;
    if (attachmentFile) {
      const formData = new FormData();
      formData.set("file", attachmentFile);
      const uploadResult = await uploadTransactionAttachment(formData);
      if ("error" in uploadResult) {
        setError(uploadResult.error);
        setSaving(false);
        return;
      }
      attachmentUrl = uploadResult.url;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const input: TransactionInput = {
      description: description.trim(),
      amount: Number(amount),
      date,
      type: type as TransactionInput["type"],
      // Card expenses are settled via payInvoice, so a new one starts PENDING;
      // when editing, keep whatever status it already has (an already-paid
      // charge must not silently go back to pending).
      status:
        type === "CARD_EXPENSE"
          ? transaction?.type === "CARD_EXPENSE"
            ? transaction.status
            : "PENDING"
          : type === "TRANSFER"
          ? "PAID"
          : paid
          ? "PAID"
          : "PENDING",
      accountId: type === "CARD_EXPENSE" ? null : accountId || null,
      toAccountId: type === "TRANSFER" ? toAccountId || null : null,
      creditCardId: type === "CARD_EXPENSE" ? creditCardId || null : null,
      categoryId: type === "TRANSFER" ? null : categoryId || null,
      installments: type === "CARD_EXPENSE" ? Math.max(1, Number(installments) || 1) : 1,
      repeatCount: !transaction
        ? isFixed
          ? FIXED_MONTHS
          : repeatEnabled && type !== "CARD_EXPENSE"
          ? Math.max(1, Number(repeatCount) || 1)
          : 1
        : 1,
      repeatUnit: isFixed ? "month" : repeatUnit,
      suppressOccurrenceLabel: isFixed,
      isRecurring: isFixed || repeatEnabled,
      ignored,
      tags,
      note: note.trim() || null,
      attachmentUrl,
    };

    try {
      if (transaction) {
        await updateTransaction(transaction.id, input);
      } else {
        await createTransaction(input);
      }
      router.refresh();
      onDone();
    } catch {
      setError("Não foi possível salvar a transação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={formStyles.field}>
        <label htmlFor="type">Tipo</label>
        <select
          id="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionInput["type"]);
            setCategoryId("");
          }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={formStyles.field}>
        <label htmlFor="amount">{type === "CARD_EXPENSE" && Number(installments) > 1 ? "Valor total" : "Valor"}</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={styles.amountInput}
        />
      </div>

      {type === "INCOME" || type === "EXPENSE" ? (
        <div className={styles.toggleRow}>
          <span>{type === "INCOME" ? "Foi recebida" : "Foi paga"}</span>
          <button
            type="button"
            className={paid ? styles.toggleOn : styles.toggleOff}
            onClick={() => setPaid((p) => !p)}
            aria-pressed={paid}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      ) : null}

      <div className={formStyles.field}>
        <label>Data</label>
        <div className={styles.dateShortcuts}>
          <button
            type="button"
            className={dateMode === "hoje" ? styles.chipActive : styles.chip}
            onClick={() => pickDate("hoje")}
          >
            Hoje
          </button>
          <button
            type="button"
            className={dateMode === "ontem" ? styles.chipActive : styles.chip}
            onClick={() => pickDate("ontem")}
          >
            Ontem
          </button>
          <button
            type="button"
            className={dateMode === "outros" ? styles.chipActive : styles.chip}
            onClick={() => setDateMode("outros")}
          >
            Outros...
          </button>
        </div>
        {dateMode === "outros" ? (
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </div>

      <div className={formStyles.field}>
        <label htmlFor="description">Descrição</label>
        <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {type !== "TRANSFER" ? (
        <div className={formStyles.field}>
          <label htmlFor="category">Categoria</label>
          <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {type === "INCOME" || type === "EXPENSE" ? (
        <div className={formStyles.field}>
          <label htmlFor="account">Conta</label>
          <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Selecione</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {type === "TRANSFER" ? (
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="fromAccount">De</label>
            <select id="fromAccount" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="toAccount">Para</label>
            <select id="toAccount" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {type === "CARD_EXPENSE" ? (
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="creditCard">Cartão</label>
            <select id="creditCard" value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)}>
              <option value="">Selecione</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!transaction ? (
            <div className={formStyles.field}>
              <label htmlFor="installments">Parcelas</label>
              <input
                id="installments"
                type="number"
                min={1}
                max={48}
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="button" className={styles.detailsToggle} onClick={() => setDetailsOpen((v) => !v)}>
        {detailsOpen ? "Menos detalhes ‹" : "Mais detalhes ›"}
      </button>

      {detailsOpen ? (
        <div className={styles.detailsSection}>
          <div className={formStyles.field}>
            <label htmlFor="tags">Tags (separadas por vírgula)</label>
            <input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: viagem, trabalho"
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="note">Observação</label>
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {!transaction && (type === "INCOME" || type === "EXPENSE") ? (
            <>
              <div className={styles.toggleRow}>
                <span>{type === "INCOME" ? "Receita fixa" : "Despesa fixa"}</span>
                <button
                  type="button"
                  className={isFixed ? styles.toggleOn : styles.toggleOff}
                  onClick={() => setIsFixed((v) => !v)}
                  aria-pressed={isFixed}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
              {isFixed ? (
                <p className={styles.hint}>Repete todo mês pelos próximos {FIXED_MONTHS} meses.</p>
              ) : null}
            </>
          ) : null}

          {!transaction && !isFixed && type !== "CARD_EXPENSE" ? (
            <>
              <div className={styles.toggleRow}>
                <span>Repetir</span>
                <button
                  type="button"
                  className={repeatEnabled ? styles.toggleOn : styles.toggleOff}
                  onClick={() => setRepeatEnabled((v) => !v)}
                  aria-pressed={repeatEnabled}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
              {repeatEnabled ? (
                <div className={formStyles.row}>
                  <div className={formStyles.field}>
                    <label htmlFor="repeatCount">Vezes</label>
                    <input
                      id="repeatCount"
                      type="number"
                      min={2}
                      max={60}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(e.target.value)}
                    />
                  </div>
                  <div className={formStyles.field}>
                    <label htmlFor="repeatUnit">Frequência</label>
                    <select
                      id="repeatUnit"
                      value={repeatUnit}
                      onChange={(e) => setRepeatUnit(e.target.value as RepeatUnit)}
                    >
                      {REPEAT_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className={styles.toggleRow}>
            <span>Ignorar transação</span>
            <button
              type="button"
              className={ignored ? styles.toggleOn : styles.toggleOff}
              onClick={() => setIgnored((v) => !v)}
              aria-pressed={ignored}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="attachment">Anexar arquivo</label>
            <input
              id="attachment"
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
            />
            {transaction?.attachmentUrl && !attachmentFile ? (
              <a href={transaction.attachmentUrl} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                Ver anexo atual
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

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
