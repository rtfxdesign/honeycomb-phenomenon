# 🐝 Project Honeycomb

A safe, searchable living archive for anomalous human experiences, built one voice at a time.

**Live site:** [projecthoneycomb.site](https://www.projecthoneycomb.site)

---

## Development (Cloud — Recommended)

No local setup needed. Edit code entirely from your browser using GitHub Codespaces:

1. Go to the [repo on GitHub](https://github.com/rtfxdesign/honeycomb-phenomenon)
2. Click **Code → Codespaces → Create codespace on main**
3. Once the environment loads, run: `npm run dev`
4. Edit code in the browser-based VS Code
5. Commit and push — Netlify auto-deploys to production

> **Note:** GitHub provides 120 free core-hours/month for Codespaces.

## Development (Local — Optional)

If you prefer working locally:

1. Clone: `git clone https://github.com/rtfxdesign/honeycomb-phenomenon.git`
2. Install: `npm install` (requires Node ≥22.13.0)
3. Dev server: `npm run dev`
4. Build: `npm run build`

---

## Deployment

Deployment is automatic via Netlify CI/CD. No manual uploads needed.

| Trigger | Result |
|---------|--------|
| Push to `main` | Netlify builds and deploys to production |
| Push to any other branch | Netlify creates a deploy preview URL |
| Rollback | Use Netlify dashboard to revert to any previous deploy |

### Recommended workflow

1. Create a branch in GitHub
2. Make and commit your changes
3. Push the branch
4. Review the Netlify deploy preview
5. Merge into `main`
6. Netlify publishes to production automatically

### Managed in Netlify (not in this repo)

- Visitor password & access control
- Domain & DNS configuration (`projecthoneycomb.site`)
- HTTPS certificate
- Form submissions & uploaded media
- Environment variables & secrets

---

## Project Structure

- `app/` — Site source code (Next.js pages, components, styles)
- `public/` — Static assets (images, icons, forms)
- `examples/d1/` — Optional Cloudflare D1 example
- `tests/` — Automated tests
- `.devcontainer/` — GitHub Codespaces configuration
- `netlify.toml` — Netlify build settings

## Tech Stack

- **Framework:** Next.js 16 on [vinext](https://github.com/cloudflare/vinext) (Cloudflare)
- **Database:** Cloudflare D1 + Drizzle ORM
- **Forms:** Netlify Forms
- **Hosting:** Netlify (CI/CD from GitHub)
- **Source control:** GitHub (`rtfxdesign/honeycomb-phenomenon`)

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production |
| `npm test` | Build and run tests |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
