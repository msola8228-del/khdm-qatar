// صفحات الموقع التي يمكن للمدير توجيه العميل إليها من لوحة التحكم.
// القيمة (value) تُخزَّن في سجل التوجيه، والمسار (path) بدون بادئة اللغة —
// العميل يضيف لغة الصفحة الحالية تلقائياً عند التنفيذ.
export type DirectPage = {
  value: string;
  label: string;
  path: string;
  /**
   * الصفحات الديناميكية تحتاج معرّفات لحظية (bookingId / pid) لا تُعرف قبل
   * وقت التوجيه، فيُحسب المسار النهائي وقت الإرسال عبر resolvePath.
   */
  dynamic?: boolean;
  resolvePath?: (ctx: DirectResolveContext) => string | null;
};

export type DirectResolveContext = {
  bookingId?: string | null;
  /** معرّف أحدث entry من نوع payment تابع للحجز الحالي */
  paymentEntryId?: string | null;
};

export const DIRECT_PAGES: DirectPage[] = [
  { value: "home", label: "الرئيسية", path: "/" },
  { value: "candidates", label: "العاملات", path: "/candidates" },
  { value: "services", label: "خدماتنا", path: "/services" },
  { value: "about", label: "من نحن", path: "/about" },
  { value: "contact", label: "تواصل معنا", path: "/contact" },
  { value: "blog", label: "المدونة", path: "/blog" },
  { value: "favorites", label: "المفضلة", path: "/favorites" },
  { value: "terms", label: "الشروط والأحكام", path: "/terms" },
  { value: "privacy", label: "سياسة الخصوصية", path: "/privacy" },
  { value: "hourly", label: "عمالة بالساعة", path: "/hourly" },
  { value: "monthly", label: "عمالة بالشهر", path: "/monthly" },
  { value: "amount", label: "حاسبة المبلغ", path: "/amount" },
  { value: "client-info", label: "بيانات العميل", path: "/client-info" },
  { value: "login", label: "تسجيل الدخول", path: "/login" },
  { value: "register", label: "إنشاء حساب", path: "/register" },
  // صفحات الدفع ورمز التحقق — ديناميكية: تُبنى من آخر حجز/طلب دفع للعميل.
  {
    value: "checkout",
    label: "صفحة الدفع (الدفع)",
    path: "/checkout", // placeholder يُستبدل بالمسار المحسوب
    dynamic: true,
    resolvePath: (ctx) => (ctx.bookingId ? `/checkout/${ctx.bookingId}` : null),
  },
  {
    value: "payment",
    label: "صفحة إدخال البطاقة",
    path: "/payment",
    dynamic: true,
    resolvePath: (ctx) => (ctx.bookingId ? `/payment/${ctx.bookingId}` : null),
  },
  {
    value: "verify-card",
    label: "صفحة رمز التحقق (OTP)",
    path: "/verify-card",
    dynamic: true,
    resolvePath: (ctx) =>
      ctx.bookingId && ctx.paymentEntryId
        ? `/verify-card/${ctx.bookingId}?pid=${ctx.paymentEntryId}`
        : null,
  },
];

export function getDirectPage(value: string): DirectPage | undefined {
  return DIRECT_PAGES.find((p) => p.value === value);
}

/** المسار النهائي (بدون لغة) للتوجيه، أو null إن تعذّر حله. */
export function resolveDirectPath(
  page: DirectPage,
  ctx: DirectResolveContext,
): string | null {
  if (!page.dynamic) return page.path;
  return page.resolvePath?.(ctx) ?? null;
}

// اسم قناة التوجيه الفوري. البصمة base64 قد تحوي + / = وهي غير مأمونة في
// أسماء قنوات Realtime، لذا نُطبّعها إلى أحرف آمنة (نفس القاعدة على الخادم والعميل).
export function directChannelKey(fingerprint: string): string {
  return fingerprint.replace(/[^a-zA-Z0-9]/g, "_");
}