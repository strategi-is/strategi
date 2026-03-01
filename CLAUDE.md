# Strategi — GEO Analytics Platform

## What this project is
B2B SaaS platform that helps companies improve their visibility in AI-powered search results (ChatGPT, Perplexity, Gemini). Core flow: scrape website → generate AI queries → query AI engines → score GEO optimisation → generate content recommendations + blog posts.

## Monorepo structure
```
strategi/
├── backend/          Node.js + Express + TypeScript + Prisma + PostgreSQL + BullMQ
├── frontend/         Next.js 15 (App Router) + TypeScript + Tailwind + React Query
├── docker-compose.yml  PostgreSQL (5432) + Redis (6379)
└── CLAUDE.md
```

## How to run

### Prerequisites
- Docker Desktop running
- Node.js v20.14.0 (current version — use Prisma 5 NOT 6)
- All API keys filled in `backend/.env`

### Install dependencies (monorepo / npm workspaces)
```bash
# From root — installs all workspaces
npm install

# Add a package to backend only
npm install <pkg> --workspace=backend

# Add a package to frontend only
npm install <pkg> --workspace=frontend
```

### Start everything
```bash
# 1. Start databases
docker-compose up -d

# 2. Run DB migrations (first time only)
cd backend && npx prisma migrate dev --name init

# 3. Start backend (port 4000)
cd backend && npm run dev

# 4. Start frontend (port 3000)
cd frontend && npm run dev
```

### Check types compile
```bash
cd backend && npx tsc --noEmit   # must be zero errors
cd frontend && npx tsc --noEmit  # must be zero errors
```

## Backend architecture

### Tech stack
- Express 5 + TypeScript strict mode
- Prisma 5 ORM (NOT Prisma 6 — Node 20.14 too old)
- BullMQ + Redis for job queue
- JWT auth (bcrypt passwords, sessions in DB)

### Key files
| File | Purpose |
|------|---------|
| `src/app.ts` | Express app setup, middleware, routes |
| `src/index.ts` | Server entry point, starts workers |
| `src/prisma/schema.prisma` | Database schema |
| `src/config.ts` | All env var access — use `required()` for secrets, `apiKey()` for AI keys |
| `src/types/index.ts` | Shared TypeScript types |
| `src/utils/params.ts` | Express 5 fix: `req.params[key]` is `string | string[]` |
| `src/utils/response.ts` | Typed HTTP response helpers |
| `src/middleware/auth.ts` | `requireAuth` + `requireAdmin` middleware |
| `src/middleware/rateLimiter.ts` | Tiered rate limiters (see Security section) |
| `src/workers/analysis.worker.ts` | BullMQ worker — 5-step analysis pipeline |
| `src/workers/queue.ts` | BullMQ queue setup (plain connection object, NOT ioredis) |

### API routes (all under `/api`)
- `POST /auth/register` `POST /auth/login` `GET /auth/me` etc.
- `GET/POST/PATCH/DELETE /companies` + `/:id/queries`
- `POST /analyses/companies/:companyId/start`
- `GET /analyses/companies/:companyId`
- `GET /analyses/:id` — full analysis with GEO score, recommendations, blog posts
- `GET /analyses/:id/share-of-voice`
- `POST /analyses/:id/blog-posts/:postId/revise` (body: `{ instructions }` or `{ feedback }`)
- `POST /analyses/:id/blog-posts/:postId/approve`
- `PATCH /analyses/:id/recommendations/:recId` (body: `{ status }`)
- `GET /admin/olostep/stats` (admin only)

### Analysis pipeline (BullMQ worker)
Steps with progress percentages:
1. **SCRAPING** (10%) — Olostep scrapes company + competitor sites
2. **QUERYING_AI** (30–60%) — Generate target queries → run ChatGPT + Perplexity
3. **SCORING** (80%) — GEO score website HTML across 8 attributes (0–5 each)
4. **GENERATING_CONTENT** (100%) — Page recommendations + 3 blog posts
5. **COMPLETED** — marks `completedAt`

### GEO scoring formula
8 attributes × weight → weighted sum / 50 × 100 = 0–100 score
- `extractabilityScore` ×2, `entityClarityScore` ×2
- `specificityScore`, `corroborationScore`, `coverageScore`, `freshnessScore`, `indexabilityScore`, `machineReadabilityScore` ×1 each

### LLM strategy
- Primary: Anthropic `claude-sonnet-4-6`
- Fallback: OpenAI GPT-4o
- Helper: `llm.service.ts` → `complete(prompt, options)` and `completeJson<T>(prompt, options)`
- **Important:** second argument is `LlmOptions` object `{ systemPrompt, temperature, model }` — NOT a plain string

### Known gotchas
- **Zod v4**: use `.issues` not `.errors` on ZodError
- **Express 5**: `req.params[key]` is `string | string[]` — always use `param(req, 'key')` helper
- **BullMQ/ioredis**: pass plain `{ host, port, maxRetriesPerRequest: null }` object — do NOT import standalone ioredis
- **Prisma 6 needs Node 20.19+** — we're on 20.14, use Prisma 5
- **BlogPost.buyerStage**: field was added mid-session; if DB already exists without it, run a migration

## Security hardening (done)

### Rate limiting (`src/middleware/rateLimiter.ts`)
Three tiers applied at route level in `app.ts`:
```ts
generalLimiter   // 200 requests / 15 min — all API routes
authLimiter      // 10 requests / 15 min — /auth routes (keyed per IP+path)
analysisLimiter  // 5 requests / hour — POST /analyses/.../start
```

### Config (`src/config.ts`)
- `required(key)` — throws immediately at startup if env var is missing. Used for `JWT_SECRET`, `ENCRYPTION_KEY`.
- `apiKey(key)` — warns in dev, throws in prod if key is missing. Used for all AI provider keys.
- **No hardcoded fallback secrets.** If JWT_SECRET is missing the server refuses to start.

### Input validation (Zod schemas in controllers)
All schemas use:
- `.strict()` — rejects unknown fields
- `.trim()` — strips whitespace
- `.toLowerCase()` on emails
- Max-length limits: email 254, password 128, name 100, URL 2048, text 5000, query 500

### Other hardening
- Body limit reduced from 10mb → **500kb** (DoS prevention)
- CORS explicitly lists allowed methods and headers
- Error handler never returns stack traces in API responses

## Test scripts (backend/src/scripts/)

Run any of these with `npx ts-node src/scripts/<name>.ts` from the `backend/` directory.

| Script | What it tests | How to use |
|--------|--------------|------------|
| `test-llm.ts` | LLM connectivity + JSON parsing (4 tests) | Just run it |
| `test-geo-scoring.ts` | GEO scoring against real HTML | `npx ts-node ... https://stripe.com` |
| `test-mention-detection.ts` | Company mention detection + SoV (6 test cases) | Just run it |
| `test-pipeline-smoke.ts` | Full pipeline: query gen → AI sim → blog gen (no DB) | Just run it |

These are **Tier 2 validation** — the services they test are "vibe coded" (LLM-driven, no unit tests possible), so these scripts let you manually verify output quality before running a full live analysis.

## Frontend architecture

### Status: COMPLETE (all pages built)

### Tech stack
- Next.js 15 App Router, TypeScript strict
- Tailwind CSS v4
- React Query (`@tanstack/react-query`) for server state (30s stale time, 1 retry)
- Zustand + localStorage for auth state
- Recharts for data visualisation (radar chart + bar chart)
- react-hook-form + zod for forms

### Key files
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | All API calls + TypeScript interfaces for API data |
| `src/lib/utils.ts` | `cn()`, `formatDate()`, `scoreColor()`, `statusLabel()` etc. |
| `src/store/auth.ts` | Zustand auth store (token + user, persisted to localStorage) |
| `src/components/providers.tsx` | React Query provider wrapper |
| `src/components/layout/sidebar.tsx` | Nav with auth-aware logout + active route highlight |
| `src/components/analysis/geo-score-card.tsx` | Radar chart + attribute bars |
| `src/components/analysis/share-of-voice-chart.tsx` | SoV bar chart (takes `byEngine` prop) |
| `src/components/analysis/status-banner.tsx` | Progress steps banner with polling animation |
| `src/app/(dashboard)/layout.tsx` | Authenticated layout with sidebar |

### API type contracts (important — must match backend exactly)

**GeoScore fields** (use `...Score` suffix):
```ts
extractabilityScore, entityClarityScore, specificityScore, corroborationScore,
coverageScore, freshnessScore, indexabilityScore, machineReadabilityScore
```

**PageRecommendation fields**: `issue`, `recommendation`, `effort` (NOT `title`/`description`/`improvements`)

**BlogPost fields**: `id`, `title`, `slug`, `content`, `buyerStage`, `status`, `wordCount`, `geoComplianceScore`

**ShareOfVoice response shape**: `{ byEngine: Record<string, { total, mentioned, avgSov }> }`

### Route structure
```
/                       → redirects to /dashboard
/login                  Auth pages
/register
/(dashboard)/           Requires auth (redirects to /login if no token)
  dashboard/            Overview stats
  companies/            List companies
  companies/new         Create company form
  companies/[id]        Company detail + run analysis button
  analyses/             All analyses
  analyses/[id]         Full analysis report (polls every 8s until COMPLETED)
  content/              All blog posts
  settings/             Account info
```

### Auth flow
1. Login → `POST /auth/login` → get `{ token, user }`
2. Store in Zustand (persisted to localStorage)
3. `api.ts` interceptor attaches `Authorization: Bearer <token>` to every request
4. On 401 → clear token → redirect to `/login`
5. Dashboard layout checks token on mount → redirect to `/login` if missing

### Polling
Analysis detail page polls every 8s until `status === 'COMPLETED' || 'FAILED'`. Uses React Query `refetchInterval`.

## Required environment variables

### backend/.env
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/strategi"
REDIS_URL="redis://localhost:6379"
PORT=4000
NODE_ENV=development
JWT_SECRET="<random 64+ char hex>"         # required — server won't start without it
ENCRYPTION_KEY="<random 32+ char hex>"     # required — server won't start without it
OLOSTEP_API_KEY="<from olostep.com>"
OLOSTEP_BASE_URL="https://agent.olostep.com/olostep-p2p-infer"
ANTHROPIC_API_KEY="<from console.anthropic.com>"
OPENAI_API_KEY="<from platform.openai.com>"
PERPLEXITY_API_KEY="<from perplexity.ai>"
GEMINI_API_KEY="<optional, from aistudio.google.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="<email>"
SMTP_PASS="<app password>"
ALERT_EMAIL="<your email for cost alerts>"
OLOSTEP_COST_ALERT_THRESHOLD=300
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Database models (key ones)
- `User` → has many `Company`
- `Company` → has many `Competitor`, `Analysis`
- `Analysis` → has one `GeoScore`, many `ScrapeJob`, `TargetQuery`, `AiQueryResult`, `PageRecommendation`, `BlogPost`
- `BlogPost` → has field `buyerStage BuyerStage @default(AWARENESS)`, has many `BlogRevision`
- `OlostepApiLog` → audit trail for all scrape API calls

## What still needs building
- [ ] Email service (verification + analysis-complete notifications)
- [ ] Weekly cron re-analysis (`node-cron`)
- [ ] WordPress CMS integration (push approved blog posts)
- [ ] Admin dashboard UI
- [ ] Company profile edit page (frontend)
- [ ] Stripe billing integration
