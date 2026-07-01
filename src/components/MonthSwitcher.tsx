"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { monthName, shiftMonth } from "@/lib/utils";
import styles from "./MonthSwitcher.module.css";

export default function MonthSwitcher({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(delta: number) {
    const next = shiftMonth(month, year, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(next.month));
    params.set("year", String(next.year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={styles.switcher}>
      <button type="button" onClick={() => go(-1)} aria-label="Mês anterior">
        ‹
      </button>
      <span className={styles.label}>
        {monthName(month)} {year}
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Próximo mês">
        ›
      </button>
    </div>
  );
}
