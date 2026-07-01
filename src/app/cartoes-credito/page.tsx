import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import CartoesClient from "./CartoesClient";
import { serializeAccount, serializeCreditCard } from "@/types";

export const dynamic = "force-dynamic";

export default async function CartoesCreditoPage() {
  const [creditCards, accounts] = await Promise.all([
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Cartões de crédito" subtitle="Gerencie seus cartões e acompanhe as faturas" />
      <CartoesClient creditCards={creditCards.map(serializeCreditCard)} accounts={accounts.map(serializeAccount)} />
    </div>
  );
}
