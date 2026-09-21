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
