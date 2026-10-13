# Assistedly Cares backend (Cloudflare Worker + D1)

Deployed to `care-backend-mvp` (`wrangler deploy` from this directory).

## Auth / SMS 2FA operational notes

- Passwordless sign-in creates accounts for unknown emails and emails a magic link
  (`/api/auth/passwordless/request` + `/verify`). Frontend handles `?token=` landing.
- SMS MFA (2-step auth, HIPAA `§164.312(d)`): `/api/auth/mfa/{setup,verify-setup,verify,resend,disable}`.
  Codes deliver by SMS (Inkbox) with automatic email fallback (Resend) so login is never blocked.
- **US 10DLC opt-in:** every US recipient must text `START` to the Inkbox number
  (`+14133509016`) once before their first SMS. The verification email and enrollment UI
  include a one-tap `sms:` link. No programmatic opt-in on the default campaign
  (needs a customer-managed 10DLC campaign). iMessage line = the no-opt-in alternative.
- Secrets (wrangler): `INKBOX_API_KEY`, `INKBOX_PHONE_NUMBER_ID`, `RESEND_API_KEY`,
  `EMAIL_FROM` (`Assistedly Cares <hello@updates.assistedly.ai>`), `SESSION_SECRET`.
- D1: `users` (+ `phone`, `mfa_enabled`, `mfa_channel`, `deleted_at`), `mfa_otps`,
  `revoked_tokens`, plus the case/invitation/audit tables.
