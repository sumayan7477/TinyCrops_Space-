# Farmer and Inspector modes

## What changes
- Add a visible Farmer / Inspector switch on desktop and mobile. Farmer is the default; remember the choice separately for each account without changing farm records.
- In Farmer Mode, prioritize today's advice, weather and parcel changes in everyday language. Hide satellite numbers, charts, provider names and thresholds from the main experience. Each suggestion has a “Why this advice?” explanation separating evidence from interpretation.
- In Inspector Mode, retain the existing detailed pages and show observation dates, sources, scene-level cloud cover, parcel pixel quality, missing boundaries/crop details and comparison rules.
- Use the same saved real observations in both modes. Missing, old, cloud-affected or widely separated readings must produce cautious explanations, not confident recommendations. Keep fetch loading and service failures clear in both modes.
- Preserve the existing visual design, working integrations, account protections and server-only credentials. Do not publish.

## Technical approach
- Add an account-scoped presentation context around the signed-in shell; mode changes are local preferences only.
- Share tested parcel interpretation functions across Farmer summaries and Inspector charts. Reject invalid/duplicate dates and insufficient quality; surface freshness and long gaps explicitly.
- Adapt navigation, Crop Health, shared recommendation cards and the daily dashboard. Keep detailed tools accessible in Inspector Mode; avoid unrelated redesign.
- Inspect all content-page metadata and preserve unique page titles and descriptions.

## Validation
- Automated tests: stable readings, consistent decline, one-off drop, cloud contamination, missing quality/observations, long gaps, stale readings, missing boundaries and crop details, account-specific mode preferences.
- Signed-in desktop/mobile checks: both modes, persistence, saved real parcel evidence, explanations, retrieval failures and weather failures. Synthetic scenarios stay in tests only.
- Audit existing account filtering and credential boundaries; report any checks that cannot be verified.
- Report what works and what still needs validation with farmers and actual field conditions.