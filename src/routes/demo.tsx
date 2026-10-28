import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout, CloudSun, Leaf, Flame, RotateCcw, MapPin, Ruler, Wheat, Satellite,
  CloudRainWind, Search, Lightbulb, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge2, Panel } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import {
  DEMO_FARM, DEMO_SCENARIOS, DEMO_SCENARIO_MAP, DEFAULT_SCENARIO,
  type DemoScenarioId, type DemoSeverity, type DemoWarning,
} from "@/lib/demo-data";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "TinyCrops Demo Farm — Illustrative walkthrough" },
      { name: "description", content: "A public, simulated TinyCrops demo farm. See how weather, satellite and fire information become practical daily advice — no login, no real farm data." },
      { property: "og:title", content: "TinyCrops Demo Farm — Illustrative walkthrough" },
      { property: "og:description", content: "Explore a simulated demo farm and see how TinyCrops turns data into daily field decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

const SEVERITY_CLS: Record<DemoSeverity, string> = {
  monitor: "bg-info/10 text-info border-info/30",
  check: "bg-warning/20 text-warning-foreground border-warning/40",
  prepare: "bg-warning/20 text-warning-foreground border-warning/40",
  limited: "bg-muted text-muted-foreground border-border",
  none: "bg-success/15 text-success border-success/30",
};

function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-warning-foreground">
        Demo mode · Illustrative farm data
      </p>
      <p className="mx-auto max-w-2xl text-xs text-foreground/70">
        Warnings and farm observations on this page are simulated for demonstration. They are not live alerts for a real farm.
      </p>
    </div>
  );
}

function WarningCard({ w }: { w: DemoWarning }) {
  return (
    <article className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-sans text-base font-semibold">{w.title}</h3>
        <Badge2 className={SEVERITY_CLS[w.severity]}>{w.severityLabel}</Badge2>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div><dt className="inline font-medium">What TinyCrops noticed: </dt><dd className="inline text-foreground/80">{w.noticed}</dd></div>
        <div><dt className="inline font-medium">Why it might matter: </dt><dd className="inline text-foreground/80">{w.why}</dd></div>
        <div><dt className="inline font-medium">What to do: </dt><dd className="inline text-foreground/80">{w.action}</dd></div>
        <div><dt className="inline font-medium">When: </dt><dd className="inline text-foreground/80">{w.timing}</dd></div>
        <div><dt className="inline font-medium">How reliable: </dt><dd className="inline text-foreground/80">{w.confidence}</dd></div>
        <div><dt className="inline font-medium">Still missing: </dt><dd className="inline text-foreground/80">{w.missing}</dd></div>
      </dl>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-primary">Why this suggestion?</summary>
        <p className="mt-2 text-foreground/80">{w.evidence}</p>
      </details>
    </article>
  );
}

function DemoPage() {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>(DEFAULT_SCENARIO);
  const s = DEMO_SCENARIO_MAP[scenarioId];

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Sprout className="h-5 w-5" /></span>
          <span className="font-display text-xl font-semibold">TinyCrops</span>
        </Link>
        <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        {/* Greeting */}
        <section className="mt-4">
          <h1 className="text-3xl font-semibold md:text-4xl">Good morning, farmer</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Wheat className="h-4 w-4" />{DEMO_FARM.name} · {DEMO_FARM.crop}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{DEMO_FARM.location}</span>
            <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" />{DEMO_FARM.sizeHa} hectares</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last illustrative satellite observation: {DEMO_FARM.lastObservation}. All weather values below are illustrative, not current weather.
          </p>
        </section>

        {/* Scenario switcher */}
        <section aria-label="Demo scenarios" className="mt-6 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {DEMO_SCENARIOS.map((sc) => (
              <Button
                key={sc.id}
                size="sm"
                variant={sc.id === scenarioId ? "default" : "outline"}
                onClick={() => setScenarioId(sc.id)}
                aria-pressed={sc.id === scenarioId}
              >
                {sc.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setScenarioId(DEFAULT_SCENARIO)}>
              <RotateCcw className="mr-1 h-4 w-4" />Reset demo
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground" role="status">{s.explanation}</p>
        </section>

        {/* Status + summary cards */}
        <section className="mt-6" aria-label="Farm status summary">
          <p className={cn("text-lg font-semibold", s.attentionCount > 0 ? "text-warning-foreground" : "text-success")}>
            {s.statusSummary}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Farm status">
              <p className="text-sm text-foreground/80">{s.statusSummary} on the illustrative demo farm.</p>
            </Panel>
            <Panel title="Weather outlook">
              <CloudSun className="mb-2 h-5 w-5 text-info" />
              <p className="text-sm text-foreground/80">{s.weatherOutlook}</p>
            </Panel>
            <Panel title="Crop observation">
              <Leaf className="mb-2 h-5 w-5 text-primary" />
              <p className="text-sm text-foreground/80">{s.cropObservation}</p>
            </Panel>
            <Panel title="Fire monitoring">
              <Flame className="mb-2 h-5 w-5 text-destructive" />
              <p className="text-sm text-foreground/80">{s.fireMonitoring}</p>
            </Panel>
          </div>
        </section>

        {/* What should I do today */}
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5" aria-labelledby="demo-today">
          <h2 id="demo-today" className="text-xl font-semibold">What should I do today?</h2>
          <ul className="mt-3 space-y-2">
            {s.today.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-foreground/85">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}
              </li>
            ))}
          </ul>
        </section>

        {/* Warning centre */}
        <section className="mt-8" aria-labelledby="demo-warnings">
          <h2 id="demo-warnings" className="text-xl font-semibold">Warning centre</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulated examples. Each card says what was noticed, what to do, and how reliable the indication is.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {s.warnings.map((w) => <WarningCard key={w.id} w={w} />)}
          </div>
        </section>

        {/* How TinyCrops works */}
        <section className="mt-10" aria-labelledby="demo-how">
          <h2 id="demo-how" className="text-xl font-semibold">How TinyCrops works</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Satellite, t: "1. Gather", d: "Weather forecasts and satellite observations are collected for the farm's fields." },
              { icon: Search, t: "2. Interpret", d: "Observations are compared over time and checked for data quality — cloudy or unreliable data is flagged, not trusted." },
              { icon: Lightbulb, t: "3. Recommend", d: "The farmer gets practical next steps, with the uncertainty explained in plain language." },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-lg border bg-card p-5">
                <I className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-sans text-base font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* From data to decisions */}
        <section className="mt-10" aria-labelledby="demo-value">
          <h2 id="demo-value" className="text-xl font-semibold">From data to decisions</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Weather forecast → prepare for heavy rain.",
              "Repeated satellite vegetation observations → notice a possible change.",
              "Cloud-quality check → avoid trusting an unreliable observation.",
              "Thermal fire detection → prompt the farmer to verify with official information.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-lg border bg-card p-4 text-sm text-foreground/85">
                <CloudRainWind className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Satellite observations cannot independently establish every cause of crop stress. TinyCrops points the farmer where to look — the field inspection makes the decision.
          </p>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <p className="text-xs text-muted-foreground">Simulated demo — no real farm, account, or live data is involved.</p>
          <Button asChild><Link to="/auth">Try TinyCrops on your farm</Link></Button>
        </footer>
      </main>
    </div>
  );
}
