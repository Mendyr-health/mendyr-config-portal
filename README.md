# Mendyr Admin Console (config portal)

The super-admin console for [Mendyr](../Mendyr-Backend): verify professionals, run day-to-day
operations, and control what the patient and professional apps show through typed,
server-validated config.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v3. Dependency-light
on purpose: the only runtime dependencies are `next`, `react` and `react-dom`. Icons are
inline SVG (`src/components/ui/Icon.tsx`) and charts are hand-rolled SVG
(`src/components/ui/charts.tsx`) — no icon pack, chart library, state library or component kit.

## Setup

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to the backend's base URL
npm install
npm run dev                  # http://localhost:3010
```

The backend must allow this origin in `CORS_ORIGINS` (see Mendyr-Backend's `.env`) — for local
dev, add `http://localhost:3010`.

## Screens

| Route | What it does | Who |
|---|---|---|
| `/dashboard` | Overview: GMV, revenue, bookings today, active visits, fill / cancellation rate, time to assign, rating, 14-day bookings chart, signups, locations, status breakdowns | all |
| `/verification` | Verification queue: onboarding stats, auto-approve banner, status tabs, professional drawer (documents, availability, history) with Approve / In review / Reject | all read; admin decides |
| `/professionals` | Every professional, same drawer | all |
| `/bookings` | Status tabs, search, date range; drawer with timeline, people, price, notes, vitals, rating; Cancel (with reason) and Reopen | all (ops can act) |
| `/users` | Role/status filters, search; suspend / reactivate with reason | all read; admin acts |
| `/catalogue` | Categories CRUD; services table + editor (image, tagline, badge, includes/excludes, FAQs, price, duration, flags) | all read; admin edits |
| `/app-config` | Typed editor per registered config key with live previews, diff, reset to default and change history | admin |
| `/configs` | Generic JSON editor for custom (unregistered) keys | admin |
| `/activity` | Audit log as readable sentences, filterable by type | all |
| `/query-info` | Saved read-only SQL; run with paged results | admin |

The top-bar search (⌘K / Ctrl+K) jumps to bookings by code, or searches users and
professionals by name or phone.

## Auth and roles

Sign in with an `admin`, `super_admin` or `ops` account (see
`Mendyr-Backend/scripts/create_admin.py`). This calls `POST /auth/login` with
`X-Client-Platform: web`, keeps the tokens in `sessionStorage` (per tab, cleared when the
browser closes) and silently refreshes once via `POST /auth/token/refresh` on a `401`. If the
refresh fails the console returns to `/login`.

- **admin / super_admin** — full access.
- **ops** — read-mostly: sees operations screens and can cancel / reopen bookings. Review,
  suspend, catalogue and config actions are hidden or disabled, and App Config / Queries
  aren't shown (the backend rejects ops for those endpoints anyway).

The role check in the browser is UX only; the backend (`require_admin`,
`require_ops_or_admin`) is the real boundary.

## App Config

`GET /configs/registry` lists every typed key (feature flags, theme, home layout, banners,
onboarding, copy, support, versions, maintenance, refresh intervals, booking rules, cancel
reasons, professional settings, pricing, verification policy, privacy). Each has its own
editor in `src/components/config/editors/` — never raw JSON. Saving calls
`PUT /configs/by-key/{key}`; the server validates against the same Pydantic model the apps rely
on and returns a readable 422 that's shown inline. "Reset to default" deletes the stored row
(`DELETE /configs/{id}`). History comes from `GET /admin/activity?entity_type=config&entity_id=<key>`
and shows a before/after diff per change. `catalog.content` is edited from Catalogue.

## Project layout

```
src/app/(portal)/         authenticated screens (shared shell + guard in layout.tsx)
src/app/login/            sign-in
src/components/ui/        design system: Button, Field/Input/Select, Switch, Badge, Card,
                          Table, Tabs, Modal/Drawer (focus trap, Esc), Toast, Icon, charts
src/components/shell/     sidebar (collapsible, mobile drawer) and top bar
src/components/config/    App Config studio, editors, diff
src/lib/                  API client, auth, formatting (en-IN money, IST dates), labels
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3010 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, typescript-eslint recommended) |
| `npm run type-check` | `tsc --noEmit` |

## Known limitations

- Tokens live in `sessionStorage`, so closing the tab signs you out.
- The activity log carries the actor's name but not the subject's, so entries read
  "Kartik approved a professional" with a link to open the record, rather than naming them.
- Booking status counts on the Bookings tabs come from the dashboard overview (all-time),
  not from the current search or date filter.
- Sorting a table column sorts the rows on the current page; the server decides page order.
