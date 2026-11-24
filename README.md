# Oblee — find the party you love

Oblee is an African event and party discovery platform. Attendees discover events, browse
categories, search and filter, save favourites and find places to enjoy. Organisers publish
and manage their own events. Administrators keep the catalogue healthy: users, events,
reports and featured placements.

This repository contains the first-release web application: a Next.js App Router + TypeScript
front end, Supabase (Postgres, Auth, Storage) as the backend, and Row Level Security as the
authority for every write.

The original design prototype is kept in [`design/oblee-prototype.html`](design/oblee-prototype.html)
as the visual reference. The running app preserves that interface: purple identity, mobile-first
phone frame, category rails, featured carousel, event cards, detail sheet, organiser wizard,
profile archive and map/contact actions.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components, Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + the prototype's design tokens in `src/app/globals.css` |
| Database | Supabase Postgres with SQL migrations in `supabase/migrations` |
| Auth | Supabase Auth (email + password, verification, password recovery) |
| Storage | Supabase Storage bucket `event-images` for event covers |
| Validation | Zod schemas shared by client forms and server actions |
| Tests | Vitest + Testing Library |
| Deployment | Vercel-compatible (no server state, only public Supabase keys on the client) |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project values
npm run dev                  # http://localhost:3000
```

Useful scripts:

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit tests
npm run build       # production build
```

### Preview mode

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the app runs in
preview mode: the seeded Lagos/Ibadan catalogue is served from `src/lib/demo`, discovery,
search, filtering, event details and the organiser wizard all render, and any write that needs
a backend reports that Supabase is not connected. Nothing pretends a sign-in, upload, save or
publish succeeded.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Add the environment variables below (locally in `.env.local`, on Vercel in
   **Project Settings → Environment Variables**).
3. Apply the migrations, in order, with the Supabase CLI or the SQL editor:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. In **Authentication → URL Configuration**, set the Site URL to your deployed URL and add
   `https://your-domain/auth/callback` to the redirect allow-list.
5. Grant the first administrator manually (there is no self-service admin sign-up):

   ```sql
   update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
   ```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon/public key. Safe in the browser; RLS still applies |
| `NEXT_PUBLIC_SITE_URL` | recommended | Base URL used in verification and password-reset emails |
| `ALLOWED_DEV_ORIGINS` | optional | Comma-separated extra origins allowed to hot-reload in development |

The service-role key is never used by this app. Do not add it to any `NEXT_PUBLIC_` variable.

## Database

Migrations live in `supabase/migrations` and are idempotent where practical:

| File | Contents |
| --- | --- |
| `0001_init.sql` | Extensions, enums (`user_role`, `event_status`, `event_visibility`, `event_category`, `contact_kind`, `report_status`), shared triggers |
| `0002_profiles.sql` | `profiles` mirroring `auth.users`, sign-up trigger, role-change guard, self upgrade attendee → organiser |
| `0003_events.sql` | `events`, `event_tickets`, `event_tables`, `event_contacts`, indexes for discovery |
| `0004_saves_reports_featured.sql` | `saved_events`, `event_reports`, featured placement columns and constraints |
| `0005_functions.sql` | `create_event`, `update_event`, `archive_event`, `remove_event`, `set_event_featured`, `report_event`, `resolve_event_report`, `set_user_role`, `admin_list_users`, `promote_to_organiser` — every one checks the caller |
| `0006_rls.sql` | Row Level Security for every table |
| `0007_storage.sql` | `event-images` bucket and per-user storage policies |

### Roles and security

* Roles live in `public.profiles.role` (`attendee`, `organiser`, `admin`). The client never
  decides its own role; every action re-reads the profile server-side via `getViewer()`.
* Event ownership is checked in the database and again in server actions. An organiser can only
  edit, archive or re-publish their own events; admins can act on any event.
* Featured placement, report triage and role changes are admin-only database operations. The UI
  hides the controls, and RLS/policies reject the write even if a client sends it.
* Saved events, drafts and archived listings stay private to their owner.
* The Supabase server client (`src/lib/supabase/server.ts`) and the data services in
  `src/lib/services/*` are only imported from server components and server actions, so no
  privileged call ever runs in the browser.

## Application structure

```
src/
  app/
    (main)/            discovery shell: home, explore, saved, profile
    events/            detail, create wizard, edit
    admin/             dashboard, users, events, reports, featured
    login|register|forgot-password|reset-password|verify-email|auth/callback
    terms|privacy|not-found|error
  components/
    layout/            app frame, header, bottom nav, splash, appearance sheet
    events/            cards, carousel, filters, save/share/report/book actions, map
    organiser/         multi-step event wizard
    admin/             admin tabs and moderation controls
    auth|profile|ui/   forms, profile pieces, icons, buttons, empty states
  lib/
    actions/           server actions (auth, events, saves, reports, admin)
    services/          data access (events, admin) — Supabase or demo data
    supabase/          browser client, server client, middleware/proxy helpers
    validation/        Zod schemas
    types/             domain types and generated database types
    demo/              seeded preview catalogue
    utils/             formatting, filtering, pagination, request helpers
supabase/migrations/   SQL schema, policies, storage
design/                the supplied visual prototype (reference only)
```

## Pages and features

* **Home** — category rail, search, date jump, quick filters, featured carousel, upcoming list.
* **Explore** — search + category + date filtering with pagination, saved-state aware cards.
* **Event detail** — hero cover, schedule, venue, directions link, security/identity notes,
  ticket and table pricing, RSVP contact buttons (WhatsApp/call/email), embedded map, save,
  share, report.
* **Saved** — the signed-in attendee's bookmarked events.
* **Profile** — attendee profile; organisers also get their published and archived events with
  edit/archive actions and an attendee → organiser upgrade.
* **Create / edit event** — four-step wizard (basics, media upload, details, review), validation
  per step, ownership-checked updates.
* **Admin** — dashboard counters, user role management, event moderation, report queue,
  featured toggles.
* **Auth** — register (attendee or organiser), login, logout, email verification, password
  recovery, protected routes and callback handling.

## Deployment

The app is a standard Next.js project with no custom server. On Vercel: import the repository,
add the environment variables above, and deploy. `proxy.ts` refreshes the Supabase session
cookie on navigation; no other runtime configuration is required.

## Known limitations

* Payments and ticketing are out of scope for this release. Prices are display data and the
  RSVP buttons open the organiser's own WhatsApp, phone or email.
* Images are uploaded to Supabase Storage; preview mode falls back to generated gradient covers.
* Admin bootstrap is a manual SQL update so that no privileged account can be self-created.
* The demo catalogue is fixed sample content; it is replaced by live data as soon as Supabase
  credentials are configured.
