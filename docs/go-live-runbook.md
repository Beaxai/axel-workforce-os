# Go-Live Runbook — Axel Workforce OS

Use this top-to-bottom during the publish meeting. Items marked **[Curtis]** need his account/decision; **[Agent]** items are handled in the Replit chat afterward.

## Already done (no action)
- Resend domain `axelins.com` added; sending records (DKIM, SPF, bounce MX) **verified**
- Inbound receiving enabled on `deals.axelins.com` (MX live; Resend "Receiving" check may still show pending — it clears on its own and blocks only step 6.4)
- Security scan run and all fixable high-severity findings patched
- Email routing engine tested end-to-end (all 3 routing layers verified with simulated webhooks)
- Sprint branch merged to `main` (backup of the old main: branch `main-backup-pre-sprint1`)

## 1. Publish [Curtis]
1. Open the Repl → **Publish**
2. Type: **Autoscale** · Visibility: **Public** · machine size/instances: defaults
3. Build/run commands: leave pre-filled values
4. Note the resulting `https://<name>.replit.app` URL — used in every step below ("APP_URL")

> Public = URL reachable (required for webhooks). The app itself is login-gated; APIs reject unauthenticated requests.

## 2. Decide the from-address [Curtis]
Any name works instantly (domain is verified), e.g. `notifications@axelins.com` or `deals@axelins.com`. This is what clients/carriers see in their inbox.

## 3. Webhooks — register all three (~5 min)
| Service | Where | Endpoint | Notes |
|---|---|---|---|
| SignWell | Dashboard → API → Webhooks | `APP_URL/api/webhooks/signwell` | no secret needed |
| Stripe | Developers → Webhooks | `APP_URL/api/webhooks/stripe` | event: `checkout.session.completed` |
| Resend | Webhooks → Add Webhook | `APP_URL/api/webhooks/resend-inbound` | event: `email.received` — **copy the `whsec_...` signing secret** |

## 4. Hand two values to the agent [Curtis/Brendan]
1. The Resend `whsec_...` signing secret
2. The chosen from-address

**[Agent]** then sets `RESEND_WEBHOOK_SECRET`, `OUTBOUND_EMAIL_FROM`, `LISTENER_EMAIL_DOMAIN=deals.axelins.com` and republishes config.

## 5. Optional same-day
- Create `signatures@axelins.com` in SiteGround (Site Tools → Email) or forward it — needed eventually as the SignWell counter-signer mailbox.

## 6. Live smoke test (~10 min, run in order)
1. **Stripe:** test-mode checkout on a deal's broker fee → deal flips to PAID automatically
2. **SignWell:** send a bind package on a test deal → sign → deal auto-binds, checklist ticks
3. **Outbound email:** trigger a deal email → arrives from the `@axelins.com` address
4. **Inbound routing:** reply to that email from a personal inbox → appears on the deal card within seconds *(requires Resend "Receiving" check = Verified)*

## Known open items (not blocking go-live)
- Object storage (S3/R2/Replit) for signed documents — local disk is fine for the testing phase
- Custom app domain — additive later; the `.replit.app` URL stays valid forever, so webhooks never need re-registering
