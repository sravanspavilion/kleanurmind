# Email and password sign-in

Customers can create an account at `/sign-in` using their name, email, and a password, then sign in. Registration creates only customer accounts. Existing Google accounts keep their original sign-in method; registration cannot replace an existing account's password.

Passwords use bcrypt hashing with cost 12. Registration and login are rate limited. Email verification and password reset are not included in this change.

## Database setup before deployment

This repository has no existing Prisma migration history. The additive SQL update is provided separately so it can be applied to an existing database without introducing an incomplete migration history.

With `DATABASE_URL` pointing to the intended database, apply the update once:

```sh
npx prisma db execute --file scripts/sql/add-password-auth.sql --schema prisma/schema.prisma
npx prisma generate
```

For a new database, provision the full Prisma schema through the project's normal database setup first. Set `NEXTAUTH_URL` to the deployed site URL and configure `NEXTAUTH_SECRET` before using authentication. Publish the code after the database update succeeds.
