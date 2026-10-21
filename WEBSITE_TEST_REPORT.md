# Website verification — 21 October 2026

Target: https://kleanurmind.vercel.app/

## Live checks

| Area | Result |
| --- | --- |
| Home page | HTTP 200; navigation and FAQ expansion work in Chrome. |
| Cleaning and laundry service pages | Both return HTTP 200 without a server HTTP error. |
| Booking form | Loads; combined-service selection opens both detail sections; empty required contact fields block progression. No booking submitted. |
| Service coverage | `/api/areas?locality=Kozhikode` returns 503; the UI displays an unavailable notice. |
| Policies | HTTP 200 is misleading: browser renders the application error boundary. Database-backed settings fail. |
| Sign-in | Form and account-creation toggle render. The previously observed account creation failure remains unresolved in production. |
| Bookings, staff, admin | Browser shows “We couldn’t load this page”. Protected workflows cannot be verified until production configuration is repaired. |
| Account, dashboard | HTTP requests return 200, but that alone does not verify React rendering or authenticated behavior. |
| Unknown URL | Returns HTTP 404. |

## Deployment findings and local fixes

- Vercel project `kleanurmind` has no configured `DATABASE_URL`, `NEXTAUTH_URL`, or `NEXTAUTH_SECRET` in the project environment-variable list inspected during this session. Local database settings point at localhost.
- The live domain serves the October 14 deployment. A newer deployment failed because Vercel could not find `.next/routes-manifest.json`.
- `next.config.ts` now always uses `.next` on Vercel, including demo builds. Local demo builds retain `.next-demo`.
- `vercel.json` now selects a build script that validates real-mode database/auth configuration, generates Prisma Client, applies migrations, and checks registration tables before building. Demo builds skip database operations.
- The policies page now renders an explicit unavailable notice and retry link on a settings outage instead of crashing.
- Fixed existing lint errors in SMS client typing, image resize options, and domain test fixtures.

## Validation and limits

- 81 existing unit tests passed; 3 additional regression tests passed for Vercel build output and policy-page outage handling.
- TypeScript passed. A Vercel-style demo production build passed with `next build --webpack`; `.next/routes-manifest.json` was verified on disk.
- Turbopack could not complete in this execution environment because its CSS worker was denied permission to bind a port, including after an escalation attempt. The default Turbopack build is therefore not verified here.
- No real account, booking, payment, email, or SMS was created. Authenticated workflows, uploads, full mobile interaction, and database integration tests remain unverified.
- These changes are local, not committed, pushed, or deployed. The live site is not fixed yet. Configure hosted PostgreSQL and authentication in the correct Vercel project, deploy these changes, then repeat the authenticated checks. Do not enable demo mode as a substitute for real account functionality.
