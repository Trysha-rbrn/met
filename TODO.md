# TODO

## Auth / Security
- Implement email verification on registration.
  - Create verification token and expiration.
  - Send verification email link.
  - Block login for unverified users.

- Send security notification email when password is changed.

- Send security notification email when account is deleted.

## Infrastructure
- Integrate transactional email provider (e.g. Resend/SendGrid/SMTP) for auth-related emails.
- Add retry + failure logging for outbound email jobs.

## Roles / Subscription
- [x] Add `PREMIUM` user tier (implemented).
- [x] Add full subscription lifecycle (upgrade, downgrade, billing hooks).

## Premium Roadmap
- [x] Add monthly budget goals per category.
- [x] Add recurring transactions.
