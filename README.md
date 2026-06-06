# Breadwrapz Migration Notes

## What changed

- Removed `render.yaml` to stop using Render deployment config.
- Added `supabase.toml` as a project placeholder for Supabase deployment.
- Added email verification support for account creation:
  - New users now receive a verification link.
  - Login is blocked until email verification completes.
  - A verification endpoint `POST /api/auth/verify` is available.
  - A resend verification route `POST /api/auth/resend-verification` is available.
- Added a new logo asset at `public/images/breadwrapz-logo.svg`.
- Updated frontend references to use the new logo.
- Backend now uses `FRONTEND_URL` for Paystack callback and verification URLs.

## Required environment variables

Set these for local development and deployment:

- `MONGODB_URI`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL` (optional; defaults to `FRONTEND_URL`)
- `JWT_SECRET`
- `RESEND_API_KEY`
- `FRONTEND_URL`

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the backend API server:
   ```bash
   npm run dev:server
   ```
3. Start the frontend app:
   ```bash
   npm run dev
   ```

## Supabase migration checklist

1. Create a new Supabase project.
2. Set `FRONTEND_URL` to your Supabase hosted site URL.
3. Configure your Supabase project environment variables to match the backend requirements.
4. Deploy the frontend as a static site to Supabase.
5. Keep the backend hosted on a Node/Mongo-capable service unless you migrate the Express server to Supabase Edge Functions.

## Verification flow

- Registering now sends a verification email.
- The email includes a link to:
  - `https://<your-frontend-url>/verify-email?token=<verification-token>`
- After verification, users can log in and access their profile.

## Notes

- The new logo is available at `public/images/breadwrapz-logo.svg`.
- If you want the backend to run inside Supabase, the current Express/Mongo stack will need to be converted into Supabase functions and a Supabase database.
