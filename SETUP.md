# Connect Cookie Season

This update stays on the `baker-homes` branch until setup and live checks are complete. The existing production review site continues to work.

## 1. Save existing corrections

On the existing Cookie Season site, use Kitchen settings → Download backup. Keep that JSON file if the baker has changed any recipes, prices or requests. It can be restored after sign-in to the new app. Old combined pantry quantities migrate to WV; review and split them between WV and OH after restoring. Illustrative prices are cleared, not treated as current prices. Old progress-only “batches baked” numbers are not converted into inventory transactions; enter actual pantry quantities and use Freezers → Set stock for existing cookies.

## 2. Create the shared kitchen service

Create one project at https://supabase.com/dashboard using your own account. Use a password manager for the project database password; it is not the baker’s app password.

- In Authentication settings, **disable new user signups**. Only a manually created baker account is needed.
- In SQL Editor, run `backend/schema.sql` once.
- In Authentication → Users, create the baker’s email/password account and mark it confirmed. The baker should choose their own password. There is no public registration form.
- Copy that user’s UUID and run this in SQL Editor, substituting the actual UUID:

```sql
insert into public.bakers(user_id)
values ('ACTUAL-BAKER-USER-UUID');
```

Each authorized account owns one kitchen. Use the same baker account on the baker’s phone and computer. Adding another account creates a separate kitchen; this version does not provide team sharing.

Copy the project URL and **publishable key** from project API settings. A legacy `anon` key also works. Never use a secret or `service_role` key in this app or paste one into chat.

## 3. Configure Netlify without publishing production

For **Cookie Season only**, add these environment variables with **Builds** scope, for Deploy Previews and Production:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your project URL, such as `https://PROJECT.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Your publishable key |

The build command is `npm run build`; publish directory is `public`. `netlify.toml` supplies both. Remove any old UI-level publish-directory override if Netlify still shows `dist`.

The old `COOKIE_REVIEW_PASSWORD` variable is no longer used by this update. The temporary edge-password file is removed on this branch and replaced with baker account access. Do not remove the old variable until the old review deploy is no longer needed.

A missing configuration shows a setup screen rather than opening an unconnected workspace. Public static assets contain starter recipe data and app code; personal requests, edits and stock records require the authorized account. This access model protects private kitchen records, not the secrecy of the app’s code or starter recipes.

## 4. Verify a single preview

Open the draft pull request’s Netlify preview after the environment is configured. If a preview ran before configuration, rebuild that preview once.

- Sign in with the baker account; confirm it works on phone and computer.
- Restore the saved backup, if any, then split pantry stock correctly between WV and OH.
- Add one test request assigned to OH. Confirm it appears on the second device after a reload or within 30 seconds while idle.
- Assign batches, set adequate pantry stock, record baking, and confirm pantry deduction plus freezer additions.
- Transfer cookies to the other home; record a handoff; confirm stock decreases once.
- Leave a required price blank: the overview should show an incomplete estimate, not pretend shopping is free.
- Try edits from both devices: conflicting saves must offer download/reload rather than silently overwrite.
- Sign out. A signed-out session must not show kitchen records. Use a separate temporary test account to verify an account outside `bakers` cannot enter.
- Download a backup before clearing test data or before restoring the real starting records.

Browser flows were tested locally against simulated service responses. Database authorization, save revisions and snapshot retention were exercised against local PostgreSQL using the same SQL. Live Supabase login, hosting configuration, session expiry and cross-device behavior still require this preview check.

## 5. Publish once

After the preview is verified, merge the draft pull request into `main`. Netlify then builds the production app. Verify sign-in at https://cookie-season.netlify.app/ and stop deploying unless a real issue requires it. The radio project does not change.

## Operation

Requests are entered by the baker. Whole batches are pooled across both homes; their kitchen assignments can be changed before baking. Recording baking consumes that kitchen’s pantry and puts cookies in the selected freezer. Transfers move existing stock. A handoff consumes cookies and marks the request completed. Donation records consume cookies separately. Pantry adjustments represent current actual stock; purchases add stock.

Recipes and prices are editable. Recorded batches retain their actual cookie yield and ingredient consumption; later edits do not rewrite that history. Missing conversions prevent recording a batch. Missing prices remain explicit in estimates.

The backend keeps the last 30 saved revisions; downloadable backups are still recommended. These revisions are not a disaster-recovery replacement for independent backups. A season advances only when the baker chooses Start next season. Requests and activity are archived; recipes, current pantry and freezer stock carry forward.

Supabase Free can pause an inactive project, which matters between holiday seasons; it may need to be resumed in the dashboard. Check the current plan terms before choosing paid service. Netlify continues to host the front end; ordinary record saves do not publish the site.

Password recovery is currently an owner-assisted reset in Supabase Authentication, not an email flow in the app. Do not grant public signup or share the baker account with recipients.
