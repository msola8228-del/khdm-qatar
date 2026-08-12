"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./AdminSidebar.module.css";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊" },
  { href: "/admin/presence", label: "الحضور (24h)", icon: "👥" },
  { href: "/admin/workers", label: "المرشحون", icon: "👤" },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📅" },
  { href: "/admin/block-client", label: "حظر عميل", icon: "🚫" },
  { href: "/admin/blog", label: "المدونة", icon: "📝" },
  { href: "/admin/content", label: "المحتوى", icon: "✏️" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.menuBtn} onClick={() => setOpen(!open)} aria-label="قائمة">
        ☰
      </button>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.header}>
          <Link href="/ar" className={styles.logo}>خدم قطر · لوحة التحكم</Link>
          <button className={styles.close} onClick={() => setOpen(false)} aria-label="إغلاق">✕</button>
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
