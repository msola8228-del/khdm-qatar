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
