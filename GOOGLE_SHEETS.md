# Connect the website to Google Sheets

The server connector sends signed requests to an Apps Script web app. A deployment
ID or URL is not the shared secret. Never put that secret in NEXT_PUBLIC variables.

The supplied /exec URL is already set in this project's local `.env` and its
signed health check passes, including access to the actual spreadsheet. The local
shared secret is configured privately in `.env.local`.

## Complete setup

1. Open your Apps Script project. Its deployed receiver must support this site's
   HMAC envelope and `syncSnapshot` action; a public `doGet` health response alone
   does not prove compatibility. The receiver implementation is
   `apps-script/OperationalMirror.gs`. Preserve any other existing script functions
   when integrating it.
2. In Apps Script **Project Settings → Script properties**, set `SPREADSHEET_ID`
   to the ID between `/d/` and `/edit` in the target spreadsheet URL. Set
   `SHARED_SECRET` to a strong secret (or keep the existing one).
3. Put the same secret in a local `.env.local` file:

   ```dotenv
   GOOGLE_SCRIPT_SECRET="your-existing-shared-secret"
   ```

   Do not paste the secret into chat or commit it. `GOOGLE_SCRIPT_URL` is already
   configured in `.env`; copy it to the server's environment for deployment.
4. Deploy the receiver as a web app running as the owner with access for **Anyone**.
   The receiver authenticates requests with HMAC; the spreadsheet itself stays
   private. For an existing deployment, edit it to use a new version, keeping the
   /exec URL. These deployment steps are performed in your Google account.
5. Run `npm run sheets:check`. It sends only a signed health request, never a
   booking. The supplied receiver also checks access to the actual spreadsheet.
6. Restart the website after changing environment variables.

## Data and demo mode

Production bookings queue signed snapshots for the Bookings, Cleaning, Laundry,
Quotes, Appointments, Staff Assignments and Customer Followups tabs. The receiver
upserts by record ID so retries do not append duplicate records. Existing tabs
must have the expected layout: Record ID, Booking ID, Customer ID, Updated at,
Record JSON. Use a separate spreadsheet if your existing tabs use another layout.

`npm run dev` currently runs the no-sign-in demo. Its requests stay in browser
storage and do **not** sync to Sheets. Configuring the connector does not silently
change that behavior. `npm run dev:production` enables the protected production
flow (requires its database and authentication configuration).

## Optional no-sign-in demo → Google Sheets

The current local configuration opts in with `DEMO_SHEETS_ENABLED=true` in
`.env.local`. Its signing secret is configured. For a new installation, deploy the updated
`apps-script/OperationalMirror.gs`, which now handles `syncDemoRequest`, as a new
version of your existing Apps Script web app. Set the script properties and run
`sheets:check` as above. The URL can remain the same.

New demo requests are saved locally first, then sent through the server-only
`/api/demo/service-requests` route. The secret never reaches the browser. The
receiver creates a separate **Demo Requests** tab with readable contact, service,
IST scheduling and pending-quote columns plus full request JSON. Repeated attempts
update the row with the same demo request ID. No production booking, notification,
payment or upload is created.

Confirmation distinguishes confirmed Sheet sync from failure and provides a retry.
Existing browser requests are not automatically exported; open one and use its
Sheets retry button. Reset clears browser data only, not Google Sheets rows.
The public receiver validates fields, enforces origin and payload-size checks,
and caps attempts per server process. For multi-instance public hosting, enforce
an additional shared rate limit at the hosting edge.

Set `DEMO_SHEETS_ENABLED=false` for a purely offline demo. Production API guards
are unchanged. The deployed Apps Script must include the new action; an old
receiver that only supports production snapshots will reject demo syncs.

Browser verification: with the opt-in local demo running on port 3000, run
`npm run test:demo:sheets`. This test mocks Sheets responses; it verifies failure,
retry and persisted success states without sending rows to Google.

## Optional no-sign-in demo → client accounts (Google Sheet)

The public demo normally has no sign-in. You can opt in to a small **client
account** panel (create account / sign in) whose accounts live in the same Google
Sheet, in a separate **Customer Accounts** tab:

| Account ID | Name | Email | Phone | Password hash | Created at (IST) | Last login (IST) | Status |
|---|---|---|---|---|---|---|---|

- The password is **hashed with bcrypt on the website server**. Only the hash is
  written to the sheet; the real password is never stored, logged or returned to
  the browser.
- Login looks the account up by email (case-insensitive) and compares the hash on
  the server. A correct sign-in stamps `Last login`; failures are generic and do
  not reveal whether the email exists.
- This is demo-grade storage (slow, quota-limited) and is not a replacement for
  the database-backed authentication used outside demo mode.
- Account actions route through the existing `syncDemoRequest` dispatcher in the
  deployed Apps Script, so no Code.gs edit is required when you update to this
  version. Only the Apps Script files in `apps-script/` need replacing/pasting.

Enable it locally in `.env.local`:

```dotenv
DEMO_ACCOUNTS_ENABLED=true
```

Update your deployed Apps Script receiver (the same web app used for demo
requests):

1. In the Apps Script editor, open **`DemoRequests.gs`**.
2. Select all and replace its contents with `apps-script/DemoRequests.gs` from this
   repo.
3. Save and **Deploy → Manage deployments → Edit → Version: New version**. The
   `/exec` URL can remain the same.
4. Run `npm run sheets:check` to verify the health endpoint still returns OK.
5. Restart the site (`npm run dev`).

No `Code.gs` changes are needed. The `OperationalMirror.gs` file in this repo
still works as an alternate standalone receiver (it defensively checks for the
account handler). If you maintain both paths, keep the updated files.

Set `DEMO_ACCOUNTS_ENABLED=false` to hide the panel again; the `/sign-in` page
returns to redirecting to the home page.
Set `DEMO_ACCOUNTS_ENABLED=false` to hide the panel again; the `/sign-in` page
returns to redirecting to the home page.

Browser verification: `npm run test:demo:accounts`. It runs the demo on port 3002
and mocks every `/api/demo/accounts/*` call, so **no rows are written to Google**.


## Verified live connection — 14 October 2026

The existing Apps Script deployment was updated to version 3, preserving its
URL, authentication and other actions. `DemoRequests.gs` was added alongside the
existing `Code.gs`, with signed dispatch for `health` and `syncDemoRequest`.

A real website submission named **WEBSITE SHEET TEST - Fictional** was saved
successfully with request ID `DEMO-6f5bc36b-68df-4d40-aafb-363c72f37749`.
The **Demo Requests** tab now includes all entered text and numeric form fields
in separate columns: contact/address/access, cleaning scope/tasks/notes, laundry
bags/weight/handling, requested IST schedule and return preference. Request JSON
also preserves the full validated payload. Demo photo files are not uploaded.

Local configuration does not automatically update a hosted site's environment.
If deploying elsewhere, configure its server URL, shared secret and demo Sheets
opt-in flag too; never expose the secret as a NEXT_PUBLIC variable.

## Website booking receiver repair — 22 October 2026

The active version 5 receiver lacked the website snapshot dispatcher. The existing
Bookings sheet also uses readable columns, not the five-column snapshot layout.
The repair in `apps-script/WebsiteSnapshots.gs` supports those existing columns,
preserves manual cells, appends missing fields, and upserts using Record ID.

Deploy both `DemoRequests.gs` and `WebsiteSnapshots.gs` alongside the existing
Code.gs, retaining the current deployment URL and authentication settings. The
standalone `OperationalMirror.gs` alternative also needs these helper files.
The existing deployment was updated to version 6 on 22 October 2026, preserving
its URL and authentication. The deployed DemoRequests account helpers were kept
in place; only the snapshot dispatch and WebsiteSnapshots helper were added.

The live fixture uses booking ID `TEST-20261022-connector-1958`. Two attempts
before this repair returned an INTERNAL error. On 27 October 2026, the signed
live retry returned HTTP 200 and ok:true, confirming one Bookings row, one
Cleaning row, one Laundry row, and two Appointments rows. The fictional record
is named WEBSITE CONNECTION TEST - Fictional and must not be dispatched.
The 11 focused connector/receiver tests also pass. This verifies the live
connector write; it is not a browser checkout or notification delivery test.
