# Implementation Plan: Carnivore_Meal MVP

**Branch**: `[005-carnivore-meal-mvp]` | **Date**: 2025-09-17 | **Spec**: C:\\Users\\Business\\Documents\\source\\CarnivoreApp\\specs\\005-carnivore-meal-mvp\\spec.md
**Input**: Feature specification from `/specs/005-carnivore-meal-mvp/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `.github/copilot-instructions.md`).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

## Summary
Carnivore_Meal MVP delivers personalized carnivore meal planning (1–14 days), Instacart-focused grocery list export (CSV/PDF baseline, Premium Instacart cart handoff), subscription with Basic/Premium tiers, and adaptation tracking.

## Technical Context
**Language/Version**: TypeScript (Node 20.x), React 18, Next.js 14
**Primary Dependencies**: Next.js 14, Tailwind CSS, Zustand, Prisma, Supabase, Stripe, Resend, Instacart API
**Storage**: Supabase (PostgreSQL)
**Testing**: Jest + Playwright; contract validation via OpenAPI schemas
**Target Platform**: Web (Vercel), responsive mobile web
**Project Type**: web (frontend + backend via Next.js API routes)
**Performance Goals**: p95 < 2s for plan generation; TTI < 3s on 4G
**Constraints**: CSV/PDF exports baseline; in-app reminders only; privacy and retention per spec
**Scale/Scope**: Low-thousands users for MVP; scalable via Vercel + DB tuning

## Constitution Check
- Constitution template found but not populated with specific principles; no conflicts detected.
- Test-first emphasis retained via contract and integration test planning.
- Observability and simplicity principles acknowledged (Sentry, single-app architecture).

## Project Structure

### Documentation (this feature)
```
C:\Users\Business\Documents\source\CarnivoreApp\specs\005-carnivore-meal-mvp\
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts\
│   └── openapi.yaml
└── tasks.md (by /tasks)
```

**Structure Decision**: Web application structure (frontend + backend) implied by Next.js 14.

## Phase 0: Outline & Research
See research findings in `research.md`.

## Phase 1: Design & Contracts
- Data model captured in `data-model.md`.
- API surfaces outlined in `contracts/openapi.yaml`.
- Quickstart guides environment and dev setup in `quickstart.md`.

## Phase 2: Task Planning Approach
- /tasks will convert contracts and entities into a numbered task list with TDD-first ordering and [P] for parallel tasks.

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented
