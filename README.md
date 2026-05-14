# Efendalyze — AI-Powered Website Audit Platform

A production-grade SaaS platform that crawls websites, analyzes them using GPT-4o vision, and generates comprehensive audit reports covering SEO, accessibility, performance, UX/UI, content, and more.

---

## Features

- **Full-site crawling** — Playwright-powered crawler with depth control and priority-based page queuing
- **AI UX critique** — GPT-4o vision analyzes screenshots for design, hierarchy, CTAs, trust signals
- **SEO audit** — Title, meta, headings, Open Graph, structured data, broken links, duplicates
- **Accessibility audit** — WCAG 2.1 checks (alt text, labels, landmarks, skip-nav, color, ARIA)
- **Performance analysis** — Load time, LCP, CLS, console errors, image dimensions
- **Bug detection** — Broken links, empty CTAs, JS errors, missing favicons, inconsistencies
- **Scoring engine** — Weighted scores (0-100) across 7 categories with quick wins & critical issues
- **AI report generation** — GPT-4o writes executive summaries and prioritized recommendations
- **PDF export** — Download full audit reports as PDF
- **Background processing** — BullMQ + Redis queue for async audit jobs
- **Authentication** — Clerk with full sign-in/sign-up flows
- **Dashboard** — Modern SaaS UI with real-time progress tracking, filters, and history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS 3.4 + shadcn/ui |
| Animation | Framer Motion |
| Database | PostgreSQL + Prisma 5 |
| Auth | Clerk v5 |
| Crawling | Playwright |
| AI | OpenAI GPT-4o |
| Queue | BullMQ + Redis |
| Charts | Recharts |
| PDF | jsPDF |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted, e.g. Supabase, Neon)
- Redis instance (local or hosted, e.g. Upstash)
- OpenAI API key (GPT-4o access required)
- Clerk account (free tier works)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ukhan717/efendalyze.git
cd efendalyze
npm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/efendalyze"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
```

### 3. Database setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# (Optional) View data in browser
npx prisma studio
```

### 4. Install Playwright browsers

```bash
npx playwright install chromium
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Start the background worker (separate terminal)

The audit pipeline runs in a background worker process. Start it in a separate terminal:

```bash
npm run worker:start
```

> **Important**: Both the Next.js dev server and the worker must be running for audits to process.

---

## Architecture

```
Browser → POST /api/audits → BullMQ Queue → Worker Process
                                               ↓
                                        WebCrawler (Playwright)
                                               ↓
                               ┌──────────────┼──────────────┐
                               ↓              ↓              ↓
                           SeoAuditor  AccessAuditor  PerfAuditor
                               ↓              ↓              ↓
                               └──────────────┼──────────────┘
                                              ↓
                                    AI Analysis (GPT-4o)
                                    UX Critique + Content
                                              ↓
                                    Scoring Engine
                                              ↓
                                    Report Generator
                                              ↓
                                    PostgreSQL (Prisma)
                                              ↓
                               GET /api/audits/[id] → Dashboard
```

---

## API Reference

### POST `/api/audits`
Start a new audit.
```json
{
  "url": "https://example.com",
  "maxPages": 10,
  "maxDepth": 3
}
```
Returns: `{ "id": "...", "status": "PENDING" }`

### GET `/api/audits`
List all audits for the authenticated user (paginated).

### GET `/api/audits/[id]`
Get full audit details including pages, issues, scores, and report.

### GET `/api/audits/[id]/status`
Lightweight polling endpoint: `{ status, progress, completedAt }`

### GET `/api/audits/[id]/report`
Get the generated report for a completed audit.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

> **Note**: The background worker cannot run on Vercel serverless functions. For production, deploy the worker separately (e.g. Railway, Render, Fly.io) or use Vercel's cron jobs with polling.

For the worker on Railway:
```bash
# Procfile or Railway start command
node -e "require('./src/workers/audit-worker.ts')" 
# Or with ts-node:
npx ts-node src/workers/audit-worker.ts
```

---

## Environment Variables Reference

See [.env.example](.env.example) for the complete list with descriptions.

---

## License

MIT
