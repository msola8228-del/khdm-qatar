"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/Button";
import styles from "./Header.module.css";

export function Header({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() || "";
  const prefix = `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { href: `${prefix}`, label: dict.common.home },
    { href: `${prefix}/candidates`, label: dict.common.candidates },
    { href: `${prefix}/services`, label: dict.common.services },
    { href: `${prefix}/about`, label: dict.common.about },
    { href: `${prefix}/favorites`, label: dict.common.favorites },
    { href: `${prefix}/contact`, label: dict.common.contact },
  ];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        <Link href={prefix} className={styles.logo}>
          <span className={styles.logoMark}>✦</span>
          {SITE.name}
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${pathname === item.href ? styles.active : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.cta}>
          <Button href={`${prefix}/candidates`} size="sm">
            {dict.nav.browseCandidates}
          </Button>
        </div>

        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileNav}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
