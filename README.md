# Mendyr Config Portal

Admin-only web UI for managing the `configs` key/value entries in the
[Mendyr-Backend](../Mendyr-Backend) API (`GET/POST/PATCH/DELETE /api/v1/configs`) — the same
entries that drive both UI and backend feature-flag-style behavior.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS. No state library or component
kit — a small internal CRUD tool, kept dependency-light on purpose.

## Setup

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL to the backend's base URL
npm install
npm run dev                  # http://localhost:3010
```

The backend must allow this origin in `CORS_ORIGINS` (see Mendyr-Backend's `.env`) — for local
dev, add `http://localhost:3010`.

## Auth

Sign in with an existing **admin** account (see `Mendyr-Backend/scripts/create_admin.py` for how
to provision one). Under the hood this calls `POST /auth/login` with
`X-Client-Platform: web`, stores the returned `access_token`/`refresh_token` in
`sessionStorage` (per-tab, cleared on browser close), and silently refreshes once via
`POST /auth/token/refresh` if a request comes back `401`.

Non-admin accounts can sign in (the JWT `role` claim is checked client-side) but see an
"Admins only" screen instead of the config table — the real enforcement is server-side
(`require_admin` on the mutating endpoints; `GET /configs` only requires *any* authenticated
user), this is just a UX guard, not a security boundary.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3010 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, typescript-eslint recommended) |
| `npm run type-check` | `tsc --noEmit` |

## Known limitations

- Tokens live in `sessionStorage` — fine for an internal tool, but means signing in again after
  closing the tab/browser. If this needs to persist more gracefully, do a silent refresh on load
  instead of storing the access token longer-lived.
- The backend already sets an `httponly` refresh-token cookie for `X-Client-Platform: web`
  clients, but nothing server-side consumes it yet (`POST /auth/token/refresh` still requires the
  refresh token in the request body) — this portal doesn't rely on the cookie for that reason.
