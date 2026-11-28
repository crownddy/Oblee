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
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical base URL. Used for auth emails, canonicals, `robots.txt`, `sitemap.xml` and structured data. Set it to the production origin before deploying |
| `GOOGLE_SITE_VERIFICATION` | optional | Google Search Console HTML-tag token. Rendered only when set; never commit a value |
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
| `0008_private_events.sql` | `event_access` grants, `can_view_event()` / `can_manage_event()`, private-aware policies for every related table, `grant_event_access()` / `revoke_event_access()` |
| `0009_age_restriction.sql` | `profiles.date_of_birth`, an 18+ check constraint, and a sign-up trigger that refuses under-18 accounts |
| `0010_private_event_images.sql` | `event-images` bucket switched to private, `can_read_event_image()` and the storage read policy, legacy public URLs rewritten to object paths, per-organiser image ownership trigger |
| `0011_age_verification.sql` | `my_age_status()`, `set_my_date_of_birth()`, `is_verified_adult()`, the publish trigger for unverified accounts, and `admin_list_users().age_verified` |
| `0012_content_limits.sql` | Length caps on the short event text fields and `is_valid_timezone()`, so a direct RPC call cannot store megabytes on a row or a timezone that breaks date formatting |
| `0013_featured_cleanup.sql` | `archive_event` also deletes the event's `featured_events` row, so an archived event cannot hold a carousel slot |

### Roles and security

* Roles live in `public.profiles.role` (`attendee`, `organiser`, `admin`). The client never
  decides its own role; every action re-reads the profile server-side via `getViewer()`.
* Event ownership is checked in the database and again in server actions. An organiser can only
  edit, archive or re-publish their own events; admins can act on any event.
* Featured placement, report triage and role changes are admin-only database operations. The UI
  hides the controls, and RLS/policies reject the write even if a client sends it.
* Event covers live in a private bucket. `events.hero_image_url` stores either an https artwork
  link or an object path such as `<organiser-uuid>/<image-uuid>.jpg`. The app mints signed URLs
  (one hour) for the current viewer, and `can_read_event_image()` only signs files whose event the
  viewer may already read — plus the uploader's own folder and administrators.
* A signed cover URL is a temporary bearer credential: anyone holding it can fetch that one file
  until it expires (`SIGNED_IMAGE_URL_TTL`, one hour). URLs are minted per request, never written to
  the database, logged or included in emails, and the bucket itself is private.
* Publishing needs a verified 18+ account. `enforce_verified_organiser()` refuses any INSERT or
  UPDATE that leaves an event published for an unverified organiser, so the rule holds even if a
  client skips the UI. Accounts created before `0009` verify once at `/verify-age`.
* Saved events, drafts and archived listings stay private to their owner.
* Private events are readable only by the organiser, administrators and attendees with an explicit
  row in `public.event_access`. The rule is implemented once, in `public.can_view_event()`, and
  reused by the `events`, `event_ticket_tiers`, `event_tables`, `event_contacts`, `saved_events`
  and `featured_events` policies, so a direct PostgREST query cannot reach the children of a
  private event. See [Private events](#private-events).
* Registration requires a date of birth and the database refuses under-18 accounts. The date of
  birth is not granted to `anon` or `authenticated` at the column level, so clients cannot read
  it back, and no identity document is ever requested or stored.
* The Supabase server client (`src/lib/supabase/server.ts`) and the data services in
  `src/lib/services/*` are only imported from server components and server actions, so no
  privileged call ever runs in the browser.

### Private events

A published event with `visibility = 'private'` is not public. It is visible only to:

1. its organiser,
2. administrators,
3. attendees holding a row in `public.event_access` for that event.

Access is granted and revoked by the organiser or an administrator through
`public.grant_event_access(event_id, email)` and `public.revoke_event_access(event_id, user_id)`.
Both functions check `can_manage_event()` and are the only write path to `event_access`; the table
has no `insert`/`update`/`delete` grants for clients. From SQL:

```sql
select public.grant_event_access('<event-uuid>', 'guest@example.com');
select public.revoke_event_access('<event-uuid>', '<user-uuid>');
```

The grant only applies while the event is published. Archiving or removing the event hides it
again, and saved-event rows can only be created for events the caller can already see.

### Tests

```bash
npm test        # unit tests (validation, discovery, private access, age rules)
npm run test:db # migrations + RLS tests against a throwaway Postgres container
```

`npm run test:db` starts `postgres:16-alpine` in Docker, applies every migration and runs
`supabase/tests/rls_private_events.sql` as the `anon`, `authenticated` and organiser roles, so the
assertions go through the same permission checks a real Supabase client would hit.

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

* **Home** — category rail, search, date jump, quick filters, featured carousel (admin
  placements, or the discovery page when nothing is featured), upcoming list.
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

## Search discoverability

Public pages are server-rendered, so titles, descriptions, headings and event details are in the
first HTML response. Signed-in pages send `noindex` and are also disallowed in `robots.txt`.

| Piece | Where | Behaviour |
| --- | --- | --- |
| `robots.txt` | `src/app/robots.ts` | Allows `/`, disallows `/admin`, `/settings`, `/saved`, `/profile`, `/auth/` and `/events/*/edit`, and points at the sitemap |
| `sitemap.xml` | `src/app/sitemap.ts` | Home, `/explore`, `/privacy`, `/terms`, plus every published and public event; rebuilt hourly (`revalidate = 3600`) |
| Canonicals | `src/lib/seo.ts` | One canonical per page; tracking parameters (`utm_*`, `fbclid`, `gclid`) are dropped, `q`/`cat`/`date`/`page` are kept |
| Filtered home views | `src/app/(main)/page.tsx` | `noindex, follow` — a filtered home URL repeats `/explore`, so it is kept out of the index instead of being canonicalised to `/` |
| Event metadata | `src/lib/seo.ts` | Title, stored description, canonical, Open Graph and Twitter tags for public published events; `noindex` for private and archived ones |
| Structured data | `src/lib/seo.ts`, `src/app/layout.tsx` | `WebSite` and `Organization` site-wide, `Event` on public published events. Values come from the event row; end dates, performers and images are omitted because they are not stored |
| Social card | `src/app/opengraph-image.tsx` | 1200×630 brand card for every page. Event covers are private-bucket signed URLs, so they are not reused |
| Invalid ids | `src/lib/services/events.ts` | A malformed id resolves to "no event" without querying, so `/events/not-a-uuid` is a 404 rather than a database error |

Canonical, sitemap and structured-data URLs come from `NEXT_PUBLIC_SITE_URL`, so production must set
it to the public origin. Unset, it falls back to `http://localhost:3000`.

### Google Search Console

1. Add the production domain as a property in Search Console.
2. Choose the HTML tag method and copy the token from `content="…"`.
3. Set `GOOGLE_SITE_VERIFICATION` to that token in the deployment environment (Vercel → Settings →
   Environment Variables) and redeploy.
4. Verify the property, then submit `https://<domain>/sitemap.xml` under *Sitemaps*.

The tag is rendered only when the variable is present; no token is stored in the repository.
Verification and indexing cannot be confirmed from the repository alone: they need the deployed
domain and a Search Console account.

## Deployment

The app is a standard Next.js project with no custom server. On Vercel: import the repository,
add the environment variables above, and deploy. `src/proxy.ts` refreshes the Supabase session
cookie on navigation; no other runtime configuration is required. `NEXT_PUBLIC_*` values are baked
into the build, so set them before the first deploy, not afterwards.

## Known limitations

* Payments and ticketing are out of scope for this release. Prices are display data and the
  RSVP buttons open the organiser's own WhatsApp, phone or email.
* Images are uploaded to Supabase Storage; preview mode falls back to generated gradient covers.
* Admin bootstrap is a manual SQL update so that no privileged account can be self-created.
* The demo catalogue is fixed sample content; it is replaced by live data as soon as Supabase
  credentials are configured.
* Private-event grants are issued with `grant_event_access()` / `revoke_event_access()`; there is no
  organiser screen for them yet in this release.
* Signed cover URLs expire after one hour. Pages are rendered per request, so a page that sits
  open for more than an hour shows gradient covers until it is refreshed.
* Search Console verification and indexing cannot be confirmed from the repository: they need the
  deployed domain, the `GOOGLE_SITE_VERIFICATION` secret and a Search Console account. In preview
  mode the sitemap lists the fixed public pages only, because no event records exist.
* Core Web Vitals were not measured with field data (no CrUX access). Only causes visible in the
  build were addressed: image dimensions on the splash, font `display: swap`, and one database
  round trip shared between metadata and page render instead of two.
* `npm run test:db` needs Docker. Without it, `npm test` still covers the shared application rules.
* Existing accounts created before `0009_age_restriction.sql` keep a null `date_of_birth` until a
  date is submitted at `/verify-age`. Until then they can browse, save and archive, but cannot
  publish, edit or restore events. Age is self-declared; Oblee does not collect identity documents.
