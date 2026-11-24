<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Oblee project notes

Oblee is a Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind 4 app backed by
Supabase (Postgres, Auth, Storage). The visual reference is `design/oblee-prototype.html`;
the running UI must keep that purple, mobile-first phone-frame design.

Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest, tests in
`src/tests`), `npm run test:db` (Docker Postgres + RLS suite), `npm run build`.

Preview mode: when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset the
app serves the seeded catalogue in `src/lib/demo` and every write returns
`CONFIG_REQUIRED_MESSAGE`. Never fake a successful auth, upload, save or publish.

Server-side authority: `getViewer()` in `src/lib/auth/session.ts` for identity, `requireUser` /
`requireAdmin` in pages, and ownership + admin checks duplicated in SQL functions
(`supabase/migrations/0005_functions.sql`) and RLS (`0006_rls.sql`).

Access rules:
- Private events use `public.can_view_event()` (`0008_private_events.sql`). Never add a policy that
  reads `events` directly; call the helper so children stay consistent with their parent.
- `canViewEvent()` in `src/lib/utils/events.ts` mirrors the SQL rule. Change both together.
- Registration requires `date_of_birth`; `registerSchema` rejects under-18s and
  `handle_new_user()` re-checks in the database (`0009_age_restriction.sql`). Never trust the form.
- Accounts without a stored date of birth cannot publish, edit or restore events.
  `enforce_verified_organiser()` (`0011_age_verification.sql`) is the authority; the UI gate is
  `requireVerifiedAdult()` and the one-field screen is `/verify-age` (`set_my_date_of_birth`).
- Event covers are private. `events.hero_image_url` holds an https link or an object path
  (`<organiser-uuid>/<file>`). Sign paths server-side with `resolveEventImages()` in
  `src/lib/services/storage.ts`; never call `getPublicUrl()` and never send a raw path to the browser.
  `can_read_event_image()` (`0010_private_event_images.sql`) decides who may read a file.

Gotchas:
- Event statuses are only `published` / `archived` / `removed` (no draft).
- The splash hides itself via `html[data-splash="seen"]`; it runs once per browser session.
- `weekendRange` targets the upcoming Friday for Monday-Thursday.
- Dates are constructed with `toInstant(date, time, tz)`; Africa/Lagos is a fixed UTC+1.
