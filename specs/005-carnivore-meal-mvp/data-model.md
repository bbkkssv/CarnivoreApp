# Data Model — Carnivore_Meal MVP (Phase 1)

## Entities and Fields (conceptual)

- User
  - id, email, password_hash, age_confirmed (bool), created_at, updated_at
  - consent_status, subscription_tier (enum: free/basic/premium), subscription_status

- OnboardingResponse
  - id, user_id, responses (JSON), completed_at

- PreferenceProfile
  - id, user_id, allowed_meats (set), exclusions (set), prep_time_pref, budget_range, cooking_skill, nutritional_profile (enum: strict/leaner/with_dairy/budget)

- Meal
  - id, name, description, ingredients (JSON), portions, macro_profile (JSON), prep_effort_tag

- MealPlan
  - id, user_id, start_date, end_date, days (JSON of meal ids), constraints_summary, status (draft/accepted), regeneration_count (by day), history (JSON)

- ShoppingList
  - id, user_id, meal_plan_id, items (JSON with qty/unit/section), export_formats (csv/pdf), created_at

- GroceryIntegrationRequest
  - id, user_id, shopping_list_id, service (instacart), payload_meta (JSON), status (prepared/sent/failed), error

- Subscription
  - id, user_id, tier, billing_cycle, price_id, status, started_at, renews_at, canceled_at

- FeedbackEntry
  - id, user_id, meal_id (optional), note, rating (1-5), created_at

- AdaptationLog
  - id, user_id, date, energy (1-5), digestion (1-5), mood (1-5), weight (num + unit), sleep (opt 1-5), cravings (opt 1-5)

- ConsentRecord
  - id, user_id, type, version, timestamp, source

- AuditLog
  - id, user_id, action, metadata (JSON), created_at

## Relationships
- User 1—N OnboardingResponse (latest used)
- User 1—1 PreferenceProfile
- User 1—N MealPlan; MealPlan 1—N Meal (per day association)
- MealPlan 1—1 ShoppingList
- ShoppingList 1—N GroceryIntegrationRequest
- User 1—N AdaptationLog, FeedbackEntry
- User 1—N Subscription (current active = latest)

## Validation & Rules
- Regeneration: Basic ≤3/day; Premium ≤10/day.
- Nutritional swap tolerance: ±20% daily macros; adhere to selected profile.
- Age: 18+ confirmation required.
- Data retention: per spec guidelines (health logs 2 years, purge deleted in 30 days, audits 1 year).
