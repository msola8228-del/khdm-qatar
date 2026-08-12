export const SITE = {
  name: "test-web",
  nameAr: "تست-ويب",
  taglineAr: "مكتب استقدام خدم مرخّص في قطر",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://test-web.example",
  phone: process.env.PHONE || "+97400000000",
  whatsapp: process.env.WHATSAPP_NUMBER || "97400000000",
  whatsappEnabled: true,
  email: process.env.SITE_EMAIL || "info@test-web.com",
  addressAr: "الدوحة، قطر",
  address: "الدوحة، قطر",
  commercialRegistration: process.env.COMMERCIAL_REGISTRATION || "CR-00000",
  yearsExperience: 12,
  familiesCount: 1500,
  workersCount: 30,
  workingHoursAr: "السبت–الخميس · 9ص – 9م",
  mapEmbedUrl: process.env.NEXT_PUBLIC_MAP_EMBED_URL || "https://maps.google.com/?q=Qatar",
  social: {
    facebook: "#",
    instagram: "#",
    linkedin: "#",
    tiktok: "#",
    whatsapp: "https://wa.me/97400000000",
  },
  minSalary: 1200,
  currency: "ر.ق",
  defaultLocale: "ar",
  locales: ["ar", "en"],
  floatingActionsEnabled: true,
  returnPolicy:
    "السياسة العامة للاسترجاع/الاستبدال: تُحدد شروط الاسترجاع لكل عاملة على حدة. في حال عدم تحديد شروط خاصة، يتم تطبيق سياسة الاستبدال خلال فترة التجربة المتفق عليها مع توفر الحجج والبنود المنصوص عليها في العقد.",
  geoBlocking: {
    enabled: false,
    mode: "blocklist" as "allowlist" | "blocklist",
    countries: [] as string[],
  },
  payment: {
    enabled: false,
    provider: "stub",
  },
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || "change-me-immediately",
} as const;

export type SiteConfig = typeof SITE;
