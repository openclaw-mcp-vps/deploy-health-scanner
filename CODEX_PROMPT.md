# Build Task: deploy-health-scanner

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: deploy-health-scanner
HEADLINE: Deploy Health Scanner — continuous uptime + SSL + SEO checks for all your projects
WHAT: Paste URLs or connect Vercel/Netlify. We check every 5 min for: HTTP status, SSL expiry, SEO meta tags, page load speed. Alert via email/Slack.
WHY: UptimeRobot only checks status. Your custom projects need SSL + SEO + perf all in one. Priced between UptimeRobot ($7) and Checkly ($40).
WHO PAYS: Indie founders with 5-50 deployed projects
NICHE: monitoring
PRICE: $$12/mo for 10 URLs, $39/mo unlimited/mo

ARCHITECTURE SPEC:
Next.js app with PostgreSQL for URL monitoring, background jobs via cron/queue system for health checks, and webhook integrations for alerts. Uses Lemon Squeezy for subscriptions and tRPC for type-safe API calls.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/webhooks/lemon-squeezy/route.ts
- app/api/cron/health-check/route.ts
- lib/db/schema.ts
- lib/monitoring/health-checker.ts
- lib/integrations/vercel.ts
- lib/integrations/netlify.ts
- lib/notifications/email.ts
- lib/notifications/slack.ts
- components/url-form.tsx
- components/dashboard-table.tsx
- components/pricing-cards.tsx

DEPENDENCIES: next, tailwindcss, drizzle-orm, postgres, @trpc/server, @trpc/client, @lemonsqueezy/lemonsqueezy.js, resend, puppeteer, zod, lucide-react, recharts, node-cron

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
