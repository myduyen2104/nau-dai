# Adding ingredient substitution rules

Rules live in `src/data/ingredient-substitutions.json`; the engine reads them without adding one-off ingredient logic.

Before adding a rule:

1. Find a reputable source that explicitly supports the proposed swap. Save its URL and keep `verificationStatus` as `verified` only when the source is present.
2. Use canonical ingredient IDs from `src/data.ts`. Aliases identify the same ingredient and are not separate substitute rules.
3. Add one direction only unless a source supports both directions independently. Do not assume a 1:1 amount; leave `ratio` out when the source gives no measured ratio.
4. Set `suitability` to `conditional` when the flavor, texture, or method may change. Explain that impact and any supported cooking adjustment. Avoid a rule if the swap changes the defining ingredient of a dish.
5. Add recipe or method restrictions when the evidence requires them. Do not infer allergy safety from a category; explicit user exclusions and dietary flags are still applied by the engine.
6. Run `npm run validate:substitutions`, `npm test`, and `npm run build`.

The engine currently recommends only verified rules. It gives a recipe the separate substitution category only when verified, safe replacements for all missing required ingredients are already in the fridge. The original recipe and its quantities remain unchanged.
