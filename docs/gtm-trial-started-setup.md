# GTM Setup — `trial_started` event → GA4 → Google Ads conversion

The dataLayer push is already coded in `frontend/app/checkout/page.tsx` (fires after a
successful embedded-form confirmation):

```js
window.dataLayer.push({
  event: 'trial_started',
  trial_session: client_secret.split('_secret_')[0],  // cs_live_... session id
  value: 0,
  currency: 'usd',
});
```

GTM container: `GTM-5MZDBQ5P` (loaded site-wide via `frontend/app/layout.tsx`).
Configure in https://tagmanager.google.com

## 1. Create the Trigger

**Triggers → New → Trigger configuration → Custom Event**

| Setting | Value |
|---|---|
| Event name | `trial_started` |
| This trigger fires on | All Custom Events |
| Trigger name | `Trial Started` |

## 2. Create the GA4 Event Tag

**Tags → New → Tag configuration → Google Analytics: GA4 Event**

| Setting | Value |
|---|---|
| Measurement ID | The SAME `G-…` ID used by your existing GA4 tags in this container (open any existing GA4 tag to copy it) |
| Event Name | `trial_started` |
| Event Parameters | Optional: add `trial_session` → `{{trial_session}}` if you want the session id recorded (needs a dataLayer variable, below) |
| Firing triggers | `Trial Started` |
| Tag name | `GA4 Event – trial_started` |

Optional dataLayer variable (only if you want `trial_session` captured):
**Variables → New → Data Layer Variable** → Data Layer Variable Name: `trial_session` → name: `trial_session`.

## 3. Mark it as a conversion in GA4

https://analytics.google.com → Admin → (property) → **Events** → find `trial_started` →
toggle **Mark as key event** (conversion) → Save.
(If it doesn't appear yet, it will once the first event fires — or click **Create event**.)

## 4. Import it into Google Ads as a conversion

In Google Ads (via the GA4 link already present — the account has GA4-imported actions):
- **Goals → Conversions → New conversion action → Import → Google Analytics 4** →
  select the `trial_started` key event → Continue.
- OR if you prefer it to count under the existing purchase action, skip this and keep
  `trial_started` as a secondary/observe action.

Note on semantics: `trial_started` = $0 (30-day free trial). This is your conversion
signal for the optimizer's CPA math during the trial period; the real `$29 purchase`
event (post-trial, server-side) is the follow-up (Measurement Protocol step).

## 5. Verify

1. GTM: **Preview** mode → open https://assistedly.ai/checkout/ → complete a test signup →
   confirm the `GA4 Event – trial_started` tag fired (tags panel shows it).
2. GA4: **DebugView** or **Realtime** → confirm `trial_started` arrives.
3. Google Ads: confirm the conversion action starts recording.

## Consent note

`analytics_storage` is consent-gated (ConsentBanner/layout.tsx default denied).
The GA4 tag fires only after the visitor accepts analytics cookies — this is the
correct, policy-compliant behavior; don't override it.