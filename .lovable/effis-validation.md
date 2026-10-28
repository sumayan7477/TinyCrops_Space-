# EFFIS integration validation — 28 October 2026

## Working
- Authenticated farm-scoped server function uses the caller's database access and explicit account filter. No EFFIS keys are required; unrelated Copernicus credentials are not read or sent.
- Official WMS capabilities are fetched at runtime; missing/non-queryable layers, invalid catalogue XML, service exceptions and 12-second request timeouts are handled.
- `mf010.query` is queried for today's date and, when different and within seven days, the advertised default date. `mf010.fwi` is image-only and is not used to manufacture numeric results.
- `viirs.hs.query` is tested at the farm point for the last two days through today. Its result is not represented as a complete nearby-fire search.
- Farmer and Inspector pages, Settings status, refresh, no-data and failed-request states were checked signed in using the existing farm. Farmer navigation includes Wildfire risk.
- Eleven automated tests passed (ten evidence/service tests and the existing routing test). Preview reports build OK; signed-in browser reported no page errors.
- Source attribution and the official data-license link are shown. The retired Version 1 viewer link was replaced with the verified Version 2 viewer at `/apps/effis.csv/`.

## Actual service results
- Capabilities: successful real response.
- Madrid-area test point (40.4 N, 3.7 W), 28 and 30 October 2026: successful responses containing unresolved `[DAY]`, `[FWI]`, and `[DANGER_RISK]` placeholders. Alternative text/GML formats also provided no usable forecast attributes.
- The signed-in selected farm produced the same no-data outcome. No risk category, FWI value, observation date or distance was fabricated.
- VIIRS point queries succeeded; a no-result response cannot demonstrate absence of fires or full spatial coverage.
- Catalogue advertises `mf010.query` regional bounds -25..50 longitude and 25..72 latitude, time extent 2018..2099, default 30 October 2026. VIIRS/MODIS/NOAA hotspot query layers advertise 2000..2099, default 26 October 2026..2099. These ranges are metadata, not verified data availability.
- Official Version 2 viewer loaded and labels Meteo France as 10 km regional resolution. Numerical agreement at a farm location remains unverified because no usable query values were returned.

## Remaining limitations
- Usable fire-danger values and a provider-verified category mapping still need verification against the official viewer. Numeric DR codes are deliberately not mapped to danger categories.
- Complete nearby-fire enumeration requires an official EFFIS downloadable active-fire dataset or a documented feature service; NASA FIRMS, identified by EFFIS as the source, is another suitable official record service. No radius distance or “no nearby fires” claim is supported by the current WMS point query.
- No two-account adversarial access test was performed. The function verifies authentication and explicitly matches the farm to the caller, without privileged database access.
- Actual request failure was simulated in the browser; upstream timeout/error handling was tested with synthetic responses in unit tests only.
- No publishing was performed.