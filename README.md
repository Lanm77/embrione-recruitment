# Embrione Recruitment — React + Supabase

This project has three pages:
- `/register` — form, live preview, browser WebP conversion, public pending submission to Supabase
- `/admin` — Supabase Auth admin login, pending review, approve/reject, counters
- `/team` — approved profiles, domain and position filters (5 demo records included)

## Quick setup (on a Mac)

### 1. Supabase database, security and demo profiles
In your Supabase project open **SQL Editor → New query**. Paste the entire `supabase-setup.sql` file, click **Run**. This creates the members table if needed, safe row-level security policies, photo-upload policy, and 5 demo-approved profiles.

In **Storage**, create a **PUBLIC** bucket named `member-photos` if you haven't already. The SQL policy allows visitors to upload only `.webp` files into that bucket. Public means images are publicly viewable.

### 2. Create the required admin user
In Supabase dashboard, open **Authentication → Users → Add user → Create new user** (names may vary). Set:
- Email: `admin@embrione.pes.edu`
- Password: use the **universal admin password in the challenge PDF**.
- Mark email as confirmed / auto-confirm the user if prompted.

Do **not** put the password inside `src/App.jsx`, `.env.local`, or GitHub. The application signs in via Supabase Authentication, and row-level security checks the signed-in user's email before allowing moderation.

### 3. Copy your project API values
In **Project Settings → API Keys** (or **Connect** in dashboard), get your **Project URL** and **publishable** API key (or legacy anon public key).

Next to `package.json`, create a new file named `.env.local` containing:

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_public_key
```

The above are placeholders. Never use the secret/service_role key here. `.env.local` is ignored by git.

### 4. Run locally
Open this project folder in VS Code. In its terminal:

```
npm install
npm run dev
```

Open the localhost link printed by Vite. Restart `npm run dev` any time you change `.env.local`.

### 5. Test the flow
1. Open `/register` in Firefox/Chrome (some versions of Safari can decode but cannot encode WebP with `canvas.toBlob`). Fill fields, choose JPG/PNG; you should see a `.webp` name. Click **Submit Registration**; see pending confirmation.
2. In Supabase **Table Editor → members**, check that the row has `status = pending` and `photo_url` points to a `.webp` storage object.
3. Visit `/admin`, sign in with required challenge credentials, approve the pending profile.
4. Visit `/team` and click Refresh: the approved profile should appear alongside the demo profiles. Rejected profiles stay hidden.

### 6. Deploy to Vercel
Push the **contents of this folder** to a public GitHub repository (commit your source; do not commit `.env.local`). Import the GitHub repository into Vercel. Framework: Vite. Build command: `npm run build`. Output directory: `dist`.

Under **Vercel Project → Settings → Environment Variables**, add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values. Then deploy/redeploy. `vercel.json` enables direct page URLs for `/register`, `/admin` and `/team`.

Set your Vercel domain to the pattern specified in the challenge PDF, if available.

### Video (2 minutes)
- 0:00–0:35 show `/register` live updates
- 0:35–0:55 select a JPG/PNG and show converted WebP file / browser Network upload
- 0:55–1:30 submit, then `/admin` login + approve
- 1:30–1:50 `/team` approved member and filters
- 1:50–2:00 React, Supabase, WebP, deployment summary

## Notes and limitations
- All `VITE_` environment variables are sent to the browser; only use the public/publishable key.
- The universal admin account is intended for the recruitment challenge, not for real-world production use. It is secured here through Supabase Auth and RLS rather than a hard-coded browser password.
- Browser-side image conversion uses `canvas.toBlob(..., 'image/webp')` after resizing to 800px longest dimension. Safari may not support WebP encoding; use Firefox/Chrome for the demo.
- WebP photo conversion happens on selection but file upload happens only on final Submit.
- The public bucket makes the photo URL publicly accessible. Don't upload real personal photos without consent.
- On failed DB insertion after successful image upload, an unused image may remain in storage; cleaning orphaned objects is a possible future improvement.
- For a long-term app, add rate limiting, CAPTCHA, email verification, image content checks and a more flexible admin role system.
