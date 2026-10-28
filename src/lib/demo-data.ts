/**
 * Isolated illustrative data for the public /demo route.
 * Nothing here is real: no live weather, no real satellite detections,
 * no real farm. This module must never be mixed into the real farmer
 * dashboard or the farm database.
 */

export const DEMO_FARM = {
  name: "Green Valley Demo Farm",
  location: "Lappeenranta, Finland",
  crop: "Spring wheat",
  sizeHa: 12,
  lastObservation: "20 October 2026",
} as const;

export type DemoSeverity = "monitor" | "check" | "prepare" | "limited" | "none";

export interface DemoWarning {
  id: string;
  title: string;
  severity: DemoSeverity;
  severityLabel: string;
  /** 1. What did TinyCrops notice? */
  noticed: string;
  /** 2. Why might it matter? */
  why: string;
  /** 3. What should I do? */
  action: string;
  /** 4. When should I do it? */
  timing: string;
  /** 5. How reliable is this indication? */
  confidence: string;
  /** 6. What information is still missing? */
  missing: string;
  /** "Why this suggestion?" expandable evidence panel */
  evidence: string;
}

export type DemoScenarioId = "normal" | "dry" | "rain" | "stress" | "cloudy" | "fire";

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  /** Short explanation of what changed when this scenario is selected */
  explanation: string;
  attentionCount: number;
  statusSummary: string;
  weatherOutlook: string;
  cropObservation: string;
  fireMonitoring: string;
  today: string[];
  warnings: DemoWarning[];
}

const VEGETATION_MONITOR: DemoWarning = {
  id: "vegetation-change",
  title: "Vegetation change",
  severity: "monitor",
  severityLabel: "Monitor",
  noticed:
    "Illustrative satellite observations show a small change in the vegetation signal, without a clear significant decline.",
  why: "The vegetation signal has changed slightly, but this may be normal variation between observations.",
  action: "Continue routine scouting and compare the next clear satellite observation.",
  timing: "At the next suitable observation.",
  confidence: "Low concern — small changes between observations are common and often meaningless.",
  missing: "The next clear observation, and notes from your own field walks.",
  evidence:
    "Rule-based interpretation of two illustrative vegetation-index values. The change is inside the normal variation band, so no action is suggested — only continued monitoring. Not every small change is a problem.",
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "normal",
    label: "Normal conditions",
    explanation:
      "Baseline view: illustrative weather and satellite signals show nothing unusual. Only routine monitoring is suggested.",
    attentionCount: 0,
    statusSummary: "No items need attention",
    weatherOutlook: "Illustrative outlook: mild, no unusual rainfall in the example period.",
    cropObservation: `Illustrative observation from ${DEMO_FARM.lastObservation}: vegetation signal stable.`,
    fireMonitoring: "No confirmed demo alert. Fire monitoring is separate from fire-danger forecasts.",
    today: ["Routine field walk — nothing unusual in the illustrative data."],
    warnings: [VEGETATION_MONITOR],
  },
  {
    id: "dry",
    label: "Dry conditions",
    explanation:
      "The illustrative weather period now shows several days with low rainfall, and a small vegetation change is also visible. Two items move to “needs attention”.",
    attentionCount: 2,
    statusSummary: "2 items need attention",
    weatherOutlook: "Illustrative outlook: several days with low rainfall in the example period.",
    cropObservation: `Illustrative observation from ${DEMO_FARM.lastObservation}: small vegetation change, no clear decline.`,
    fireMonitoring: "No confirmed demo alert. Fire monitoring is separate from fire-danger forecasts.",
    today: [
      "Check soil moisture in the field — the illustrative dry period cannot confirm it.",
      "If the crop needs water and irrigation is available, plan watering.",
    ],
    warnings: [
      {
        id: "dry-conditions",
        title: "Dry conditions",
        severity: "check",
        severityLabel: "Moderate — check today",
        noticed: "Illustrative data: several days with low rainfall.",
        why: "The field may be getting dry. Weather information alone cannot confirm soil moisture.",
        action:
          "Check soil moisture in the field. If the crop needs water and irrigation is available, plan watering.",
        timing: "Check today.",
        confidence: "Possible concern — field inspection needed.",
        missing: "Actual soil moisture in the field, and whether irrigation is available.",
        evidence:
          "Rule-based interpretation: the illustrative rainfall total for the example period is below the rule's low-rainfall band. This is a weather-based estimate, not a soil measurement — that is why the advice is to check, not to water automatically.",
      },
      VEGETATION_MONITOR,
    ],
  },
  {
    id: "rain",
    label: "Heavy rain",
    explanation:
      "The illustrative forecast now includes a heavy-rain period. Field work and drainage become the priority.",
    attentionCount: 1,
    statusSummary: "1 item needs attention",
    weatherOutlook: "Simulated forecast: heavy rainfall expected in the example scenario.",
    cropObservation: `Illustrative observation from ${DEMO_FARM.lastObservation}: vegetation signal stable.`,
    fireMonitoring: "No confirmed demo alert. Fire monitoring is separate from fire-danger forecasts.",
    today: [
      "Check field drainage before the example rain period.",
      "Postpone machinery work if the soil is too wet.",
    ],
    warnings: [
      {
        id: "heavy-rain",
        title: "Heavy rain",
        severity: "prepare",
        severityLabel: "Prepare",
        noticed: "Simulated forecast: heavy rainfall expected in the example scenario.",
        why: "Heavy rain may temporarily waterlog low-lying parts of a field or delay field work.",
        action: "Check field drainage and postpone machinery work if the soil is too wet.",
        timing: "Before the example rain period.",
        confidence: "Simulated forecast only — not a real current forecast for this location.",
        missing: "A real, current forecast; the field's actual drainage condition.",
        evidence:
          "Rule-based interpretation of a simulated rainfall forecast. The suggestion is preparation, not alarm: heavy rain is a planning constraint for machinery and drainage, not proof of damage.",
      },
      {
        id: "weather-change",
        title: "Weather change",
        severity: "monitor",
        severityLabel: "Monitor",
        noticed: "Illustrative temperature and rainfall changes could affect field work.",
        why: "Changing conditions can make spraying, sowing, harvesting, or machinery work unsafe or ineffective.",
        action:
          "Review the upcoming conditions before spraying, sowing, harvesting, or taking machinery into the field.",
        timing: "Before each planned field operation.",
        confidence: "Illustrative values only — review a real forecast before deciding.",
        missing: "A real, current forecast for the farm's location.",
        evidence:
          "Rule-based reminder triggered by changing illustrative weather values. It does not predict damage; it only prompts a forecast review before field operations.",
      },
    ],
  },
  {
    id: "stress",
    label: "Possible crop stress",
    explanation:
      "The illustrative satellite series now shows a decrease in the vegetation index over time. This is an indication to inspect, not a diagnosis.",
    attentionCount: 1,
    statusSummary: "1 item needs attention",
    weatherOutlook: "Illustrative outlook: mild, no unusual rainfall in the example period.",
    cropObservation: `Illustrative observations up to ${DEMO_FARM.lastObservation}: vegetation index lower than in the previous usable observation.`,
    fireMonitoring: "No confirmed demo alert. Fire monitoring is separate from fire-danger forecasts.",
    today: [
      "Inspect the affected areas within 1–2 days.",
      "Compare crop colour, growth, soil conditions, and recent field activity.",
    ],
    warnings: [
      {
        id: "crop-stress",
        title: "Possible crop stress",
        severity: "check",
        severityLabel: "Check the field",
        noticed:
          "Illustrative satellite observations show a decrease in the vegetation index over time.",
        why: "Vegetation activity appears lower than in the previous usable observation. This can have several causes.",
        action:
          "Inspect affected areas and compare crop colour, growth, soil conditions, and recent field activity.",
        timing: "Within 1–2 days.",
        confidence: "Satellite indication only — not a disease diagnosis.",
        missing:
          "Field inspection results. NDVI alone cannot identify pests, disease, nutrient deficiency, or soil moisture.",
        evidence:
          "Rule-based comparison of two illustrative vegetation-index values from distinct, usable dates. The drop exceeds the normal variation band, so inspection is suggested. The rule deliberately names no cause — satellite data cannot establish one on its own.",
      },
    ],
  },
  {
    id: "cloudy",
    label: "Cloudy satellite image",
    explanation:
      "The latest illustrative satellite scene has substantial cloud cover, so the observation is flagged as limited rather than trusted.",
    attentionCount: 1,
    statusSummary: "1 item needs attention",
    weatherOutlook: "Illustrative outlook: mild, no unusual rainfall in the example period.",
    cropObservation: `Illustrative scene from ${DEMO_FARM.lastObservation}: substantial cloud cover — observation limited.`,
    fireMonitoring: "No confirmed demo alert. Fire monitoring is separate from fire-danger forecasts.",
    today: [
      "Wait for a clearer satellite observation.",
      "Inspect the field directly if you are concerned.",
    ],
    warnings: [
      {
        id: "data-quality",
        title: "Satellite data quality",
        severity: "limited",
        severityLabel: "Observation limited",
        noticed: "The illustrative scene has substantial cloud cover.",
        why: "Clouds may make the satellite observation less reliable.",
        action: "Wait for a clearer observation and inspect the field directly if you are concerned.",
        timing: "At the next suitable observation.",
        confidence:
          "Scene-level cloud cover is reported for the whole satellite scene; cloud over the actual field may differ.",
        missing: "A clearer observation, and cloud information specific to the field itself.",
        evidence:
          "Data-quality rule: when the illustrative scene's cloud cover is high, the observation is marked limited instead of being interpreted. TinyCrops prefers saying “we can't tell” over guessing from an unreliable image.",
      },
    ],
  },
  {
    id: "fire",
    label: "Fire detection example",
    explanation:
      "An optional illustrative scenario: a thermal detection appears near the demo farm. It is shown as an unverified indication, never as a confirmed fire.",
    attentionCount: 1,
    statusSummary: "1 item needs attention",
    weatherOutlook: "Illustrative outlook: mild, no unusual rainfall in the example period.",
    cropObservation: `Illustrative observation from ${DEMO_FARM.lastObservation}: vegetation signal stable.`,
    fireMonitoring:
      "Illustrative example active: one unverified thermal detection in the wider area. Not a confirmed fire.",
    today: [
      "Check official local fire information.",
      "Follow local authorities' instructions.",
    ],
    warnings: [
      {
        id: "fire-monitoring",
        title: "Fire monitoring",
        severity: "check",
        severityLabel: "No confirmed demo alert",
        noticed:
          "Illustrative example: a satellite thermal detection in the wider area around the demo farm.",
        why: "Satellite heat detections can be false positives and do not automatically confirm a wildfire.",
        action: "Check official local fire information and follow local authorities' instructions.",
        timing: "Promptly, if you rely on this example — but remember it is simulated.",
        confidence:
          "Unverified illustration only. No real fire, no real distance, and no real detection is shown.",
        missing:
          "Confirmation from official sources. A single thermal detection is not a complete nearby-fire search.",
        evidence:
          "Fire detection is kept separate from fire-danger forecasting. A thermal detection is a heat signal from a satellite instrument; it can come from many sources and says nothing by itself about fire danger or spread.",
      },
    ],
  },
];

export const DEMO_SCENARIO_MAP: Record<DemoScenarioId, DemoScenario> = Object.fromEntries(
  DEMO_SCENARIOS.map((s) => [s.id, s]),
) as Record<DemoScenarioId, DemoScenario>;

export const DEFAULT_SCENARIO: DemoScenarioId = "dry";
