"use client";

import { useRouter, usePathname } from "next/navigation";

export default function RangeSwitcher({ range }: { range: number }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[6, 12].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => router.push(`${pathname}?range=${r}`)}
          style={{
            border: "1px solid var(--border)",
            background: range === r ? "var(--primary)" : "var(--surface)",
            color: range === r ? "#fff" : "var(--text)",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {r} meses
        </button>
      ))}
    </div>
  );
}
