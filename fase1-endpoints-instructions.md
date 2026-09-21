# Phase 1 - Missing Endpoints

The CI build is now passing TypeScript (the consent middleware was fixed). However, the actual invitation endpoints are missing:

## Need to Add Endpoints to `src/api/cases.ts`

Add these route handlers (simplified MVP version):

```typescript
import { sendInvitationEmail } from '../utils/emailInvite';

// POST /invitations/send - Send an invitation to a family member
router.post('/invitations/send', async (req, res, next) => {
  try {
    const { caseId, email, role } = req.body;
    const { success, error } = await sendInvitationEmail({
      email,
      caseId,
      role: role.toUpperCase()
    });
    if (!success) {
      return res.status(500).json({ error: error || 'Failed to send invitation' });
    }
    res.json({ success: true, message: 'Invitation sent' });
  } catch (err) {
    next(err);
  }
});
```

This will make the CI build pass and complete Phase 1 features.
