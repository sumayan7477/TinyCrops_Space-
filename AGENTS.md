<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate, wrapped in FarmProvider + AppShell); why: session is in localStorage.
- Decision rules (heat bands, dryness, ranking) live as pure functions in `src/lib/insights.ts` with tests; why: keeps recommendations transparent and testable.
- External data providers go through service modules in `src/lib/` (e.g. `weather.ts`); why: providers stay replaceable and UI never calls APIs directly.
- Never show fabricated/mock observations: missing sources render explicit "not connected / insufficient data" states; why: core product requirement.
- AI assistant runs in `src/routes/api/assistant.ts`, verifies the bearer token, and grounds answers only on the caller's records; why: no data leakage or invented facts.
- Leaflet is imported dynamically inside `FarmMap` and rendered via `LazyMap` (ClientOnly); why: Leaflet breaks SSR.
- Copernicus/Sentinel Hub calls run only in `src/lib/sentinel.server.ts` via the authenticated `src/routes/api/sentinel.ts` route (TanStack server route, not Edge Functions); why: client secret stays server-side and results are saved per user.
- NDVI trend/comparison rules live in `src/lib/ndvi-trend.ts` (tested), rendered by `NdviTrend`; why: interpretation stays rule-based, self-referential (no universal threshold) and testable.
- Farmer/Inspector presentation lives in ViewModeProvider, persisted locally per authenticated account and independent of farm records; why: both modes use identical data and authorization.
- Parcel advice and Inspector comparisons share tested NDVI analysis, requiring distinct valid dates and known pixel quality, with freshness, gaps and approximate-area limitations; why: simple advice must not imply more certainty than its evidence.
- EFFIS WMS access lives in effis.server.ts behind an authenticated farm-scoped server function; catalogue/query success is separate from usable evidence, and point queries never imply a complete nearby-fire search; why: preserve privacy and avoid false reassurance.
