"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/generated/prisma/client";
import type { AccountView, CreditCardView } from "@/types";
import { analyzeStatement, confirmImport, type ImportDestination, type PreviewRow } from "@/app/actions/import";
import { formatCurrency } from "@/lib/utils";
import formStyles from "@/components/form.module.css";
import styles from "./importar.module.css";

type EditableRow = PreviewRow & { checked: boolean; categoryId: string | null };

export default function ImportClient({
  accounts,
  creditCards,
  categories,
}: {
  accounts: AccountView[];
  creditCards: CreditCardView[];
  categories: Category[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [destinationKind, setDestinationKind] = useState<"account" | "creditCard">("account");
  const [destinationId, setDestinationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const destinationOptions = destinationKind === "account" ? accounts : creditCards;

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    if (!destinationId) {
      setError("Selecione a conta ou cartão de destino.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("destinationKind", destinationKind);
    formData.set("destinationId", destinationId);

    const response = await analyzeStatement(formData);
    setLoading(false);

    if ("error" in response) {
      setError(response.error);
      return;
    }

    setRows(
      response.rows.map((row) => ({
        ...row,
        checked: !row.duplicate,
        categoryId: row.suggestedCategoryId,
      }))
    );
    setStep("review");
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const relevantCategories = useMemo(
    () => (kind: "INCOME" | "EXPENSE") => categories.filter((c) => c.type === kind),
    [categories]
  );

  async function handleConfirm() {
    const selected = rows.filter((r) => r.checked);
    if (selected.length === 0) {
      setError("Marque ao menos uma transação para importar.");
      return;
    }

    setLoading(true);
    setError(null);

    const destination: ImportDestination =
      destinationKind === "account"
        ? { kind: "account", accountId: destinationId }
        : { kind: "creditCard", creditCardId: destinationId };

    const response = await confirmImport(
      selected.map((r) => ({ date: r.date, description: r.description, amount: r.amount, categoryId: r.categoryId })),
      destination
    );

    setLoading(false);
    setResult(response.imported);
    router.refresh();
  }

  if (result !== null) {
    return (
      <div className={styles.card}>
        <p className={styles.successMessage}>
          {result} transaç{result === 1 ? "ão importada" : "ões importadas"} com sucesso.
        </p>
        <div className={formStyles.actions} style={{ justifyContent: "flex-start" }}>
          <button type="button" className={formStyles.btnPrimary} onClick={() => router.push("/transacoes")}>
            Ver transações
          </button>
          <button
            type="button"
            className={formStyles.btnSecondary}
            onClick={() => {
              setResult(null);
              setStep("upload");
              setFile(null);
              setRows([]);
            }}
          >
            Importar outro arquivo
          </button>
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className={styles.card}>
        <form onSubmit={handleAnalyze}>
          <div className={formStyles.field}>
            <label>Origem</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row" }}>
                <input
                  type="radio"
                  name="destinationKind"
                  checked={destinationKind === "account"}
                  onChange={() => {
                    setDestinationKind("account");
                    setDestinationId("");
                  }}
                  style={{ width: "auto" }}
                />
                Conta bancária
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row" }}>
                <input
                  type="radio"
                  name="destinationKind"
                  checked={destinationKind === "creditCard"}
                  onChange={() => {
                    setDestinationKind("creditCard");
                    setDestinationId("");
                  }}
                  style={{ width: "auto" }}
                />
                Cartão de crédito
              </label>
            </div>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="destinationId">{destinationKind === "account" ? "Conta" : "Cartão"}</label>
            <select id="destinationId" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
              <option value="">Selecione</option>
              {destinationOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="file">Arquivo (.ofx, .csv, .xlsx, .xls)</label>
            <input
              id="file"
              type="file"
              accept=".ofx,.csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error ? <p className={formStyles.error}>{error}</p> : null}

          <div className={formStyles.actions} style={{ justifyContent: "flex-start" }}>
            <button type="submit" className={formStyles.btnPrimary} disabled={loading}>
              {loading ? "Analisando..." : "Analisar arquivo"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const duplicateCount = rows.filter((r) => r.duplicate).length;

  return (
    <div className={styles.card}>
      <p className={styles.summary}>
        {rows.length} transaç{rows.length === 1 ? "ão encontrada" : "ões encontradas"}
        {duplicateCount > 0 ? `, ${duplicateCount} possível(is) duplicata(s) (desmarcadas)` : ""}.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              <th>Data</th>
              <th>Descrição</th>
              <th>Valor</th>
              {destinationKind === "account" ? <th>Tipo</th> : null}
              <th>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const computedType = destinationKind === "creditCard" ? "EXPENSE" : row.amount < 0 ? "EXPENSE" : "INCOME";
              const rowCategories = relevantCategories(computedType);
              return (
                <tr key={index} className={row.duplicate ? styles.duplicateRow : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.checked}
                      onChange={(e) => updateRow(index, { checked: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(index, { date: e.target.value })}
                      className={styles.cellInput}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(index, { description: e.target.value })}
                      className={styles.cellInput}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(index, { amount: Number(e.target.value) })}
                      className={styles.cellInputSmall}
                    />
                    <span className={computedType === "INCOME" ? styles.amountIncome : styles.amountExpense}>
                      {formatCurrency(Math.abs(row.amount))}
                    </span>
                  </td>
                  {destinationKind === "account" ? (
                    <td>
                      <span className={computedType === "INCOME" ? styles.badgeIncome : styles.badgeExpense}>
                        {computedType === "INCOME" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                  ) : null}
                  <td>
                    <select
                      value={row.categoryId ?? ""}
                      onChange={(e) => updateRow(index, { categoryId: e.target.value || null })}
                      className={styles.cellInput}
                    >
                      <option value="">Sem categoria</option>
                      {rowCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? <p className={formStyles.error}>{error}</p> : null}

      <div className={formStyles.actions} style={{ justifyContent: "flex-start" }}>
        <button type="button" className={formStyles.btnSecondary} onClick={() => setStep("upload")}>
          Voltar
        </button>
        <button type="button" className={formStyles.btnPrimary} onClick={handleConfirm} disabled={loading}>
          {loading ? "Importando..." : "Confirmar importação"}
        </button>
      </div>
    </div>
  );
}
