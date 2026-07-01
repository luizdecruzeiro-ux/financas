"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type EvolutionPoint = { label: string; income: number; expense: number };

export default function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ea" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tickFormatter={(v) => formatCurrency(v)} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend />
        <Line type="monotone" dataKey="income" name="Receitas" stroke="#2e7d6b" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="expense" name="Despesas" stroke="#c2542e" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
