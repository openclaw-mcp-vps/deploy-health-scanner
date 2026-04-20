# Deploy Health Scanner

Deploy Health Scanner is a Next.js 15 monitoring product for indie founders who run multiple deployed projects.

## Features

- Continuous checks every 5 minutes for:
  - HTTP uptime/status
  - SSL validity + expiry window
  - SEO metadata (title, description, canonical, OG image)
  - PageSpeed score trend
- Alerts to:
  - Email (SMTP)
  - Slack incoming webhook
- Paywalled dashboard access using signed cookies after Lemon Squeezy purchase verification
- Direct Postgres SQL persistence via `pg` (no ORM)
- Import URLs from Vercel or Netlify via token

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Run local development:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## API Endpoints

- `GET /api/health` -> service health
- `GET /api/checks` -> dashboard data (requires access cookie)
- `POST /api/checks` -> add URL + run immediate check (requires access cookie)
- `POST /api/checks/import` -> import Vercel/Netlify URLs (requires access cookie)
- `GET|POST /api/cron/health-check` -> scheduled scanning (optional CRON_SECRET)
- `POST /api/webhooks/lemonsqueezy` -> subscription webhook sync
- `POST /api/access/unlock` -> verify purchase email and set paywall cookie

## Lemon Squeezy Integration Notes

- Configure checkout links using store + product values.
- Configure webhook target to `/api/webhooks/lemonsqueezy` with the same signing secret as `LEMON_SQUEEZY_WEBHOOK_SECRET`.
- After purchase, users unlock dashboard access at `/unlock` with their checkout email.

