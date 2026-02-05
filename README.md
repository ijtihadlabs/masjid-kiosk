# Masjid Kiosk

Masjid Kiosk is a privacy-first, fee-free kiosk donation experience built for local masjids.
It runs fully offline for content, uses local-only storage, and avoids analytics, tracking,
and accounts. Payments are intended to go directly to the masjid’s own card reader account.

## Apps

- `apps/kiosk`: Kiosk donation UI (tablet + mobile friendly).
- `apps/admin`: Masjid admin portal for configuration.
- `apps/super-admin`: Platform admin portal for onboarding masjids.

## Local development

```bash
# Kiosk
npm run dev --prefix apps/kiosk -- --port 5173

# Masjid admin
npm run dev --prefix apps/admin -- --port 5174

# Super admin
npm run dev --prefix apps/super-admin -- --port 5175
```

Optional unified dev proxy (kiosk hosts admin paths):

```bash
http://localhost:5173/
http://localhost:5173/admin/
http://localhost:5173/super-admin/
```

Preview admin access (demo only):

- The kiosk header shows an “Admin Preview” button linking to `/admin/`.
- Admin login is bypassed only on `localhost` for demos.
- Super admin remains protected and is not linked from the kiosk.

## Build

```bash
npm run build --prefix apps/kiosk
npm run build --prefix apps/admin
npm run build --prefix apps/super-admin
```

## Deployment (Netlify)

- Base directory: `apps/kiosk`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Values and constraints

- No analytics, tracking, or accounts.
- Offline-first UI for non-payment content.
- Humble, respectful tone with Islamic etiquette.
- Arabic terminology with English in brackets.

## License

MIT. See `LICENSE`.
