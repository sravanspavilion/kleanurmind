# Public demo

The existing Klean Ur Mind design, services and routes are preserved. Demo mode
uses fictional fixtures and browser storage. It never books real work or sends
email, SMS, payments, photo uploads or Google Sheets updates.

## Run locally

Demo mode is **off by default**. `npm run dev` now starts the normal production
flow at http://localhost:3000 (real auth, database and Sheets connector). Use
`npm run dev:demo` to start the authentication-free demo instead. The normal
production build/start commands also retain production authentication.

```sh
npm run dev:demo -- --port 3001
```

Open http://localhost:3001. Port 3001 allows the production-mode development
server on port 3000 to keep running. Demo build output uses `.next-demo` so the
two modes do not overwrite each other's generated files.

No database, auth, Sheets, email or SMS credentials are needed. Dependencies
must already be installed (`npm ci` on a fresh checkout).

For a public demo deployment, use a separate deployment from production:

```sh
npm run build:demo
npm run start:demo
```

The demo build uses Next.js’s supported Webpack bundler to avoid the local
Turbopack CSS worker restriction.

Both scripts enable `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true`. Set both
variables at build **and** runtime on hosting services. The client flag is baked
into the build. Do not serve a demo build with production runtime flags or vice
versa. Production uses the normal `npm run build` / `npm start` with both demo
flags unset or false and its existing auth and database configuration.

## Test the experience

1. Browse cleaning or laundry, then request that service or both.
2. Edit the fictional contact/address fields. No real personal details are needed.
3. Choose a future preferred schedule (all dates are interpreted/displayed in IST).
4. Review; use Edit details, Edit schedule, Previous step, or earlier step buttons.
5. Place service request. The confirmation contains a unique DEMO ID, full summary,
   requested appointments and pending-quote pricing.
6. Refresh or open My Bookings: submitted demo requests remain in this browser.
7. Book again to reuse details with a fresh schedule, or start a new request.
8. Reset demo data from the banner to remove this browser's demo drafts, requests
   and action history. Production storage and fixed sample fixtures are unaffected.

A request key prevents repeated clicks/retries from creating duplicate requests.
Storage errors show an error rather than a false successful submission. Browser
storage is local to this origin/device; clearing site data removes saved work.
Photo selections are intentionally not persisted or uploaded.

The operations/staff screens retain fixed fictional examples. Their forms record
simulated actions in the persistent **Demo activity** panel; they do not run the
production fulfillment engine or change the fixed operational fixtures. Profile
edits are restored from that activity on refresh. No real appointments are
confirmed and no capacity is reserved. Starting cleaning prices are estimates;
laundry and final totals remain quote-based.

## Isolation

Demo page guards select fictional customer/admin/staff identities and the data
facade returns fixtures. Authentication routes, registration, mutations and
uploads block real writes. Sheets and cron routes return inert demo responses.
Turning demo mode off restores production authentication; no public endpoint is
made anonymous for production. Demo storage keys are namespaced `kum-demo-v1:`.

## Checks

```sh
npm run typecheck
npm test
npm run test:demo
npm run lint
```

The demo browser suite uses desktop Chrome and Pixel 5 emulation, with the browser
time zone set to New York to verify that displayed schedules remain in IST. It
starts port 3001 with database/auth/Sheets/email credentials blank. Stop an existing
server on that port first to exercise that credential-free startup. Tests cover
submission, edits, back navigation, refresh, duplicates, invalid input, past dates,
reset, storage failure, profile persistence, navigation and API isolation. It also
captures review and confirmation screenshots in `test-results`.

## Explicit Sheets opt-in

The no-external-services behavior above is the default. To copy simulated
requests to a separate Google Sheet tab, opt in with `DEMO_SHEETS_ENABLED=true`,
configure the server signing secret, and deploy the updated Apps Script receiver.
See `GOOGLE_SHEETS.md`. With this option the banner discloses Sheet copying,
confirmation reports sync status, and reset only clears the browser copy.
Emails, SMS, payments, production bookings and photo uploads remain disabled.

## Vercel: prevent the NO_SECRET error on the public demo

`npm run dev` only sets demo flags on your own machine. A hosted `npm run build`
does not inherit that command or your ignored `.env.local` file.

In the Vercel project's Environment Variables, set the following for the target
Production/Preview environment, then redeploy (including a fresh build):

```dotenv
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
DEMO_SHEETS_ENABLED=true
```

Also configure `GOOGLE_SCRIPT_URL` and the private `GOOGLE_SCRIPT_SECRET` there
for Sheets copying. Do not publish the secret in client variables or source code.
A demo deployment does not need `NEXTAUTH_SECRET` because it does not use real
sessions. `/sign-in` should redirect to `/`, and the page should display the demo
banner. Existing deployments keep their old environment until redeployed.

For a separate real-account deployment, turn both demo flags off, configure a
strong server-only `NEXTAUTH_SECRET` and the database/auth providers. Never solve
a missing production secret with a hard-coded fallback or anonymous access to
protected APIs.
