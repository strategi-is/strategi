# AI Context Memory

## Source
- PRD: `C:\Users\chira\Downloads\Updated PRD (with olostep).pdf`
- Chat log: Claude build transcript shared on 2026-02-22
- Last sync date: 2026-02-22

## Product Scope
- Build a GEO analytics and optimization platform for B2B companies.
- Core value: measure AI search visibility and generate actionable recommendations/content to improve discoverability.
- AI engines in scope: ChatGPT/OpenAI, Perplexity, Gemini (and others where API access exists).
- V1 scraping direction: Olostep-first (custom scraping infra deferred).

## Non-Negotiable Constraints
- Pilot window: 8-12 weeks with 3-5 pilot customers.
- End-to-end analysis cycle target: 3-4 hours per customer run.
- Olostep reliability target: >95% scrape success, <10s average response.
- No critical security/privacy incidents during pilot.
- Content revision-rate target: <30%.

## KPI Framework
- AI Search Visibility frequency.
- AI recommendation/mention volume.
- Lead attribution from improved AI discoverability.
- GEO score improvement over 8-12 weeks.
- Recommendation/content implementation rate.

## Success Criteria
- Onboard 3-5 pilots and complete full analysis + implementation cycle.
- 80% of pilot customers show measurable AI mention improvement (15-25% SoV target).
- >=50 target queries per customer with >=90% relevance.
- Validate scoring methodology correlation with ranking/mention changes.
- Content satisfaction target around 4/5+.

## Architecture Direction
- Backend: Node.js + Express + TypeScript.
- Database: PostgreSQL + Prisma.
- Queueing: BullMQ + Redis.
- Frontend: Next.js + React + Tailwind.
- Core integrations: OpenAI/ChatGPT, Perplexity, Gemini, Olostep.
- Batch/queue pipeline preferred over synchronous real-time execution.

## Chat-History Decisions (Locked)
- Use proprietary models for quality (Claude/GPT/Gemini); open-source model path deferred.
- GEO score uses 8 attributes, with extractability and entity clarity weighted 2x.
- Olostep is primary scraping backend for pilot; fallback scraping reserved as contingency.
- WordPress automation is optional for pilot; can remain post-MVP hardening item.
- Build order used: backend core first, analysis pipeline second, frontend after backend compiles.

## Repo Status (Verified On Disk)
- Backend scaffold and core implementation exist and compile:
  - Auth: register/login/logout/verify/forgot/reset + JWT middleware.
  - Company profile CRUD + custom query management.
  - Analysis pipeline worker orchestrating scrape -> query gen -> AI querying -> scoring -> content generation.
  - Services present: Olostep, LLM wrapper, query generation, AI querying, GEO scoring, content generation, analysis.
  - Admin routes for usage/log overview are present.
  - Prisma schema exists (`backend/prisma/schema.prisma`, ~283 lines).
- Frontend exists but is still template/default screen:
  - `frontend/src/app/page.tsx` is uncustomized create-next-app starter.

## Known Technical Constraints / Risks
- Node runtime in environment is `v20.14.0`.
- Some modern packages report engine warnings requiring newer Node (`>=20.18` or `>=20.19`).
- Prisma is pinned to v5 to remain compatible with current Node.
- Third-party dependency risk remains: Olostep uptime/rate limits/pricing and Perplexity API availability.
- Legal/compliance dependencies remain external: DPA/privacy/terms review and subprocessor disclosure.

## External Dependencies User Must Provide
- API keys/accounts: Olostep, OpenAI, Anthropic, Gemini, Perplexity, hosting account.
- Legal execution: policy review and DPA coverage (including Olostep as subprocesser).
- Pilot operations: recruiting 3-5 customers and handling white-glove implementation process.

## Immediate Execution Plan (Next)
1. Replace frontend starter with product shell (auth, dashboard, company setup, analysis detail views).
2. Connect frontend to existing backend endpoints with typed API client and react-query.
3. Add migration/bootstrap runbook and smoke test path for local start (db + redis + backend + frontend).
4. Add guardrails/observability for failed analysis jobs and API budget tracking.

## Reload Prompt (Post-Compact)
Use `docs/ai-context.md` as source of truth.
Read `Repo Status (Verified On Disk)` and continue with `Immediate Execution Plan (Next)`.
Do not change locked architecture decisions without explicit approval.
