# Quickstart — Carnivore_Meal MVP (Phase 1)

1. Prereqs: Node 20.x, pnpm/npm, Supabase project, Stripe keys, Resend key, Instacart sandbox.
2. Clone repo and checkout branch `005-carnivore-meal-mvp`.
3. Copy .env.example to .env and set:
   - DATABASE_URL (Supabase Postgres)
   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   - RESEND_API_KEY
   - INSTACART_API_KEY (Premium feature)
4. Install deps and run dev:
   - npm install; npm run dev
5. Initialize DB:
   - npx prisma migrate dev
6. Run tests:
   - npm test ; npx playwright test
7. Generate CSV/PDF from a sample plan via API; try Premium Instacart handoff in sandbox.
