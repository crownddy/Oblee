<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Oblee project notes

Oblee is a Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind 4 app backed by
Supabase (Postgres, Auth, Storage). The visual reference is `design/oblee-prototype.html`;
the running UI must keep that purple, mobile-first phone-frame design.

The session-refresh proxy must stay at `src/proxy.ts`: Next resolves the convention relative to
`src/app`, so a root-level file is silently ignored and tokens stop refreshing.

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
- Password policy lives in `src/lib/validation/password.ts` (`PASSWORD_MIN_LENGTH` 8,
  `PASSWORD_MAX_LENGTH` 200). `registerSchema`, `resetPasswordSchema` and the live checklist in
  `PasswordField` all read those constants, so change the policy there and nowhere else. Client
  checks are advisory; Supabase Auth stays the authority, and `describeAuthError()` in
  `src/lib/auth/errors.ts` turns its failures into safe, actionable copy without echoing internals.
- `Modal` (`src/components/ui/Modal.tsx`) portals its sheet into `#app`. Keep it that way: rendered
  in place it inherits the action bar's `position: relative` and gets clipped to the bar. It focuses
  `[data-autofocus]` on open, restores focus on close, traps Tab and ignores Escape when
  `dismissible={false}` (use that while a request is in flight).
- Signup and password reset share `usePasswordPair()` (`src/components/auth/usePasswordPair.ts`).
  Add password rules there or in `src/lib/validation/password.ts`, never in one form alone.
- Bottom navigation labels are single words (`Home`, `Explore`, `Saved`, `Settings`) and the
  settings tab uses the `gear` icon. `/profile` stays reachable from the header avatar; the bottom
  bar is not a profile tab.
- Action results surface through `Alert` (`src/components/ui/Alert.tsx`): errors are
  `role="alert"` / assertive, the other tones are `role="status"` / polite, every alert carries a
  labelled close button, and nothing auto-dismisses. `useStatusAlert()` / `useAuthAlert()` own the
  dismissal state; `routeAuthMessage()` (`src/lib/auth/fieldErrors.ts`) keeps password complaints on
  the field so one failure is never reported twice.
- Accounts without a stored date of birth cannot publish, edit or restore events.
  `enforce_verified_organiser()` (`0011_age_verification.sql`) is the authority; the UI gate is
  `requireVerifiedAdult()` and the one-field screen is `/verify-age` (`set_my_date_of_birth`).
- Event covers are private. `events.hero_image_url` holds an https link or an object path
  (`<organiser-uuid>/<file>`). Sign paths server-side with `resolveEventImages()` in
  `src/lib/services/storage.ts`; never call `getPublicUrl()` and never send a raw path to the browser.
  `can_read_event_image()` (`0010_private_event_images.sql`) decides who may read a file.
- Stored text is capped in SQL as well as in Zod (`0012_content_limits.sql`), because a client can
  call the RPCs directly. Timezones must be real IANA names; `normaliseTimezone()` guards rendering.
- `next` parameters always go through `safeNextPath()`, which resolves against a throwaway base so
  `//host`, `/\host` and control-character tricks cannot leave the site.
- Back and close controls go through `canGoBack()` / `goBackToOrigin()` in
  `src/lib/navigation/history.ts` so the screen a page was opened from comes back; the route's own
  `backHref` / `fallback` is only used for a direct entry (shared link, new tab).
  `NavigationMemory` in `AppShell` keeps that trail and each screen's `.body` scroll offset, because
  pages scroll inside `.body` where the browser's own scroll restoration cannot reach.

Gotchas:
- Event statuses are only `published` / `archived` / `removed` (no draft).
- The splash hides itself via `html[data-splash="seen"]`; it runs once per browser session.
- `weekendRange` targets the upcoming Friday for Monday-Thursday.
- Dates are constructed with `toInstant(date, time, tz)`; Africa/Lagos is a fixed UTC+1.
