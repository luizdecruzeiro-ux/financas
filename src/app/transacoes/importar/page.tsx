import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ImportClient from "./ImportClient";
import { serializeAccount, serializeCreditCard } from "@/types";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const [accounts, creditCards, categories] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Importar extrato" subtitle="Importe lançamentos de um arquivo OFX, CSV ou Excel" />
      <ImportClient
        accounts={accounts.map(serializeAccount)}
        creditCards={creditCards.map(serializeCreditCard)}
        categories={categories}
      />
    </div>
  );
}
