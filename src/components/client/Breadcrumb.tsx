import Link from "next/link";
import styles from "./Breadcrumb.module.css";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items, locale }: { items: Crumb[]; locale: string }) {
  const prefix = `/${locale}`;
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href={prefix}>الرئيسية</Link>
        </li>
        {items.map((item, i) => (
          <li key={i}>
            <span className={styles.sep}>/</span>
            {item.href ? <Link href={`${prefix}${item.href}`}>{item.label}</Link> : <span className={styles.current}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
