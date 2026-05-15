# efendalyze

Crawls a website and produces an audit of it: SEO, accessibility, performance,
UX, content and outright bugs, scored per category with a written summary.

Next.js 15 App Router, TypeScript, Postgres via Prisma, Playwright for crawling,
GPT-4o for the judgement calls, BullMQ on Redis for the queue.

## How it works

    POST /api/audits  ->  BullMQ queue  ->  worker process
                                              |
                                           crawler (Playwright)
                                              |
                        +---------------------+---------------------+
                        |                     |                     |
                   SEO auditor      accessibility auditor    performance auditor
                        |                     |                     |
                        +---------------------+---------------------+
                                              |
                                    GPT-4o UX critique + content analysis
                                              |
                                       scoring engine
                                              |
                                      report generator
                                              |
                                        Postgres
                                              |
                            GET /api/audits/[id]  ->  dashboard

## Decisions worth knowing

**Audits run in a worker, not in the request.** A crawl plus six analysis passes
takes minutes, well beyond any serverless timeout. `POST /api/audits` enqueues and
returns an id straight away; the client polls `/status`, which is kept
deliberately small because it is hit every couple of seconds.

**The crawl budget is spent on pages that matter.** Default is 10 pages at depth
2, three in flight. Before each batch the queue is re-sorted by a priority score,
so pricing, contact and about pages get visited before the budget runs out.
Without that a deep blog swallows all ten pages and the audit says nothing
useful.

**Timeouts are per page, not per audit.** 30 seconds for navigation and for the
page itself, so one slow page costs one page rather than the whole run.

**The UX pass gets a screenshot, not the DOM.** Visual hierarchy, contrast, and
whether a call to action reads as clickable are not properties of markup. The
content pass stays on text, where the DOM is the right input.

**Scoring weights the checkable things highest.** SEO, accessibility and
performance at 0.20 each; UX 0.15; content and mobile 0.10; trust 0.05. The
AI-derived categories are the softer judgements and should not dominate a number
someone might act on.

**The report generator is given the computed scores** rather than asked to judge
severity itself, so the narrative can never contradict the numbers printed next
to it.

**Issues are rows, not a JSON blob.** `AuditIssue` is a real table so findings can
be filtered and counted by category and severity without loading an entire
report.

## Running it

Needs Node 18+, Postgres, Redis, an OpenAI key with GPT-4o access, and a Clerk
account.

    npm install
    cp .env.example .env.local     # then fill it in
    npx prisma generate
    npx prisma migrate dev
    npx playwright install chromium

Then two processes, both required:

    npm run dev            # the app
    npm run worker:start   # the worker, separate terminal

Nothing will process without the worker running.

`.env.local` needs `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, the Clerk
publishable and secret keys, and the Clerk URL settings. See `.env.example`.

## API

| Route | Does |
|---|---|
| `POST /api/audits` | start an audit — `{ url, maxPages, maxDepth }`, returns `{ id, status }` |
| `GET /api/audits` | list the signed-in user's audits, paginated |
| `GET /api/audits/[id]` | full record: pages, issues, scores, report |
| `GET /api/audits/[id]/status` | polling endpoint — `{ status, progress, completedAt }` |
| `GET /api/audits/[id]/report` | generated report for a completed audit |

## Deploying

The app deploys to Vercel as-is. The worker does not — it is a long-running
process and serverless functions are not. Run it somewhere that allows one:
Railway, Render or Fly.

## Licence

MIT.
