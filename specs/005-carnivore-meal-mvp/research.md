# Research — Carnivore_Meal MVP (Phase 0)

## Decisions and Rationale

### Next.js 14 with App Router
- Decision: Use Next.js 14 app router with server actions.
- Rationale: Co-located API via route handlers; SSR and SEO; mature ecosystem.
- Alternatives: Remix, SvelteKit — both viable, chose Next.js for team familiarity and Vercel.

### State Management (Zustand)
- Decision: Zustand for local client state.
- Rationale: Lightweight, simple store for plan interactions; avoids Redux overhead.
- Alternatives: Redux Toolkit, Jotai.

### Styling (Tailwind CSS)
- Decision: Tailwind for rapid responsive UI.
- Alternatives: CSS Modules, Chakra UI.

### Database & Auth (Supabase + Prisma)
- Decision: Supabase (Postgres) with Prisma ORM.
- Rationale: Managed Postgres, real-time features, easy local dev; Prisma for type safety and migrations.
- Alternatives: PlanetScale + Drizzle, direct Supabase client.

### Billing (Stripe)
- Decision: Stripe for subscriptions (Basic/Premium, monthly/annual, intro pricing).
- Rationale: Ubiquitous, strong webhook support.
- Alternatives: Paddle, LemonSqueezy.

### Grocery Integration (Instacart)
- Decision: CSV/PDF download baseline for all; Premium adds Instacart cart handoff.
- Rationale: MVP practicality with upgrade path.
- Alternatives: Walmart API later.

### Email (Resend)
- Decision: Resend for auth and transactional emails (no marketing).
- Rationale: Simple API, good DevEx.
- Alternatives: Postmark, SendGrid.

### Error Tracking (Sentry)
- Decision: Sentry for error/perf monitoring.
- Alternatives: LogRocket, Datadog.

### Performance Targets
- Decision: p95 < 2s for plan generation; page TTI < 3s on 4G.
- Rationale: Responsive UX for target audience.

### Privacy/Retention
- Decision: Implement retention rules from spec; minimal data collection; consent records and audits.

## Open Questions Resolved
- Node version: 20.x LTS.
- Testing libraries: Jest + Playwright; contract tests via OpenAPI schemas.
- Scale: MVP aiming for low-thousands of users; design for growth.

## Alternatives Considered
- Full microservices split — rejected for MVP; keep monorepo/app-first.
- Heavy analytics — defer to Premium post-MVP.
