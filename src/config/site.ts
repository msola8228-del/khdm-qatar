export const SITE = {
  name: "Khdm Qatar",
  nameAr: "خدَم قطر",
  nameEn: "Khdm Qatar",
  taglineAr: "مكتب استقدام خدم مرخّص في قطر",
  taglineEn: "Licensed domestic worker recruitment office in Qatar",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://khdm-qatar.example",
  phone: process.env.PHONE || "+97444440000",
  whatsapp: process.env.WHATSAPP_NUMBER || "97444440000",
  whatsappEnabled: true,
  email: process.env.SITE_EMAIL || "info@khdm-qatar.com",
  addressAr: "الدوحة، قطر",
  addressEn: "Doha, Qatar",
  commercialRegistration: process.env.COMMERCIAL_REGISTRATION || "CR-QAT-2024",
  licenseNumber: process.env.LICENSE_NUMBER || "AD-1145-2024",
  yearsExperience: 8,
  familiesCount: 850,
  workersCount: 30,
  workingHoursAr: "السبت–الخميس · 9ص – 9م",
  workingHoursEn: "Sat–Thu · 9 AM – 9 PM",
  recruitmentDurationWeeks: "4-8",
  mapEmbedUrl: process.env.NEXT_PUBLIC_MAP_EMBED_URL || "https://maps.google.com/?q=Doha+Qatar",
  social: {
    facebook: "#",
    instagram: "#",
    linkedin: "#",
    tiktok: "#",
    whatsapp: "https://wa.me/97444440000",
  },
  minSalary: 1200,
  recruitmentFee: "يُحدد حسب نوع الخدمة والعاملة",
  currencyAr: "ر.ق",
  currencyEn: "QAR",
  defaultLocale: "ar",
  locales: ["ar", "en"],
  floatingActionsEnabled: true,
  returnPolicyAr:
    "السياسة العامة للاسترجاع/الاستبدال: تُحدد شروط الاسترجاع لكل عاملة على حدة. في حال عدم تحديد شروط خاصة، يتم تطبيق سياسة الاستبدال خلال فترة التجربة المتفق عليها مع توفر الحجج والبنود المنصوص عليها في العقد.",
  returnPolicyEn:
    "General return/replacement policy: Return conditions are set for each worker individually. If no special conditions are specified, the replacement policy applies during the agreed probation period, subject to the terms and provisions set out in the contract.",
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

