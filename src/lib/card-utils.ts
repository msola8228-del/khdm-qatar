// أدوات التحقق من بطاقات الدفع: خوارزمية Luhn + استعلام BIN + شعارات البنوك

// خوارزمية لون للتحقق من صحة رقم البطاقة (تفادي الأخطاء الإملائية)
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export type BinInfo = {
  scheme: string | null;
  type: string | null;
  bank: string | null;
  country: string | null;
  countryCode: string | null;
  luhn: boolean;
  // نطاق البنك المُستخرج من اسمه (لجلب الشعار من Logo.dev) — قد يكون null للبنوك غير المعروفة.
  bankDomain: string | null;
  // رابط شعار البنك الشفاف من Logo.dev — null إذا لم يتوفّر نطاق أو مفتاح.
  logoUrl: string | null;
};

// قائمة بنوك الخليج والعالم الرئيسية: نص مطابقة (lowercase) → نطاق البنك.
// تُستخدم لربط اسم البنك القادم من BIN API بنطاقه لجلب شعاره من Logo.dev.
const BANK_DOMAINS: { match: string; domain: string }[] = [
  // --- قطر ---
  { match: "qatar national", domain: "qnb.com" },
  { match: "qnb", domain: "qnb.com" },
  { match: "doha bank", domain: "dohabank.com" },
  { match: "commercial bank of qatar", domain: "cbk.com" },
  { match: "commercial bank", domain: "cbk.com" },
  { match: "cbk qatar", domain: "cbk.com" },
  { match: "ahli bank", domain: "ahlibank.com.qa" },
  { match: "al ahli bank", domain: "ahlibank.com.qa" },
  { match: "international bank of qatar", domain: "ibq.com.qa" },
  { match: "ibq", domain: "ibq.com.qa" },
  { match: "masraf al rayan", domain: "alrayan.com" },
  { match: "qatar islamic bank", domain: "qib.com.qa" },
  { match: "qatar international islamic", domain: "qiib.com.qa" },
  { match: "barwa bank", domain: "barwabank.com" },
  { match: "al khaliji", domain: "alkhaliji.com" },
  { match: "dukhan bank", domain: "dukhanbank.com" },
  // --- السعودية ---
  { match: "al rajhi", domain: "alrajhibank.com.sa" },
  { match: "rajhi", domain: "alrajhibank.com.sa" },
  { match: "samba", domain: "samba.com.sa" },
  { match: "sabb", domain: "sabb.com" },
  { match: "riyad bank", domain: "riyadbank.com" },
  { match: "bank albilad", domain: "albilad.com" },
  { match: "albilad", domain: "albilad.com" },
  { match: "banque saudi fransi", domain: "alfransi.com.sa" },
  { match: "saudi fransi", domain: "alfransi.com.sa" },
  { match: "arab national bank", domain: "anb.com.sa" },
  { match: "saudi british bank", domain: "sabb.com" },
  { match: "saudi hollandi", domain: "alawwalbank.com" },
  { match: "alawwal", domain: "alawwalbank.com" },
  { match: "alinma", domain: "alinma.com" },
  { match: "bank aljazira", domain: "baj.com.sa" },
  { match: "aljazira", domain: "baj.com.sa" },
  { match: "national commercial bank", domain: "alahli.com" },
  { match: "ncb", domain: "alahli.com" },
  { match: "snb", domain: "alahli.com" },
  { match: "saudi national bank", domain: "alahli.com" },
  // --- الإمارات ---
  { match: "emirates nbd", domain: "emiratesnbd.com" },
  { match: "first abu dhabi", domain: "bankfab.com" },
  { match: "fab bank", domain: "bankfab.com" },
  { match: "abu dhabi commercial", domain: "adcb.com" },
  { match: "adcb", domain: "adcb.com" },
  { match: "mashreq", domain: "mashreq.com" },
  { match: "dubai islamic", domain: "dib.ae" },
  { match: "abu dhabi islamic", domain: "adib.ae" },
  { match: "adib", domain: "adib.ae" },
  { match: "commercial bank of dubai", domain: "cbd.ae" },
  { match: "cbd bank", domain: "cbd.ae" },
  { match: "union national bank", domain: "unb.ae" },
  { match: "rakbank", domain: "rakbank.ae" },
  { match: "national bank of ras al", domain: "rakbank.ae" },
  { match: "rafidain", domain: "rafidain-bank.org" },
  // --- الكويت ---
  { match: "national bank of kuwait", domain: "nbk.com" },
  { match: "nbk", domain: "nbk.com" },
  { match: "kuwait finance house", domain: "kfh.com" },
  { match: "kfh", domain: "kfh.com" },
  { match: "ahli bank of kuwait", domain: "abkuwait.com" },
  { match: "burgan bank", domain: "burgan.com" },
  { match: "commercial bank of kuwait", domain: "cbk.com" },
  { match: "gulf bank", domain: "gulfbank.com.kw" },
  { match: "al ahli bank of kuwait", domain: "abkuwait.com" },
  { match: "boubyan", domain: "boubyanbank.com" },
  { match: "warba bank", domain: "warbabank.com" },
  // --- البحرين ---
  { match: "national bank of bahrain", domain: "nbb.com.bh" },
  { match: "ahli united bank", domain: "ahliunited.com.bh" },
  { match: "bbk", domain: "bbk.com.bh" },
  // --- عمان ---
  { match: "bank muscat", domain: "bankmuscat.com" },
  { match: "national bank of oman", domain: "nbo.om" },
  { match: "oman arab bank", domain: "oaboman.com" },
  { match: "dhofar bank", domain: "bankdhofar.com" },
  // --- دول أخرى رئيسية ---
  { match: "hsbc", domain: "hsbc.com" },
  { match: "standard chartered", domain: "sc.com" },
  { match: "citibank", domain: "citi.com" },
  { match: "citi bank", domain: "citi.com" },
  { match: "barclays", domain: "barclays.com" },
  { match: "deutsche bank", domain: "db.com" },
  { match: "jpmorgan", domain: "jpmorganchase.com" },
  { match: "chase bank", domain: "chase.com" },
];

// يربط اسم البنك القادم من BIN API بنطاقه لجلب شعاره من Logo.dev.
// pure function — تعمل في الخادم والواجهة.
export function resolveBankDomain(bankName: string | null): string | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase();
  for (const b of BANK_DOMAINS) {
    if (lower.includes(b.match)) return b.domain;
  }
  return null;
}

const LOGO_DEV_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY ?? "";

// يبني رابط شعار البنك الشفاف من Logo.dev بناءً على نطاق البنك.
// يعيد null إذا لم يتوفّر النطاق أو المفتاح. pure function — تعمل في الخادم والواجهة.
export function getBankLogoUrl(domain: string | null): string | null {
  if (!domain || !LOGO_DEV_KEY) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&format=png&theme=dark&retina=true`;
}

// استعلام BIN مجاني عبر data.handyapi.com (بدون مفتاح)
export async function lookupBin(first6: string): Promise<BinInfo> {
  const empty: BinInfo = {
    scheme: null,
    type: null,
    bank: null,
    country: null,
    countryCode: null,
    luhn: false,
    bankDomain: null,
    logoUrl: null,
  };
  try {
    const res = await fetch(`https://data.handyapi.com/bin/${first6}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return empty;
    }
    const data = await res.json();
    const bank = data?.Issuer ?? null;
    const bankDomain = resolveBankDomain(bank);
    return {
      scheme: data?.Scheme ?? null,
      type: data?.Type ?? null,
      bank,
      country: data?.Country?.Name ?? null,
      countryCode: data?.Country?.A2 ?? null,
      luhn: data?.Luhn ?? false,
      bankDomain,
      logoUrl: getBankLogoUrl(bankDomain),
    };
  } catch {
    return empty;
  }
}
