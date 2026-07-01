"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/transacoes", label: "Transações", icon: "list" },
  { href: "/contas", label: "Contas", icon: "landmark" },
  { href: "/cartoes-credito", label: "Cartões de crédito", icon: "credit-card" },
  { href: "/planejamento", label: "Planejamento", icon: "target" },
  { href: "/relatorios", label: "Relatórios", icon: "pie-chart" },
  { href: "/categorias", label: "Categorias", icon: "tag" },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "landmark":
      return (
        <svg {...common}>
          <line x1="3" y1="21" x2="21" y2="21" />
          <line x1="5" y1="21" x2="5" y2="10" />
          <line x1="9" y1="21" x2="9" y2="10" />
          <line x1="15" y1="21" x2="15" y2="10" />
          <line x1="19" y1="21" x2="19" y2="10" />
          <polygon points="12,3 21,9 3,9" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
          <line x1="2.5" y1="10" x2="21.5" y2="10" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case "pie-chart":
      return (
        <svg {...common}>
          <path d="M21.2 15.1A9 9 0 1 1 12 3v9z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.6 12.4 12.7 20.3a2 2 0 0 1-2.8 0L3 13.4V3h10.4l7.2 7.2a2 2 0 0 1 0 2.2z" />
          <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.1.7.6 1.3 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>F</span>
        <span className={styles.brandName}>Finanças</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.user}>
        <div className={styles.avatar}>SM</div>
        <div>
          <div className={styles.userName}>Sérgio Mattina</div>
          <div className={styles.userTag}>Minha conta</div>
        </div>
      </div>
    </aside>
  );
}
