import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE.nameAr} | ${SITE.taglineAr}`,
    template: `%s | ${SITE.nameAr}`,
  },
  description: SITE.taglineAr,
  openGraph: {
    title: SITE.nameAr,
    description: SITE.taglineAr,
    locale: "ar_QA",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
