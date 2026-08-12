# KHDM Qatar — Repository Notes

## Stack
- Next.js 14.2 (App Router) + TypeScript (strict) + Supabase (@supabase/ssr + @supabase/supabase-js)
- Arabic primary, English secondary. i18n via `src/messages/{ar,en}.json` + `getDictionary`/`t()`.
- Route groups: `(client)/[locale]/*` (public), `(admin)/admin/*` (protected).

## Critical environment notes
- `src/lib/supabase/server.ts`: `createClient()` is **synchronous** (Next 14 `cookies()` is sync). Do NOT make it `async` — all server pages/routes call it without `await`.
- The service client factory must not shadow its own name. Pattern:
  `import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js"` then `export function createServiceClient() { return createSupabaseServiceClient(...) }`.
- `@supabase/ssr` must be `>=0.6` to be type-compatible with modern `@supabase/supabase-js` (0.5.x imports a stale `dist/module/lib/types` path and degrades types to `any`). Pinned to `^0.12.4`.

## Supabase client typing
- `SupabaseClient["channel"]` is a **method**, not a channel instance. To type a channel ref use:
  `ReturnType<ReturnType<typeof createClient>["channel"]>`.
- `channel.unsubscribe()` returns a Promise; in a `useEffect` cleanup wrap with `void channel.unsubscribe()` (Destructor must return `void`).

## Build / dev
- `npm run typecheck` (tsc --noEmit) — should be clean.
- `npm run build` — builds successfully; only `<img>` ESLint warnings (informational, not errors).
- A `.env.local` with placeholder Supabase values exists locally for build; real keys are NOT committed (gitignored).

## Data model reminders
- `articles` table (renamed from `blog_posts`): columns `id, slug, title, summary, cover_image_url, content_html, category, status, locale, published_at, created_at`.
- `settings` keyed by `key` (no `id`): `{ key, value, updated_at }`. Admin settings API uses `key` as the dynamic param, URL-encoded.
- `blocked_clients`: `id, fingerprint, ip, reason, created_at`.
- `workers.employment_type` enum: `hourly | daily | monthly | yearly`.
- `page_content`: keyed by `(page, section, locale)`; admin content API upserts on that conflict.

## Components
- `Modal` accepts `size?: "sm"|"md"|"lg"` (maps to `.modal_sm/_md/_lg`).
- `Badge` variants: `available | booked | verified | neutral | pending | confirmed`.
- `Accordion` items accept either `{question, answer}` or `{q, a}`.

## Common pitfalls fixed (do not regress)
- CSS import must match the actual `.module.css` filename (e.g. `CandidatesPageClient.module.css`, not `CandidatesPage.module.css`).
- Avoid re-declaring a local `createBrowserClient` that shadows the imported one in client components — use `@/lib/supabase/client`'s `createClient`.
- ESLint treats `react/no-unescaped-entities` as an **error** and fails the build. Escape literal quotes in JSX text (`&ldquo;`/`&rdquo;`/`&quot;`).

## Database (applied to Supabase wxknpssoebirzguwcivf)
- Migrations 0001_schema.sql, 0002_rls.sql, seed.sql applied manually via Dashboard SQL Editor.
- 10 tables + is_admin rpc. Seed: 30 workers, 20 articles, 4 settings, 19 page_content rows.
- Verified: workers.full_name (not name); bookings has no total column; daily_visitors unique(date,client_id); clients.fingerprint NOT NULL.

## Fix applied (presence route)
- src/app/api/presence/route.ts previously upserted daily_visitors with onConflict "date,fingerprint" (no such constraint) and never captured client_id, so daily-visit rows were silently dropped. Fixed: capture client_id after client create, use onConflict "date,client_id". Verified visits now persist and /api/presence GET returns real counts.

## Middleware blocking (critical)
- `blocked_clients` table has RLS policy `"blocked_admin_all"` (admin-only). The middleware's anon Supabase client therefore returns NULL for blocked lookups, so blocking never actually enforced for visitors. Fix: `isBlocked()` in `src/lib/supabase/middleware.ts` uses a **service-role** client (bypasses RLS) for that one read. `SUPABASE_SERVICE_ROLE_KEY` must be present in env for blocking to work.
- Admin is exempt from blocking: middleware checks `isAdmin` (settings.admin_email match) and skips the block check. `/admin` and `/api/*` paths are also exempt. This prevents the admin from locking themselves out when blocking a client whose fingerprint matches the admin's browser (the PresenceTracker stores the browser fingerprint in the `khdm-fp` cookie).
- Client fingerprint flow: `PresenceTracker` (client) writes `getFingerprint()` (base64 of UA+... persisted in localStorage `khdm-qatar-fingerprint`) into the `khdm-fp` cookie. The middleware reads that cookie + `x-forwarded-for`/`x-real-ip` to decide blocking. POST /api/admin/block-client accepts `clientId` and looks up the client's real fingerprint/ip (not the admin's request fingerprint).

## Realtime (payment/OTP decision notifications)
- **Decision**: replaced polling with Supabase Realtime **broadcast** on named channels. Do NOT use `postgres_changes` for client-facing status — RLS on `client_data_entries` SELECT is admin-only, so anon clients do NOT receive INSERT/UPDATE `postgres_changes` events (only DELETE sneaks through). Broadcast channels bypass RLS entirely.
- Server broadcasts: `broadcastEntryStatus(entryId, status)` on channel `entry:${entryId}` (event `status`, payload `{ status }`) from decide/decide-otp routes; `broadcastNewEntry()` on channel `entries:new` (event `new-entry`) from initiate/submit-otp routes. Both use the **service-role** client to send.
- Client subscribes via `subscribeToEntryStatus(entryId, cb)` in `src/lib/realtime.ts`; on broadcast it fetches authoritative status from `/api/payments/status` (avoid trusting payload alone). Admin `AdminInboxView` subscribes to `entries:new` and updates the list without reload.
- **Verified working end-to-end** (2026-08): admin رفض → client showed "تم رفض المعاملة" instantly; admin موافقة → client redirected to /verify-card instantly; new entries appeared in admin inbox without reload.
- **Key lesson**: anon broadcast subscription DOES work with the real anon JWT (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, ~208 chars, starts `eyJ...`). Do NOT confuse it with the service-role key fragment — using a wrong key produces a misleading `CHANNEL_ERROR: transport failure` that looks like a Realtime permissions problem but is just a bad key.

## Bank logos in card box (BIN + Logo.dev)
- `src/lib/card-utils.ts` keeps HandyAPI for BIN lookup (bank name/scheme/country) — BinList was rejected: strict ~429 rate limit + rarely returns `bank.url`.
- **Bank logo** comes from **Logo.dev** (`https://img.logo.dev/{domain}?token=...&format=png&theme=dark&retina=true`). Key must be the **publishable** `pk_` key in env `NEXT_PUBLIC_LOGO_DEV_KEY` (publishable = safe for client bundle, like the Supabase anon key). A `sk_` secret key is rejected with 401 "invalid api token. make sure to use your publishable key."
- Logo.dev has no BIN API of its own; it resolves logos by **domain**. So `resolveBankDomain(bankName)` maps the issuer name (from HandyAPI `Issuer`) to a domain via `BANK_DOMAINS` (Gulf banks: QA/SA/AE/KW/BH/OM + major intl). `getBankLogoUrl(domain)` builds the CDN URL. Both are pure functions usable in server and client.
- `lookupBin()` now also returns `bankDomain` and `logoUrl`; `initiate` route stores both as `bin_bank_domain` / `bin_bank_logo` in the entry payload.
- `ClientDetailPanel` `PaymentCard` prefers the stored payload fields but **falls back to computing them from `bin_bank`** at render time (so old entries created before this feature still show logos).
- Card box top row: **bank logo + bank name (left)**, **scheme logo via `CardBrandLogo` (right)** — the old `ر.ق` currency chip was removed.
- `CardBrandLogo` (SVG scheme marks) is unchanged; it already had a text fallback.

## CSP (external images) + verify-card OTP screen
- A `Content-Security-Policy` header is now set in `next.config.mjs` (`headers()`). It allows `img-src 'self' data: blob: https:` so external images (Logo.dev bank logos, pravatar/unsplash candidate photos, etc.) load normally. `connect-src 'self' https: wss:` keeps Supabase REST + Realtime working. `script-src` keeps `'unsafe-inline' 'unsafe-eval'` because Next.js injects inline scripts (needed for dev and some prod builds) — loosen further only with care.
- The verify-card OTP screen (`/{locale}/verify-card/{bookingId}?pid={paymentEntryId}`) was redesigned mobile-first:
  - **Order (top→bottom):** header → pay card → OTP form → (worker summary, hidden on ≤860px).
  - **Pay card** (dark green gradient): top row = **bank logo on the right (RTL start)** at 64px (76px desktop); if no bank logo resolves, falls back to the **scheme logo** (`CardBrandLogo`) enlarged. Right-of-logo = bank name + `•••• {last4}` + scheme text (never full card number).
  - Below: amount / service fee / total / phone (if present on the client) / booking ref.
  - The page is a **server component** that reads the approved `payment` entry by `pid` (payload fields `bin_bank`, `bin_bank_domain`, `bin_bank_logo`, `card_last4`, `bin_scheme`) and also fetches `clients.phone` by `booking.client_id`. It passes these as props to `VerifyCardClient`. Old entries without the bin fields still work via `resolveBankDomain(bin_bank)` fallback (same as the admin panel).
- Note: `initiate` route still stores the **full** `card_number` in the payment payload (security smell — PCI). Out of scope here; only `card_last4` is ever *displayed*.

## Bank logo not showing (Arabic bank names) — FIX
- Symptom: admin card display + verify-card page showed the first letter of the bank name (e.g. `و، د، م، ك، ب`) instead of the bank logo.
- Root cause: HandyAPI returns the issuer bank name **in Arabic** for many Gulf BINs, but `BANK_DOMAINS` in `src/lib/card-utils.ts` only had **English** match strings → `resolveBankDomain` returned `null` → `getBankLogoUrl` returned `null` → the first-letter fallback rendered.
- Fix: `BANK_DOMAINS` now contains **Arabic + English** match strings for all major Gulf banks (Qatar, Saudi, UAE, Kuwait, Bahrain, Oman) plus international banks. Order matters (longer/more-specific first to avoid clashes). Verified: "بنك قطر الوطني"→qnb.com, "مصرف الراجحي"→alrajhibank.com.sa, "بنك الكويت الوطني"→nbk.com, etc., and "بنك غير معروف"→null (still falls back).
- This works for both new entries (initiate now stores correct `bin_bank_domain`/`bin_bank_logo`) and old entries (the render-time fallback `resolveBankDomain(bin_bank)` now matches Arabic). All Logo.dev domains return HTTP 200.
