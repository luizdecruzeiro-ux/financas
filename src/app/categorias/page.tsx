import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import CategoriasClient from "./CategoriasClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Categorias" subtitle="Organize suas receitas e despesas" />
      <CategoriasClient categories={categories} />
    </div>
  );
}
