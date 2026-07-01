import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Salário", type: "INCOME" as const, icon: "wallet", color: "#2E7D6B" },
  { name: "Freelance", type: "INCOME" as const, icon: "briefcase", color: "#3FA796" },
  { name: "Investimentos", type: "INCOME" as const, icon: "trending-up", color: "#4C8577" },
  { name: "Outras receitas", type: "INCOME" as const, icon: "plus-circle", color: "#6BA292" },

  { name: "Alimentação", type: "EXPENSE" as const, icon: "utensils", color: "#D9773C" },
  { name: "Transporte", type: "EXPENSE" as const, icon: "car", color: "#C2542E" },
  { name: "Moradia", type: "EXPENSE" as const, icon: "home", color: "#A63D3D" },
  { name: "Saúde", type: "EXPENSE" as const, icon: "heart", color: "#B23A5C" },
  { name: "Educação", type: "EXPENSE" as const, icon: "book", color: "#8B5CF6" },
  { name: "Lazer", type: "EXPENSE" as const, icon: "smile", color: "#D9B043" },
  { name: "Compras", type: "EXPENSE" as const, icon: "shopping-bag", color: "#C77DB1" },
  { name: "Assinaturas", type: "EXPENSE" as const, icon: "repeat", color: "#5C6BC0" },
  { name: "Outras despesas", type: "EXPENSE" as const, icon: "more-horizontal", color: "#7A7068" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
