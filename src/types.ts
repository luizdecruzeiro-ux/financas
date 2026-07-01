import type { Account, CreditCard, Category, Transaction, Budget } from "@/generated/prisma/client";

export type AccountView = Omit<Account, "balance"> & { balance: number };
export type CreditCardView = Omit<CreditCard, "limit"> & { limit: number };
export type BudgetView = Omit<Budget, "plannedAmount"> & { plannedAmount: number };
export type TransactionView = Omit<Transaction, "amount" | "account" | "toAccount" | "creditCard" | "category"> & {
  amount: number;
  account: AccountView | null;
  toAccount: AccountView | null;
  creditCard: CreditCardView | null;
  category: Category | null;
};

export function serializeAccount(a: Account): AccountView {
  return { ...a, balance: Number(a.balance) };
}

export function serializeCreditCard(c: CreditCard): CreditCardView {
  return { ...c, limit: Number(c.limit) };
}

export function serializeBudget(b: Budget): BudgetView {
  return { ...b, plannedAmount: Number(b.plannedAmount) };
}
