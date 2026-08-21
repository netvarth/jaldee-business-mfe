# mfe-karty — Preview Test Runbook (live backend)

> Goal: run **mfe-karty against a live `feature-commerce-service`**, through the
> shell-host, and click through every screen with the network tab open — the open
> **P1.7** verification item (zero 404s, no mock rows).
> Written 2026-07-31 from the code on disk.

---

## Why it has to go through shell-host

Karty's standalone dev server (`vite --port 3005`) **cannot** do a live-backend
preview on its own:

- **No proxy.** `src/services/useCommerceApi.ts` fetches the *relative* URL
  `/commerce-service/v1/api/...`. Karty's `vite.config.ts` has **no `server.proxy`**,
  so standalone those calls hit `localhost:3005` and 404.
- **No auth.** In the browser `authToken` from `MFEProps` is empty (an HttpOnly
  cookie carries auth). Only the shell-host performs login and holds that cookie.

The **shell-host** solves both: its `vite.config.ts` proxies `/commerce-service/**`
to the gateway, and its login flow sets the auth cookie that every proxied call
reuses via `credentials: "include"`.

**Also:** `vite dev` does **not** emit `/assets/remoteEntry.js`. Federation remotes
must be **built + previewed** (`turbo serve` / `vite preview`), never `vite dev`.

---

## Ports & routing (as configured)

| Piece | Port | Notes |
|---|---|---|
| shell-host (host UI) | **4000** | `vite --port 4000 --strictPort` |
| mfe-karty remote | **3005** | `vite preview --port 3005 --strictPort` — shell loads `VITE_KARTY_URL=/mfe-karty` → proxied to `localhost:3005` |
| API gateway | **8080** | all `/<svc>-service/**` routes |
| commerce-service | **9105** | context-path `/commerce-service` |
| Eureka | 8761 | start first |
| Config server | 8888 | start second |
| auth-service | 9001 | login |
| base-crm-service | 9002 | login calls this; users screen uses `/base-service` |

**Proxy target resolution (shell `.env.development`):**
`VITE_AUTH_SERVICE_PROXY_TARGET=http://localhost:8080`, and
`VITE_COMMERCE_SERVICE_PROXY_TARGET` is unset → it inherits the auth target, so
`/commerce-service/**` → **`localhost:8080` (gateway)** → commerce-service. No edit
needed. (The code fallback if the env var were missing is `192.168.29.87:8080`, a
LAN box that has been down — but the env file overrides it to localhost.)

---

## Step 1 — Backend up (ms2 repo)

Start order matters: **Eureka → Config → Gateway → services.** The all-in-one
script does this and waits on ports:

```bash
cd ~/IdeaProjects/jaldee\ ms2
./start-all-services.sh
```

For a leaner boot (just what karty login + data needs) start, in order:
Eureka (8761), Config (8888), Gateway (8080), auth-service (9001),
base-crm-service (9002), commerce-service (9105).

**Verify commerce is reachable both directly and through the gateway:**

```bash
curl http://localhost:9105/commerce-service/v1/health   # direct
curl http://localhost:8080/commerce-service/v1/health   # via gateway  ← the path karty uses
```

Both must return healthy before continuing. Logs land in `logs/run/<service>.log`.

---

## Step 2 — Frontend build + preview (MFE repo)

`npm run serve` = turbo builds **all** MFEs and previews them (this is the only mode
that produces valid `remoteEntry.js` files):

```bash
cd ~/Documents/UI/jaldee-business-mfe-main
npm install            # first run only
npm run serve          # shell on :4000, karty remote on :3005
```

Watch the karty task in the turbo output and confirm it emits
`apps/mfe-karty/dist/assets/remoteEntry.js`.

> **The on-disk `remoteEntry.js` is stale (built Jul 27); source changed Jul 29–30
> (Stores search, Orders, SalesReturns).** The rebuild in this step is what actually
> ships the latest screens — don't skip it and preview the old bundle.

Faster iteration on just karty (after the first full `npm run serve`):

```bash
# rebuild + re-preview karty only, in its own terminal
cd apps/mfe-karty && npm run build && npm run serve   # :3005
# and run the shell host in another terminal
cd apps/shell-host && npm run serve                   # :4000
```

---

## Step 3 — Log in & open karty

1. Open **http://localhost:4000**.
2. Log in — auth mode is `token`, so it's a password login against auth-service
   (test numbers get OTP `555555`). Confirm the auth cookie is set (DevTools →
   Application → Cookies).
3. Navigate to **`/karty/orders`** (the shell's karty landing route).

If a screen shows an empty state rather than data, that can be legitimate: the
commerce **Consumer snapshot is selective-sync**, so Customers may be empty until
consumers sync into `consumer_snapshot_tbl`. Empty ≠ bug.

---

## Step 4 — Smoke test (zero-404 pass)

Open the Network tab, visit each route, and confirm the listed call returns **200**
(or a legitimate empty `[]` / `Page` with `content: []`) — **never 404, never a mock
row**. All paths below are prefixed `/commerce-service` and proxied to the gateway.

### Overview & dashboards
- [ ] `/karty/` (Overview) — analytics KPIs via `@jaldee/shared-modules` analytics service
- [ ] `/karty/orders/dashboard` — order analytics
- [ ] `/karty/inventory/dashboard` — `GET /v1/api/tenant/inventory/aggregate` + analytics

### Orders
- [ ] `/karty/orders` — `GET /v1/api/tenant/orders`
- [ ] `/karty/orders/catalogs` — `GET /v1/api/tenant/order-catalogs`
- [ ] `/karty/orders/requests` — `GET /v1/api/tenant/order-requests`
- [ ] `/karty/orders/sales-returns` — `GET /v1/api/tenant/sales-returns` *(create flow ported Jul 30 from dead `inventorynew`; status enum is DRAFT/PENDING/COMPLETED — verify create posts a valid status)*
- [ ] `/karty/orders/active-carts` — `GET /v1/api/tenant/carts/active`
- [ ] `/karty/orders/logistics` — `GET /v1/api/tenant/delivery-partners`
- [ ] `/karty/orders/delivery-profiles` — `GET /v1/api/tenant/delivery-profiles`
- [ ] `/karty/orders/:uid` (order detail) — single-order fetch + line items

### Inventory
- [ ] `/karty/inventory/inventory-catalogs` — `GET /v1/api/tenant/inventory-catalogs`
- [ ] `/karty/inventory/purchases` — `GET /v1/api/tenant/purchases`
- [ ] `/karty/inventory/purchase-returns` — `GET /v1/api/tenant/purchase-returns`
- [ ] `/karty/inventory/transfers` — `GET /v1/api/tenant/stock-transfers`
- [ ] `/karty/inventory/adjustments` — `GET /v1/api/tenant/stock-adjustments/history`
- [ ] `/karty/inventory/items` — `GET /v1/api/tenant/items`
- [ ] `/karty/inventory/stores` — `GET /v1/api/tenant/stores` **+** `POST /v1/api/tenant/stores/search` *(new Jul 29 structured filter — exercise a filter)*
- [ ] `/karty/inventory/vendors` — `GET /v1/api/tenant/vendors`
- [ ] `/karty/inventory/stocks` — `GET /v1/api/tenant/inventory-stock`
- [ ] `/karty/inventory/audit-log` — `GET /v1/api/tenant/audit-logs`

### Customers / users / settings
- [ ] `/karty/customers` — `GET /v1/api/tenant/customers` *(may be empty pre-sync)*
- [ ] `/karty/users` — `GET /base-service/v1/api/tenant/users` *(base-crm, not commerce)*
- [ ] `/karty/settings` — `GET /v1/api/tenant/commerce-settings`, `/v1/api/tenant/tax`, `/v1/api/tenant/units`
- [ ] `/karty/drive/*` — drive backend (platform-service)

### CRUD spot-checks (not just reads)
- [ ] Create/edit a **Store** → persists, reflected on reload
- [ ] Create a **Sales Return** → posts a valid status, restocks on completion
- [ ] Create/edit an **Item**, **Vendor**, **Purchase** → round-trips

### Known placeholders (expected — not failures)
`/karty/finance`, `/karty/tasks`, `/karty/membership`, `/karty/leads` render a
`PlaceholderScreen` by design (finance/tasks/membership/leads are owned elsewhere or
not yet in karty scope).

---

## Pass criteria

- Every routed screen loads with **no `RENDER_FAILED`**.
- **Zero 404s** in the Network tab across the checklist.
- **No mock/seeded rows** — real data or an honest empty/error state.
- Karty `remoteEntry.js` was **freshly built** this run (not the stale Jul 27 bundle).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Karty screen blank / `RENDER_FAILED` in shell | stale or missing `remoteEntry.js` | re-run `npm run serve` (never `vite dev` for the remote) |
| All commerce calls 404 | previewing karty standalone (no proxy) | go through shell-host on :4000 |
| Commerce calls 401/403 | not logged in / no auth cookie | log in via shell first; check the cookie is set |
| Commerce calls hit `192.168.29.87:8080` and time out | `VITE_COMMERCE_SERVICE_PROXY_TARGET` picked up a stale value | ensure shell `.env.development` sets the auth/base proxy target to `localhost:8080` |
| Gateway 503 / login returns 400 | a downstream (base-crm) is down | auth calls base-crm on every login; confirm 9002 is up |
| Customers list empty | consumer snapshot selective-sync | expected; not a bug |

---

## Optional: run it from Claude Code on the Mac

Open Claude Code at `~/Documents/UI/jaldee-business-mfe-main` and paste:

```
Preview-test mfe-karty against the live backend.

1. Confirm the backend is up: curl http://localhost:8080/commerce-service/v1/health
   (if it fails, tell me — I'll start ./start-all-services.sh in the ms2 repo first).
2. In this repo: npm run serve (turbo builds all remotes + previews; shell on :4000,
   karty remote on :3005). Do NOT use vite dev — it doesn't emit remoteEntry.js.
3. Watch the karty build task; confirm apps/mfe-karty/dist/assets/remoteEntry.js is
   produced (current one is stale, Jul 27 — source changed Jul 29-30).
4. Report the shell URL and any build/tsc errors. Don't enter any secrets.
```
