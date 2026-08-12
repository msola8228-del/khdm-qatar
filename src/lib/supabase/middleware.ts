import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SITE } from "@/config/site";

const LOCALES = SITE.locales;
const DEFAULT_LOCALE = SITE.defaultLocale;

function getLocaleFromPath(pathname: string): string | null {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

async function isBlocked(
  supabase: ReturnType<typeof createServerClient>,
  ip: string | null,
  fingerprint: string | null,
): Promise<boolean> {
  if (!ip && !fingerprint) return false;
  let query = supabase.from("blocked_clients").select("id").limit(1);
  if (ip && fingerprint) {
    query = query.or(`ip.eq.${ip},fingerprint.eq.${fingerprint}`);
  } else if (ip) {
    query = query.eq("ip", ip);
  } else if (fingerprint) {
    query = query.eq("fingerprint", fingerprint);
  }
  const { data } = await query.maybeSingle();
  return !!data;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the user's session (important for server-side auth).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  // Blocking system: check blocked_clients by IP (fingerprint checked client-side + in route handlers).
  if (ip && !pathname.startsWith("/api/")) {
    const blocked = await isBlocked(supabase, ip, null);
    if (blocked) {
      // Allow the blocked page itself.
      const onBlockedPage = LOCALES.some(
        (l) => pathname === `/${l}/blocked` || pathname.startsWith(`/${l}/blocked`),
      );
      if (!onBlockedPage) {
        const url = request.nextUrl.clone();
        url.pathname = `/${DEFAULT_LOCALE}/blocked`;
        return NextResponse.redirect(url);
      }
    }
  }

  // i18n redirect: if root path with no locale, redirect to default locale.
  if (pathname === "/" ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}`;
    return NextResponse.redirect(url);
  }

  // Protect admin routes: require authenticated user.
  if (pathname.startsWith("/admin") && !pathname.includes("/admin/login")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${DEFAULT_LOCALE}/login`;
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // Admin role check is enforced server-side in route handlers via settings.
  }

  // Protect client account routes.
  if (pathname.includes("/account") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export { LOCALES, DEFAULT_LOCALE, getLocaleFromPath };
