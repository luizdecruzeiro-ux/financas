"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { payInvoice } from "@/app/actions/creditCards";
import formStyles from "@/components/form.module.css";

export default function FaturaActions({
  creditCardId,
  month,
  year,
}: {
  creditCardId: string;
  month: number;
  year: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handlePay() {
    if (!confirm("Marcar toda a fatura deste mês como paga?")) return;
    setSaving(true);
    try {
      await payInvoice(creditCardId, month, year);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
      <button type="button" className={formStyles.btnPrimary} onClick={handlePay} disabled={saving}>
        {saving ? "Processando..." : "Marcar fatura como paga"}
      </button>
    </div>
  );
}
