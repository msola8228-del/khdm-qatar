"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Dictionary } from "@/lib/i18n";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { MenuIcon, CloseIcon } from "@/components/ui/Icons";
import styles from "./Header.module.css";

export function Header({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() || "";
  const prefix = `/${locale}`;
  const brandName = locale === "ar" ? SITE.nameAr : SITE.nameEn;
  const brandSub = locale === "ar" ? "Ma'awen" : "معاون";
  const isAr = locale === "ar";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { href: `${prefix}`, label: dict.common.home },
    { href: `${prefix}/hourly`, label: isAr ? "عمالة بالساعة" : "Hourly" },
    { href: `${prefix}/monthly`, label: isAr ? "عمالة بالشهر" : "Monthly" },
    { href: `${prefix}/contact`, label: isAr ? "استقدام" : "Recruitment" },
  ];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        <Link href={prefix} className={styles.logo} aria-label={brandName}>
          <span className={styles.logoText}>{brandName}</span>
          <span className={styles.logoSub}>{brandSub}</span>
        </Link>

        <nav className={styles.nav} aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
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
          <Button href={`${prefix}/hourly`} size="sm">
            {isAr ? "احجز الآن" : "Book now"}
          </Button>
        </div>

        <button
          className={styles.menuBtn}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
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
