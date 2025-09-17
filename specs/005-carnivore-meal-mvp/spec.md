# Feature Specification: Carnivore_Meal MVP — Guided Meal Planning, Shopping Lists, and Adaptation Tracking

**Feature Branch**: `[005-carnivore-meal-mvp]`  
**Created**: 2025-09-16  
**Status**: Draft  
**Input**: User description: "We are building a web application called Carnivore_Meal.  
The purpose of this application is to help adults aged 40–58 adopt and sustain a carnivore diet through guided meal planning, shopping lists, and adaptation tracking.  
  
The product should:  
1. Collect user preferences and constraints via a structured onboarding questionnaire (24+ questions).  
2. Generate meal plans ranging from 1–14 days, customized to those preferences and dietary goals.  
3. Allow users to accept, reject, or regenerate meals dynamically.  
4. Integrate with grocery services (e.g., Instacart, Walmart) to turn plans into shopping lists.  
5. Provide a simple subscription model with at least two tiers.  
6. Track user feedback, adaptation symptoms, and health markers over time.  
7. Prepare for future mobile expansion (iOS/Android).  
  
Constraints & principles:  
- Focus on clarity and extensibility (modular architecture).  
- Protect user health and personal data with appropriate privacy and compliance standards (HIPAA/GDPR alignment, to be refined).  
- Build initially as a web app MVP, but keep design modular for reuse in a mobile app.  
- Documentation and specifications should be the primary source of truth (spec-driven development).  
  
Output:  
Generate an initial project specification including:  
- High-level purpose statement  
- Core user personas and needs  
- System goals and constraints  
- Open questions that need clarification"

Purpose: Help adults aged 40–58 successfully start and sustain a carnivore diet through personalized meal planning, frictionless grocery fulfillment, and simple adaptation tracking while safeguarding privacy and enabling future mobile expansion.

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing (mandatory)

### Primary User Story
As a middle-aged adult beginning or optimizing a carnivore diet, I want to answer a clear onboarding questionnaire, receive a personalized 1–14 day meal plan that fits my constraints, accept/reject/regenerate meals as needed, convert the plan into a shopping list for my preferred grocery service, subscribe to ongoing access, and track my adaptation and health markers over time so that I can sustain the diet with confidence and minimal friction.

#### Personas
- Persona A: "Health Rebalancer" (40–58). Needs simple, low-effort planning to improve energy, weight, and metabolic markers. Values safety and clarity.
- Persona B: "Busy Professional" (40–58). Time-constrained, needs rapid plan generation, minimal prep, direct-to-cart grocery export.
- Persona C: "Data Tracker" (40–58). Motivated by metrics; wants symptom logging and trends without clinical complexity.

### Acceptance Scenarios
1. Given a new user, When they complete a 24+ question onboarding, Then the system stores preferences/constraints and confirms completion.
2. Given saved preferences, When the user requests a 7-day plan, Then the system generates meals aligned to preferences and goals within seconds and displays daily structure.
3. Given a generated plan, When the user rejects a meal, Then the system proposes a compliant alternative without breaking daily nutritional constraints. The new meals should have similar macros (within 20%) so as to keep the daily macros within range, aligned to the selected nutritional profile. Default profile is “Strict Carnivore”; optional user-selectable adjustments include “Leaner Version,” “With Dairy,” and “Budget-based macro ranges.”
4. Given a generated plan, When the user requests regeneration for a day, Then the system replaces that day while preserving overall constraints and variety.
5. Given an approved plan, When the user creates a shopping list, Then the system aggregates ingredients and quantities by store section and allows export as a downloadable list (CSV/PDF); Premium users may also send the list via direct Instacart cart handoff.
6. Given partner selection (Instacart), When the user chooses Instacart, Then the system prepares the shopping list for Instacart. For MVP the minimum viable export is a downloadable shopping list (CSV/PDF); Premium additionally supports direct Instacart cart handoff.
7. Given access tiers, When a user purchases a subscription, Then access to tiered features is granted immediately and renews per billing cycle. Basic: limited health tracking and downloadable grocery list only; Premium: advanced tracking & analytics, multiple saved plans, early mobile access, carnivore diet assistant chat, and direct Instacart cart handoff. Pricing: Basic $19.97/mo intro ($29.97 regular), $199/year; Premium $39.97/mo intro ($49 regular), $299/year.
8. Given daily check-ins, When a user logs adaptation symptoms and markers, Then entries are timestamped, visible on a simple trend view, and editable.
9. Given privacy requirements, When a user requests data export or deletion, Then the system completes the request within defined timelines.
10. Given mobile expansion, When used on mobile web, Then the UI is responsive and information architecture supports later native reuse.

### Edge Cases
- Incomplete onboarding (user exits early) → prompt to resume; generate plan blocked until required items answered.
- Conflicting constraints (e.g., strict budget + premium cuts only) → present resolution guidance and require confirmation.
- Ingredient availability mismatches at chosen retailer → suggest substitutions or flag out-of-stock items.
- Grocery integration failure (partner outage) → provide downloadable list fallback and retry guidance.
- Payment failure or expired card → Grace period 7 days; retry billing every 48 hours up to 3 attempts; after grace, downgrade to Basic/free with limited features.
- Rapid successive regenerations → limits apply: Basic 3 regenerations/day; Premium 10/day; remaining count visible in UI.
- Sensitive marker entries (e.g., blood pressure) → clear disclaimers and non-diagnostic positioning.
- Timezone/day rollover impacts on plan start dates and check-in reminders.
- Multi-device concurrency (web on desktop and phone) → last-write-wins (latest device update overwrites).

## Requirements (mandatory)

### Functional Requirements
- FR-001: System MUST present an onboarding questionnaire with at least 24 required/optional items capturing preferences, constraints, and goals.
- FR-002: System MUST persist onboarding responses and allow users to review/update key preferences later.
- FR-003: System MUST generate meal plans for user-selected durations between 1 and 14 days.
- FR-004: Generated plans MUST respect stated constraints (e.g., preferred meats, exclusions, prep time, budget range) and goals, using nutritional profiles. Default: “Strict Carnivore”; optional adjustments: “Leaner Version,” “With Dairy,” and “Budget-based macro ranges.”
- FR-005: Users MUST be able to accept or reject individual meals within a plan.
- FR-006: Users MUST be able to regenerate a meal or a whole day while preserving overall plan constraints.
- FR-007: System MUST aggregate ingredients from an accepted plan into a single shopping list with quantities.
- FR-008: System MUST support formatting the shopping list for Instacart at launch and provide downloadable CSV/PDF exports.
- FR-009: Users MUST be able to initiate a shopping list handoff to Instacart. All users can download CSV/PDF; Premium users also get direct Instacart cart handoff.
- FR-010: System MUST provide a subscription model with at least two tiers (Basic, Premium) and enforce feature access by tier.
- FR-011: System MUST allow users to start, renew, cancel, and view subscription status.
- FR-012: System MUST record user feedback, adaptation symptoms, and selected health markers via simple daily/weekly check-ins.
- FR-013: System MUST provide a basic trend view (e.g., last 30 days) for logged symptoms/markers.
- FR-014: System MUST enforce plan regeneration limits by tier and display remaining regenerations: Basic 3/day; Premium 10/day; resets daily at a consistent time.
- FR-015: System MUST provide data export (machine-readable) and deletion requests aligned with privacy requirements.
- FR-016: System MUST display clear health and dietary disclaimers and emergency guidance; the product is non-diagnostic.
- FR-017: System MUST be responsive and usable on mobile web to ease future native app reuse.
- FR-018: System MUST support in-app reminders for check-ins (no SMS/email in MVP) with simple frequency controls.
- FR-019: System MUST handle timezones consistently for plan dates and logs.
- FR-020: System MUST provide accessibility conforming to WCAG 2.1 AA principles for core flows.
- FR-021: System MUST maintain an audit trail for key privacy actions (consent, export, deletion). 
- FR-022: System MUST provide email + password authentication with an age confirmation (18+) checkbox at registration. Future: optional social login (Google, Apple).
- FR-023: Out of scope for MVP — saving multiple plan presets/templates is Phase 2.
- FR-024: System SHOULD allow optional notes on meals and substitutions.
- FR-025: System SHOULD allow sharing or printing of shopping lists.

#### Subscription Tiers & Pricing (MVP)
- Basic: limited health tracking, downloadable grocery list only (no direct partner handoff), $19.97/mo intro ($29.97 regular), $199/year.
- Premium: advanced tracking & analytics, multiple saved plans, early mobile access, carnivore diet assistant chat, direct Instacart cart handoff; $39.97/mo intro ($49 regular), $299/year.

#### Goals and Constraints (derived from brief)
- Goal: Clarity and extensibility through modular product design (non-technical).
- Goal: Privacy-first handling of health-adjacent data; align to HIPAA/GDPR where applicable (details to be refined).
- Goal: MVP as a web app, with content/structure reusable for mobile apps.
- Constraint: No clinical claims; present as guidance and logging, not medical advice.
- Constraint: Target audience 40–58 for tone and content; do not hard block outside users. Allow adults 18+ to register.
- Constraint: Subscription with at least two tiers and clear entitlements.

#### Compliance & Privacy (high-level)
- The product MUST capture explicit consent for processing personal and health-adjacent data.
- Provide user-accessible data rights: view, export, delete; document processing purposes.
- Data retention: Onboarding/meal data retained until account deletion; Health logs retained 2 years by default (extend while user stays active); Deleted data purged within 30 days; Audit logs retained at least 1 year.
- Implement least-necessary data collection principle.

### Key Entities (include if feature involves data)
- User: identity basics, age band (optional), contact, consent status, subscription tier/status.
- OnboardingResponse: structured answers to 24+ questions; timestamped; linked to User.
- PreferenceProfile: normalized preferences/constraints derived from onboarding (e.g., allowed meats, exclusions, prep time, budget range, cooking skill).
- Meal: name/description, portion(s), ingredient list, nutritional attributes (high-level), preparation effort tags.
- MealPlan: time span (1–14 days), set of Meals per day, constraints summary, status (draft/accepted), regeneration history.
- ShoppingList: aggregated ingredients with quantities, store sections, substitution hints; export formats CSV/PDF; Premium supports direct Instacart cart handoff.
- GroceryIntegrationRequest: target service (Instacart), payload/format metadata, status (prepared/sent/failed), error notes.
- Subscription: tier, start/renewal dates, payment status, cancellation flags, benefits mapping.
- FeedbackEntry: user notes, ratings, meal feedback (like/dislike), timestamps.
- AdaptationLog: metrics include Energy (1–5), Digestion comfort (1–5), Mood (1–5), Weight (lbs/kg toggle); optional Sleep quality and Hunger/Cravings; units and ranges captured.
- ConsentRecord: consent type, timestamp, source, version of policy agreed.
- AuditLog: key user-facing privacy and access events (export/deletion requests, consent updates).

---

## Review & Acceptance Checklist
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
