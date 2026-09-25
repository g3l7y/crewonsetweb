# The Faithful Foundation

This is a migration of an existing application, not a new design. Preserve the existing design and functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77aab852-ddfb-4c67-9757-49b7870364d2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## PlayFab password recovery

Real-mode password recovery uses PlayFab’s account-recovery email and expiring reset token. Configure `PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID` in Vercel Production and Preview, and set that PlayFab Account Recovery template’s callback URL to `https://your-deployment-domain/password-recovery`. The template body should clearly warn the player, for example:

> Someone is trying to change your Crew On Set password. If this was you, open the secure reset link below and never share it with anyone.

Include PlayFab’s `$ConfirmationUrl$` placeholder as the link target. PlayFab also needs an SMTP add-on configured for the title before it can deliver the email. Mock mode intentionally keeps a demo-only six-digit code and does not send real email.

## Vercel deployment checklist

This app uses TanStack Start with Nitro's Vercel preset. Keep the Vercel project root at this repository, use `npm ci` to install, and let Vercel run `npm run build`. The production build emits `.vercel/output`; do not configure a static-only output directory.

Set these in Vercel Project Settings → Environment Variables, then redeploy. Never commit actual values:

- Both Production and Preview need `VITE_PLAYFAB_TITLE_ID`, `VITE_PLAYFAB_MODE`, `PLAYFAB_SECRET_KEY`, `PLAYFAB_CCOIN_CURRENCY_CODE`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and `DATABASE_URL` for the account and top-up flows.
- Use `VITE_PLAYFAB_MODE=real` with the production PlayFab title. For simulated real-account payments, use a PayMongo test secret and the matching test-mode webhook secret while leaving PlayFab mode set to `real`. Configure a separate PayMongo Test webhook endpoint for each deployed origin that needs to receive test payments.
- In PayMongo Settings → Webhooks, point the endpoint to `https://<deployment-host>/api/paymongo/webhook` and subscribe to `checkout_session.payment.paid`. The secret must come from that same PayMongo environment (Test or Live) as the checkout key.
- Set `PUBLIC_APP_URL` to the canonical HTTPS origin for email and brand-payment links. Set `VITE_GOOGLE_CLIENT_ID` if Google sign-in is enabled, and configure `PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID` plus SMTP credentials for real recovery and account-email messages.
- `VITE_*` values are embedded during the build. Changing the mode or title in Vercel requires a new deployment; a runtime-only edit will not change an already-built client bundle.

The PlayFab C-Coin currency code must exactly match the currency configured in the selected title. The default is `CC`. `DATABASE_URL` must point to a reachable Neon Postgres database; the server creates/updates its payment ledger schema on demand. A PayMongo test payment in real mode credits the configured PlayFab title, so use a test title if you do not want simulated purchases to affect live player balances.

Run the payment payload regression tests locally with `npm run test:paymongo`.
