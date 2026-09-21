# Backend - Enable Missing Dependencies

## Add `resend` to package.json

```json
{
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "argon2": "^0.31.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "node-cron": "^4.6.0",
    "pdfmake": "^0.2.9",
    "swagger-ui-express": "^5.0.1",
    "twilio": "^5.0.0",
    "web-push": "^3.6.7",
    "resend": "^4.0.0"
  }
}
```

## Add consent middleware

Create or update `src/middleware/consent.ts`:

```typescript
export function consentMiddleware(req, res, next) {
  console.warn('Consent middleware - skip for MVP')
  next();
}
```

## Update prisma schema

Add to `prisma/schema.prisma` (append after Comment model):

```
enum InvitationStatus {
  PENDING
  ACTIVE
  EXPIRED
  REVOKED
}

model CaseInvitation {
  id           String        @id @default(uuid())
  caseId       String
  email        String
  role         String
  status       InvitationStatus @default(PENDING)
  token        String
  expiresAt    DateTime
  createdAt    DateTime      @default(now())
  invitedBy    String
  acceptedAt   DateTime?
  acceptedBy   String?
  revokedAt    DateTime?
  revokedBy    String?

  @@index([caseId, status])
  @@index([email, status])

  @@map("case_invitations")
}
```

## Run migrations

```
npx prisma generate
npx prisma migrate dev --name add_case_invitation
```

## Commit & Push

```
git add .
git commit -m "fix: enable resend and add CaseInvitation model for Phase 1"
git push origin feature/phase-1-invite-and-visibility
```
