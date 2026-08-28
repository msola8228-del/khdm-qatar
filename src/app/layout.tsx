import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE } from "@/config/site";
import { getLocale } from "@/lib/i18n-server";

export function generateMetadata(): Metadata {
  const locale = getLocale();
  const name = locale === "ar" ? SITE.nameAr : SITE.nameEn;
  const tagline = locale === "ar" ? SITE.taglineAr : SITE.taglineEn;
  return {
    title: {
      default: `${name} | ${tagline}`,
      template: `%s | ${name}`,
    },
    description: tagline,
    openGraph: {
      title: name,
      description: tagline,
      locale: locale === "ar" ? "ar_QA" : "en_US",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const lang = locale;
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
