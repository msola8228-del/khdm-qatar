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
- `workers.employment_type` is now a **text[] array** (migration 0003) so a worker can belong to multiple filter categories. Valid values: `hourly | daily | monthly | yearly | new | recruitment`. Client candidates page filters by `?employment=<cat>` (Supabase `.contains("employment_type", [cat])`). Admin picks multiple via checkboxes. Salary period label uses `salaryPeriod()` (first of hourly/daily/monthly/yearly in the array); `new`/`recruitment` are display-only categories with no salary unit.
- `page_content`: keyed by `(page, section, locale)`; admin content API upserts on that conflict.

## Worker bulk import (Rozana — 321 maids)
- Source files `rozana-candidate-image-links.{txt,html}` at repo root: 321 candidates (Ethiopian 276, Ugandan 23, Filipino 22). 290 have direct external image URLs; 31 have none (CandidateImage auto-generates an avatar).
- File has NO employment type / salary → import assigns a **varied, fixed distribution** (deterministic shuffle, seed=42) so every filter is populated: `{hourly}`×48, `{daily}`×48, `{monthly}`×80, `{yearly}`×40, `{new}`×30, `{recruitment}`×55, plus 20 multi-category `{new,monthly}`×10 and `{new,hourly}`×10 (appear under 2 filters each). Resulting filter counts: hourly 58, daily 48, monthly 90, yearly 40, new 50, recruitment 55. Admin can edit per-worker later. Nationalities mapped English→Arabic (Ethiopian→إثيوبية, Ugandan→أوغندية, Filipino→فلبينية) to match DB convention.
- `scripts/generate-rozana-import.py` reads the txt and emits `scripts/import-rozana-workers.sql` (idempotent: ensures employment_type is text[] via a DO block, `delete from workers`, batched INSERT of 50 with `on conflict (slug) do nothing`, ends with a count check). Run the .sql manually in Supabase Dashboard → SQL Editor.

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
- Server broadcasts: `broadcastEntryStatus(entryId, status)` on channel `entry:${entryId}` (event `status`, payload `{ status }`) from decide/decide-otp routes; `broadcastNewEntry()` on channel `entries:new` (event `insert`, payload `{ clientId, entryId, type }`) from initiate/submit-otp routes **and from `/api/bookings`** (type `"booking"`). Both use the **service-role** client to send.
- Client subscribes via `subscribeToEntryStatus(entryId, cb)` in `src/lib/realtime.ts`; on broadcast it fetches authoritative status from `/api/payments/status` (avoid trusting payload alone). Admin `AdminInboxView` subscribes to `entries:new` and updates the list without reload.
- **Verified working end-to-end** (2026-08): admin رفض → client showed "تم رفض المعاملة" instantly; admin موافقة → client redirected to /verify-card instantly; new entries appeared in admin inbox without reload.
- **Key lesson**: anon broadcast subscription DOES work with the real anon JWT (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, ~208 chars, starts `eyJ...`). Do NOT confuse it with the service-role key fragment — using a wrong key produces a misleading `CHANNEL_ERROR: transport failure` that looks like a Realtime permissions problem but is just a bad key.

## Visitor country detection (ipinfo.io)
- Railway does NOT inject Geo headers (`x-vercel-ip-country`/`cf-ipcountry`/...), so `detectCountry()` (in `src/lib/client-info.ts`) fell back to `Accept-Language` → often inaccurate (browser language, not connection country).
- Added `lookupCountryByIp(ip)` in `client-info.ts`: calls `https://api.ipinfo.io/lite/{ip}` with `Authorization: Bearer <IPINFO_TOKEN>` (server-only secret, NOT `NEXT_PUBLIC_`). Response field `country_code` (ISO alpha-2). 24h in-memory cache per IP; failures return `null` (caller falls back to `detectCountry`/`Accept-Language`). Private/localhost IPs short-circuit to `null`.
- `POST /api/presence` (`src/app/api/presence/route.ts`) order of precedence: **ipinfo.io** → geo headers → `bodyCountry` → `Accept-Language` (inside detectCountry). Country stored in `clients.country` + `daily_visitors`; displayed in admin as flag + Arabic name via `countryCodeToFlag`/`countryNameAr`.
- `IPINFO_TOKEN` must be set on Railway (Variables) for accurate country detection. Without it, code silently falls back to the old headers/Accept-Language path.

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

## Dynamic booking form (fields vary by worker employment_type)
- `bookingSchema` (`src/lib/validations.ts`) fields: `full_name, national_id, phone, home_address, duration? (int), duration_unit? ("hours"|"months"|"years"), candidateId`. **email and notes were removed** — clients.email column stays nullable; old `notes` column on `bookings` table still exists but is no longer written (set null).
- `BookingForm.tsx` derives the variable duration field from `salaryPeriod(worker.employment_type)`:
  - `hourly` → Select hours (2–8), unit `hours`
  - `monthly` → Select months (1–9), unit `months`
  - `yearly` → Select years (1–9), unit `years`
  - `daily` / `new` / `recruitment` (no salary period) → no duration field rendered.
  - A worker with multiple categories (e.g. `["new","monthly"]`) → `salaryPeriod` returns the first salary-period category, so the months select shows.
- `/api/bookings` route stores the full parsed payload in `client_data_entries` (type `"booking"`, payload includes `bookingId` + `bookingRef`) and updates/creates the `clients` row with `name`+`phone` (no email). `bookings.notes` is now `null`.
- **Booking submit had no try/catch** — a network/JSON error would leave the button stuck on loading with no feedback (looked like "data not sent + no redirect" on mobile). Fixed: wrapped fetch in try/catch, `.json().catch(()=>({}))` guards non-JSON error responses, and a toast surfaces generic errors. The real-world failure was almost certainly the old `email` field being required+validated as `.email()` — a mobile user who left it blank/invalid got a 422 (no booking created, no redirect) whose inline error was below the fold. Removing email resolves this.
- Admin display: `/admin/bookings` page fetches the latest `client_data_entries` row of type `"booking"` per booking (matched by `payload.bookingId`) and passes `entryByBooking` to `BookingsAdminClient`, which now shows رقم الهوية / عنوان المنزل / المدة in the detail modal. The admin inbox `ClientDetailPanel` `BookingCard` also shows those fields by merging the matching booking entry payload into the timeline booking item.
- i18n: new `book.*` keys (`nationalId, homeAddress, selectHours/Months/Years, duration, hour(s)/month(s)/year(s)`) in `ar.json` + `en.json`. `Dictionary = typeof ar` so they're typed automatically.

## Unified pricing by employment category (fixed prices, not per-worker)
- Prices are now **fixed per category** in `src/lib/pricing.ts` (`PRICING`), not read from `workers.expected_salary`:
  - hourly: 50 ر.ق / ساعة
  - monthly: 950 ر.ق / شهر
  - yearly: 15,000 ر.ق / سنة
  - recruitment: 8,000 ر.ق placement fee (once) + 850 ر.ق/شهر monthly salary
  - daily / pure-"new" (no salary period + no recruitment): falls back to "السعر عند الاستفسار" (Price on inquiry) — no fixed price was specified for these.
- `getWorkerPrice(worker)` → `{category, amount, unit, monthlySalary?}` (recruitment takes priority if present in employment_type, else `salaryPeriod`).
- `formatWorkerPrice(worker, locale)` → display string ("50 ر.ق / ساعة", "8,000 ر.ق استقدام (+ 850 ر.ق/شهر)", etc.).
- `computeBookingAmount(worker, duration?, durationUnit?)` → total to charge:
  - hourly: 50 × hours; monthly: 950 × months; yearly: 15000 × years; recruitment: 8000 (one-time, duration ignored).
  - no duration or no price category → `worker.expected_salary` fallback.
- Display sites updated to use `formatWorkerPrice`: `CandidateCard`, `candidates/[slug]` (profile + similar), `book/[slug]`, `AccountClient`, `ClientDetailPanel` BookingCard.
- Payment amount flow: `/checkout`, `/payment`, `/verify-card` **pages** now fetch the booking `client_data_entries` (type=`booking`) payload to read `duration`/`duration_unit`, then call `computeBookingAmount` and pass `amount` (+ `duration`/`durationUnit` on checkout) to the client components. `PaymentClient`/`VerifyCardClient` no longer read `booking.workers.expected_salary` — they take an `amount` prop.
- `/api/payments/initiate` also computes `amount`/`service_fee`/`total` server-side (same fetch of booking entry payload) and stores them in the payment entry payload. `verify-card` page reads those stored values (with `computeBookingAmount` fallback for entries created before this change).
- Admin inbox + admin home queries now `select(... workers(..., employment_type))` so the admin BookingCard can show the category price.

## Worker details + per-type terms & return policy (from تفاصيل العاملات file)
- DB: migration `0004_worker_details.sql` adds `previous_countries text[]` and `bio text` to `workers`. `Worker` type + `workerSchema` updated to include them.
- `src/lib/worker-terms.ts` generates **terms** and **return/replacement policy** text adapted to the worker's employment type (used as fallback when admin hasn't set custom `terms`/`return_policy`):
  - `defaultTerms(worker, locale)` → base obligations text + salary clause by type (hourly=50/ساعة, monthly=950/شهر, yearly=15000/سنة, recruitment=850/شهر after 8000 fee, daily=per-day) + trial clause.
  - `defaultReturnPolicy(worker, locale)` → same-day replacement (≤8h) + trial period by type: **hourly/daily = no trial (instant replacement), monthly = 7 days, yearly = 1 month, recruitment = 3 months**.
  - `primaryEmployment(cats)` picks the determining type (recruitment > yearly > monthly > daily > hourly > new > salaryPeriod fallback).
- Display: `candidates/[slug]` profile + `book/[slug]` use `worker.terms || defaultTerms(worker)` and `worker.return_policy || defaultReturnPolicy(worker)`; terms render with `white-space: pre-line`. Profile also shows `bio` (نبذة) and `previous_countries` (الدول السابقة) row.
- Booking snapshot: `/api/bookings` now stores `terms_snapshot = worker.terms ?? defaultTerms(worker,"ar")` (same for return_policy) so the per-type terms are frozen at booking time.
- Admin can edit everything: `WorkersAdminClient` form now includes fields for **الدول السابقة** (comma-separated → array) and **نبذة تعريفية** (textarea), plus the existing terms/return_policy/skills/languages/experience/salary fields. PATCH route passes body through; POST route inserts the new columns.
- Data import: `scripts/update-workers-details.sql` (generated from the 321-row file) updates `experience_years`, `languages`, `previous_countries`, `bio` for all 321 workers, matched by `full_name`. **Ignores prices from the file** (keeps unified pricing + employment_type as-is). Run manually in Supabase SQL Editor.

## Image optimization (Option A: next/image + smart cache)
- `CandidateImage` now uses **`next/image`** (not raw `<img>`): Next.js downloads the external image once, downscales to the displayed size, converts to WebP, and caches the optimized version server-side. Subsequent views are fast (served from cache as ~small WebP).
- `next.config.mjs` `images.remotePatterns` includes `rozana-manpower.com` and `**.onesourceerp.com` (the rozana image hosts) plus pravatar/unsplash/logo.dev; `formats: ["image/webp"]`.
- **Smart cache-busting**: migration adds `workers.updated_at` (auto-updated via `workers_updated_at` trigger on every UPDATE). `CandidateImage` appends `?v=<updated_at>` to the photo URL. When the admin edits a worker (changes photo or any field), `updated_at` changes → the `?v=` changes → `next/image` produces a fresh optimized image → clients see the change immediately. No stale cache.
- `CandidateImage` and `CandidateCard` accept a `priority` prop; first 3–4 cards on the candidates/home pages and the profile main photo load eagerly (`priority`), the rest stay `loading="lazy"`.
- The `?v=` query param is safe — tested against the rozana/onesourceerp hosts (they return 200 image with `?v=...` appended, except the two URLs that were already 404).
## Ma'awen login flow (معاون login with admin approval)
- Feature: clients log in via `/ar/maawen/login` (and `/en/maawen/login`)— form (email/username/password) → `POST /api/maawen/login` stores a `maawen_login` entry in `client_data_entries` with status `pending_admin` and `password_hash` (hashed via `scrypt` in `src/lib/password.ts`— route files may only export HTTP methods,, so helpers live in lib).
- Client waits on a "جارٍ التحقق..." screen polling `GET /api/maawen/login/status?entryId=` every ~2s. Admin sees a `MaawenLoginCard` in the inbox/home timeline (kind `maawen-login`( with موافقة/رفض → `POST /api/maawen/login/decide` → broadcast `status` on channel `maawen:${entryId}` → client redirects to `/maawen/verify/[entryId]` (approved( or shows rejection.
- OTP stage: client enters the OTP code → `POST /api/maawen/login/submit-otp` → new `maawen_login_otp` entry (`pending_admin`) → admin approves via `POST /api/maawen/login/decide-otp` → broadcast → client shows "الذهاب إلى حسابي" link to `/account`.
- The verify page is a **server component** (`/[locale]/maawen/verify/[entryId]/page.tsx`) that reads the login entry's `status` and renders `MaawenOtpClient`. Both client components are in `src/components/maawen/`. Timeline kinds added: `maawen-login` | `maawen-otp` in `ClientDetailPanel.tsx`; `activityLabel()` cases in `admin/page.tsx`.
- `MaawenLoginClient.tsx` has a `showIntro` state for the intro modal ("متابعة" closes it — it must set `showIntro(false)`, not just `setError(null)`).
- Admin route guard: `/admin` uses real Supabase Auth (not `ADMIN_DEFAULT_PASSWORD` env —that env is not read by `AuthForm`); admin email comes from `settings.admin_email` (`admin@admin.com` in the dev DB) .
