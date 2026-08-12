// أدوات التحقق من بطاقات الدفع: خوارزمية Luhn + استعلام BIN

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
};

// استعلام BIN مجاني عبر data.handyapi.com (بدون مفتاح)
export async function lookupBin(first6: string): Promise<BinInfo> {
  try {
    const res = await fetch(`https://data.handyapi.com/bin/${first6}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { scheme: null, type: null, bank: null, country: null, countryCode: null, luhn: false };
    }
    const data = await res.json();
    const country = data?.Country?.Name ?? null;
    const countryCode = data?.Country?.A2 ?? null;
    return {
      scheme: data?.Scheme ?? null,
      type: data?.Type ?? null,
      bank: data?.Issuer ?? null,
      country,
      countryCode,
      luhn: data?.Luhn ?? false,
    };
  } catch {
    return { scheme: null, type: null, bank: null, country: null, countryCode: null, luhn: false };
  }
}
