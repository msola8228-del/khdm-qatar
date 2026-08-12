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
