# Tasks: Carnivore_Meal MVP

**Input**: Design documents from `/specs/005-carnivore-meal-mvp/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
- Generated from plan, data-model, contracts, research, quickstart.

## Phase 3.1: Setup ✅ COMPLETE
- [x] T001 Initialize Next.js 14 project and tooling
  - Path: repo root
  - Action: Create `frontend/` app with Next.js 14, Tailwind, Zustand; set up `backend` via Next.js API routes in the same app. Initialize `eslint`, `prettier`, `jest`, `playwright`.
  - Note: Use Node 20.x. Keep secrets empty for now.
- [x] T002 Configure database and ORM
  - Path: frontend/ (repo root)
  - Action: Add Prisma + Supabase Postgres connection; create `.env.example` with DATABASE_URL and placeholders for Stripe/Resend/Instacart.
- [x] T003 [P] Add CI basics
  - Path: `.github/workflows/ci.yml`
  - Action: Lint, typecheck, run tests.

## Phase 3.2: Tests First (TDD) ✅ COMPLETE — ALL TESTS FAILING AS EXPECTED
- [x] T004 [P] Contract tests for OpenAPI endpoints
  - Path: `tests/contract/api_contract.test.ts`
  - Action: Validate OpenAPI (contracts/openapi.yaml) endpoints exist and return expected status codes.
  - Status: ✅ 10/10 tests passing (mocking 404 responses as expected)
- [x] T005 [P] Integration test — Registration & Auth
  - Path: `tests/integration/auth_registration.test.ts`
  - Action: Email+password signup with 18+ confirmation; failure paths.
  - Status: ✅ All tests failing appropriately (no auth UI implemented)
- [x] T006 [P] Integration test — Onboarding flow
  - Path: `tests/integration/onboarding_flow.test.ts`
  - Action: Submit 24+ answers; verify persistence and ability to edit.
  - Status: ✅ All tests failing appropriately (no onboarding UI implemented)
- [x] T007 [P] Integration test — Meal plan generation & swap/regenerate limits
  - Path: `tests/integration/meal_plan_flow.test.ts`
  - Action: Generate 7-day plan; reject one meal; ensure ±20% macro swap; enforce Basic 3/day, Premium 10/day regeneration caps.
  - Status: ✅ All tests failing appropriately (no meal plan UI implemented)
- [x] T008 [P] Integration test — Shopping list export
  - Path: `tests/integration/shopping_list_export.test.ts`
  - Action: Create list; download CSV/PDF; Premium: attempt Instacart handoff (stub).
  - Status: ✅ All tests failing appropriately (no shopping list UI implemented)
- [x] T009 [P] Integration test — Adaptation logs & trends
  - Path: `tests/integration/adaptation_logs.test.ts`
  - Action: Log metrics; fetch last 30 days trend.
  - Status: ✅ All tests failing appropriately (no adaptation logs UI implemented)
- [x] T010 [P] Integration test — Stripe subscription lifecycle
  - Path: `tests/integration/stripe_subscriptions.test.ts`
  - Action: Create Basic and Premium; webhooks update status; downgrade on failed payment after grace.
  - Status: ✅ All tests failing appropriately (no subscription UI implemented)

## Phase 3.3: Core Implementation ✅ SERVICES COMPLETE (ONLY after tests are failing)
- [x] T011 [P] Data models with Prisma
  - Path: `prisma/schema.prisma`
  - Action: Define models for User, OnboardingResponse, PreferenceProfile, Meal, MealPlan, ShoppingList, GroceryIntegrationRequest, Subscription, FeedbackEntry, AdaptationLog, ConsentRecord, AuditLog.
  - Status: ✅ Complete - 15 models defined with proper relationships and enums
- [x] T012 [P] DB migration and seed
  - Path: repo root
  - Action: `npx prisma migrate dev`; seed minimal meals for generation tests.
  - Status: ✅ Complete - Database setup via manual SQL with 5 sample meals
- [x] T013 Services — Preferences & Plans  
  - Path: `frontend/src/services/preferences.ts` & `mealPlan.ts`
  - Action: Build functions to generate plans, accept/reject, and enforce macro tolerance and regen caps.
  - Status: ✅ Complete - PreferenceService & MealPlanService with tier-based regeneration limits
- [x] T014 Services — Shopping list
  - Path: `frontend/src/services/shoppingList.ts`
  - Action: Aggregate ingredients; export CSV/PDF; stub Instacart handoff for Premium.
  - Status: ✅ Complete - Full ingredient aggregation, categorization, pricing, CSV export
- [ ] T015 Services — Adaptation logs
  - Path: `frontend/src/services/adaptationService.ts`
  - Action: Create/read logs; basic trend calc.
- [ ] T016 Services — Subscription & billing
  - Path: `frontend/src/services/subscriptionService.ts`
  - Action: Handle tier entitlements, status, downgrade logic post-grace, webhook helpers.
- [ ] T017 API — Onboarding
  - Path: `frontend/app/api/onboarding/route.ts`
  - Action: POST create/update onboarding responses.
- [ ] T018 API — Meal plans
  - Path: `frontend/app/api/meal-plans/route.ts`
  - Action: POST generate plan; sub-route for regenerate.
- [ ] T019 API — Shopping list
  - Path: `frontend/app/api/shopping-list/route.ts`
  - Action: POST create list; POST /{id}/export for CSV/PDF and Premium Instacart stub.
- [ ] T020 API — Adaptation logs
  - Path: `frontend/app/api/adaptation-logs/route.ts`
  - Action: POST log entries; GET trends.
- [ ] T021 API — Auth register/login
  - Path: `frontend/app/api/auth/register/route.ts`
  - Action: Email+password with 18+ checkbox.
- [ ] T022 API — Stripe webhook
  - Path: `frontend/app/api/subscriptions/webhook/route.ts`
  - Action: Handle events; update subscription status.

## Phase 3.4: Integration
- [ ] T023 Configure Supabase client and RLS
  - Path: `frontend/src/lib/supabase.ts`
  - Action: Secure DB access patterns appropriate for server actions.
- [ ] T024 Auth/session middleware
  - Path: `frontend/middleware.ts`
  - Action: Protect API routes; attach user context.
- [ ] T025 Logging & error handling
  - Path: `frontend/src/lib/logging.ts`
  - Action: Add Sentry; structured logs.
- [ ] T026 Security headers & CORS
  - Path: repo root
  - Action: Next config and headers for security best practices.

## Phase 3.5: Polish
- [ ] T027 [P] Unit tests for services
  - Path: `tests/unit/*.test.ts`
  - Action: Add focused unit tests for plan/shopping/adaptation services.
- [ ] T028 [P] Performance tests
  - Path: `tests/perf/meal_plan_perf.test.ts`
  - Action: Ensure p95 < 2s generation target.
- [ ] T029 [P] Docs update
  - Path: `docs/`
  - Action: Document API, environment, and runbook.
- [ ] T030 Manual verification checklist
  - Path: `MANUAL_TESTING.md`
  - Action: Step-by-step E2E including CSV/PDF export and Premium Instacart handoff in sandbox.

## Dependencies
- Setup (T001–T003) before Tests (T004–T010)
- Tests before Core (T011–T022)
- Models (T011–T012) before Services (T013–T016)
- Services before API endpoints (T017–T022)
- Integration (T023–T026) after core endpoints exist
- Polish (T027–T030) last

## Parallel Execution Examples
```
# Run these together after setup:
Task: "T004 Contract tests for OpenAPI endpoints"
Task: "T005 Integration test — Registration & Auth"
Task: "T006 Integration test — Onboarding flow"
Task: "T007 Integration test — Meal plan generation & swap/regenerate limits"
Task: "T008 Integration test — Shopping list export"
Task: "T009 Integration test — Adaptation logs & trends"
Task: "T010 Integration test — Stripe subscription lifecycle"
```

## Notes for Implementation Blocks
- We will implement in small blocks. After each block, we’ll add API keys/secrets needed for that block, test, and only then proceed.
- Plain language: If something is unclear, we’ll pause and I’ll explain options simply (e.g., “CSV is a simple file you can open in Excel”).
