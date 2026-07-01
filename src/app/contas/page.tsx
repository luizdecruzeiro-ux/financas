import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ContasClient from "./ContasClient";
import { serializeAccount } from "@/types";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader title="Contas" subtitle="Gerencie suas contas bancárias e carteiras" />
      <ContasClient accounts={accounts.map(serializeAccount)} />
    </div>
  );
}
