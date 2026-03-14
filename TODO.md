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
