# Cookie Season

Holiday baking planner with editable recipes, ingredients, requests, whole-batch planning, pantry-aware shopping and cost estimates.

## Netlify

Create a separate GitHub repository for this project and import it as a new Netlify project in the existing account. Use the production branch `main` and publish directory `dist`. No build command or dependency installation is needed. The included `netlify.toml` configures deployment.

Choose a neutral project name; Netlify will report the available production address. The radio project does not need any changes.

## Current stage

This is a browser-local review prototype. It starts with an empty request list, imported recipes requiring review, and illustrative prices. Each browser has independent data. Kitchen Settings offers JSON backup and restore.

Moving hosts does not provide authentication or shared storage. Invite-only access must be enforced by a backend before this is used for collecting real requests. Do not rely on a hidden link or a client-side password to restrict access.

Browser storage belongs to the site origin. Export a kitchen backup from the previous host before moving any user-entered corrections, then restore it on the new host.

## Checks

Run `node test-planning.cjs` to verify calculation boundaries and management behavior. The static files are in `dist/`.
