"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

export default function BalanceBarChart({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const data = [
    { name: "Receitas", value: income, color: "#2e7d6b" },
    { name: "Despesas", value: expense, color: "#c2542e" },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ea" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={13} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tickFormatter={(v) => formatCurrency(v)} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
