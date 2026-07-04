# TODOS

Deferred work identified during plan review. Each item: what, why, effort,
priority, dependencies. Not a backlog dump — pick these up deliberately.

## P1 — Deploy the Django backend somewhere reachable

**What:** Stand up the backend (Railway/Render/VPS/etc.), point Vercel's
`NEXT_PUBLIC_API_URL` at it, confirm `channels`+`daphne`+`channels_redis`
resolve correctly for whatever real-time features get turned on.

**Why:** The live site (`tourkia.vercel.app`) currently has no working
backend at all — every "real" feature in this codebase (bookings, auth,
finance ledger, everything) is inert for actual users. The site runs
entirely on frontend fallback/demo data.

**Context:** Discovered 2026-07-04 during `/autoplan` review of the
websocket-auth + order-amount-calculation plan. Confirmed via `.env.example`
(`NEXT_PUBLIC_API_URL=http://localhost:8000`) and user confirmation that only
the frontend is deployed.

**Effort:** L (human) → M (CC+gstack, excluding hosting/cost decisions).
**Priority:** P1 — likely the most important next conversation for this
project, separate from and bigger than any single bug fix.
**Depends on:** nothing.

## P2 — Make the real-time restaurant dashboard actually deployable

**What:** Add a Redis service to `docker-compose.yml`, swap the backend's
production command from `gunicorn backend.wsgi:application` (WSGI) to an
ASGI server (daphne/uvicorn) so `asgi.py`/`routing.py` are actually served.

**Why:** The websocket-based real-time restaurant order dashboard cannot run
in production as currently configured — it's orphaned code from the earlier
"Real-time Restaurant Dashboard" feature commit. `channels`/`daphne` are now
in `requirements.txt` (added 2026-07-04) so the code imports and is testable,
but that alone doesn't make the feature runnable in production — it still
needs a Redis service and an ASGI-serving process.

**Pros:** Unlocks a feature that was already built (models, signals, frontend
dashboard UI) but never wired to a runnable transport.
**Cons:** Real ops/deploy work — managed Redis or self-hosted service, deploy
pipeline changes, needs its own eng review.

**Effort:** L (human) → M (CC+gstack).
**Priority:** P2.
**Depends on:** TODO P1 (backend needs to be deployed somewhere first).

## P3 — Consolidate `checkout/route.tsx` onto `orderCalculator.ts`

**What:** Migrate `app/api/checkout/route.tsx`'s inline tour-price lookup to
call the shared `calculateOrderAmount()` (added 2026-07-04 in
`app/lib/orderCalculator.ts`) instead of duplicating the logic.

**Why:** Closes a DRY gap intentionally left open during the websocket-auth
+ order-amount-calculation plan to keep that plan's blast radius small.
One pricing authority instead of two reduces future drift risk.

**Cons:** Touches a working Stripe Checkout Session flow (Reserve Now, Pay
Later) — needs care and tests before merging.

**Effort:** S (human) → S (CC+gstack).
**Priority:** P3.
**Depends on:** `orderCalculator.ts` (already landed).

## P3 — Restaurant websocket reconnect/rate-limiting

**What:** Add a reconnect-storm / rate-limit guard on `RestaurantConsumer`,
analogous to the existing IP-based limiter pattern in
`create-payment-intent/route.ts`.

**Why:** Ownership-based auth (added 2026-07-04) doesn't prevent a
legitimate-but-misbehaving client from reconnect-spamming the channel layer.

**Cons:** New surface area (rate-limit state, likely needs Redis anyway once
TODO P2 lands) — not justified until the feature is actually deployable.

**Effort:** S (human) → S (CC+gstack).
**Priority:** P3.
**Depends on:** TODO P2 (needs the feature actually running to matter).
