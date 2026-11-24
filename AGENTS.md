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
`src/tests`), `npm run build`.

Preview mode: when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset the
app serves the seeded catalogue in `src/lib/demo` and every write returns
`CONFIG_REQUIRED_MESSAGE`. Never fake a successful auth, upload, save or publish.

Server-side authority: `getViewer()` in `src/lib/auth/session.ts` for identity, `requireUser` /
`requireAdmin` in pages, and ownership + admin checks duplicated in SQL functions
(`supabase/migrations/0005_functions.sql`) and RLS (`0006_rls.sql`).

Gotchas:
- Event statuses are only `published` / `archived` / `removed` (no draft).
- The splash hides itself via `html[data-splash="seen"]`; it runs once per browser session.
- `weekendRange` targets the upcoming Friday for Monday-Thursday.
- Dates are constructed with `toInstant(date, time, tz)`; Africa/Lagos is a fixed UTC+1.
