# Cookie Season

Baker-only planning for manual requests, shared whole batches, WV/OH pantry and freezer stock, shopping, donations and handoffs.

- Netlify serves the application.
- Supabase provides email/password authentication and PostgreSQL persistence.
- Row-level policies restrict access to approved baker accounts.
- Saves use revision checks; conflicts retain the local edits for download.

See [SETUP.md](SETUP.md) before deploying this branch.

## Development

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

Build configuration uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Only a publishable/anon key is accepted. No service-role secrets belong in the browser bundle.

`dist/` holds application source; `public/` is generated. The browser suite supplies simulated service responses to test interactions and save recovery. `scripts/test-database.mjs` runs the production SQL in local PostgreSQL via PGlite and checks row access, allowed accounts, revisions and retention. Hosted integration checks remain a release requirement.

## Home Assistant display

Use `https://cookie-season.netlify.app/?kiosk=1` in a Webpage card. Kiosk mode opens on Overview, defaults to dark appearance, keeps touch navigation visible, and hides editing and settings controls. It is a browsing convenience, not a separate authorization role. The existing baker login is required once per browser; preserve Firefox site data for subsequent visits. Appearance preferences are stored per browser; `?theme=dark` or `?theme=light` can override the initial preference.

Embedding is permitted from `http://192.168.3.83:8123` by the `frame-ancestors` policy in `netlify.toml`. Update that origin if the dashboard address changes. Cross-site iframe storage can be separate from the standalone app in Firefox, so sign in inside the dashboard frame itself.
