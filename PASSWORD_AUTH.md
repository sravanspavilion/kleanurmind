# Email and password sign-in

Customers can create an account at `/sign-in` using their name, email, and a password, then sign in. Registration creates only customer accounts. Existing Google accounts keep their original sign-in method; registration cannot replace an existing account's password.

Passwords use bcrypt hashing with cost 12. Registration and login are rate limited. Email verification and password reset are not included in this change.

## Database setup before deployment

The Vercel build runs `npm run build:vercel`: it validates the database URL, generates Prisma Client, applies committed migrations, checks registration tables, and builds Next.js. Demo deployments skip database setup. Local `npm run build` does not change your database.

In Vercel → Project → Settings → Environment Variables, configure the target environment:

- `DATABASE_URL`: your hosted PostgreSQL connection string, with the provider's required SSL settings. A localhost URL will not work.
- `NEXTAUTH_URL`: the full deployed site origin, e.g. `https://your-site.vercel.app`.
- `NEXTAUTH_SECRET`: a strong random secret, kept stable across deployments.
- `DEMO_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false` for real accounts.

Redeploy after changing settings. Use a separate database for Preview deployments. If the dashboard overrides the Build Command, set it to `npm run build:vercel`.

New databases are provisioned by the committed Prisma migrations. If an existing database was created using `prisma db push` and has no migration history, Prisma may report P3005: compare its schema with the committed migrations and baseline it before deploying. Do not reset a database containing customer data or mark migrations applied without verifying the schema.

For an older database that only lacks the password column, the additive SQL update is available. With `DATABASE_URL` pointing to the intended database, apply the update once:

```sh
npx prisma db execute --file scripts/sql/add-password-auth.sql --schema prisma/schema.prisma
npx prisma generate
```

The SQL command can safely be repeated. Run `npm run db:auth:check` to verify the connection and registration tables. `npm run db:auth:setup` applies only the additive password column update; it does not provision a new database.

If registration reports unavailable, check the server log entry `[registration] Account creation failed`. `database_connection` indicates configuration or connectivity; `database_schema` indicates missing tables or columns. Vercel needs a reachable hosted PostgreSQL `DATABASE_URL`; a localhost database URL points at the Vercel instance, not your Mac.

The deployment fails early if the database is unreachable or registration tables are missing, so a broken registration configuration is visible in build logs before publishing.
