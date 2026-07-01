import type { Category } from "@/generated/prisma/client";

const KEYWORDS: Record<string, string[]> = {
  alimentacao: ["mercado", "supermercado", "restaurante", "lanchonete", "ifood", "padaria", "acougue", "hortifruti"],
  transporte: ["uber", "99", "posto", "combustivel", "estacionamento", "pedagio", "gasolina"],
  moradia: ["aluguel", "condominio", "energia", "luz", "agua", "iptu", "internet"],
  saude: ["farmacia", "drogaria", "hospital", "clinica", "plano de saude", "laboratorio"],
  lazer: ["cinema", "netflix", "spotify", "steam", "ingresso", "show", "viagem"],
  compras: ["magazine", "americanas", "amazon", "shopee", "mercado livre", "loja"],
  assinaturas: ["assinatura", "mensalidade", "icloud", "google one", "youtube premium"],
  salario: ["salario", "folha de pagamento"],
  educacao: ["escola", "faculdade", "curso", "mensalidade escolar", "livraria"],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function suggestCategoryId(description: string, categories: Category[]): string | null {
  const normDesc = normalize(description);

  for (const category of categories) {
    if (normDesc.includes(normalize(category.name))) return category.id;
  }

  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    if (!keywords.some((k) => normDesc.includes(k))) continue;
    const match = categories.find((c) => {
      const normName = normalize(c.name);
      return normName.includes(key) || key.includes(normName);
    });
    if (match) return match.id;
  }

  return null;
}
