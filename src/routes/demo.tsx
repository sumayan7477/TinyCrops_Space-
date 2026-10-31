import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout, CloudSun, Leaf, Flame, RotateCcw, MapPin, Ruler, Wheat, Satellite,
  Search, Lightbulb, ArrowRight, ShieldAlert, Bot, Radar, Clock, Thermometer,
  ChevronDown, CheckCircle2, AlertTriangle, CloudRain, Sun, Cloud, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge2 } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import {
  DEMO_FARM, DEMO_SCENARIOS, DEMO_SCENARIO_MAP, DEFAULT_SCENARIO,
  type DemoScenarioId, type DemoSeverity, type DemoWarning,
} from "@/lib/demo-data";
import heroImg from "@/assets/demo-hero.jpg";
import cropImg from "@/assets/demo-crop-health.jpg";
import climateImg from "@/assets/demo-climate.jpg";
import inspectImg from "@/assets/demo-inspect.jpg";
import actionImg from "@/assets/demo-action.jpg";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "TinyCrops Demo — Know Your Fields. Act at the Right Time." },
      { name: "description", content: "Interactive TinyCrops demo farm with illustrative data: crop health, climate risk, field-check alerts and daily action guidance. No login needed." },
      { property: "og:title", content: "TinyCrops Demo — Know Your Fields. Act at the Right Time." },
      { property: "og:description", content: "From satellite data to smarter farming decisions. Explore the illustrative TinyCrops demo farm." },
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

const SCENARIO_ICON: Record<DemoScenarioId, typeof Sun> = {
  normal: Sun, dry: Thermometer, rain: CloudRain, stress: Leaf, cloudy: Cloud, fire: Flame,
};

function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-warning/40 bg-warning/90 px-4 py-1.5 text-center backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-widest text-warning-foreground">
        Demo mode · Illustrative farm data
      </p>
      <p className="mx-auto max-w-2xl text-[11px] leading-tight text-warning-foreground/80">
        Everything on this page is simulated. No live alerts, no real farm.
      </p>
    </div>
  );
}

type Feature = {
  icon: typeof Leaf; heading: string; question: string; desc: string; img: string; alt: string;
  scenario: DemoScenarioId; tag?: string;
};

const FEATURES: Feature[] = [
  { icon: Leaf, heading: "Smart Crop Health Monitoring", question: "Is my crop showing signs of stress?", desc: "Track vegetation changes and spot fields that may need attention.", img: cropImg, alt: "Stylised satellite vegetation map of field parcels", scenario: "cloudy" },
  { icon: CloudSun, heading: "Climate Risk Intelligence", question: "What weather risks are approaching?", desc: "Understand rainfall, temperature changes, and conditions that may affect fieldwork.", img: climateImg, alt: "Rain clouds and sunlight over green wheat fields", scenario: "rain" },
  { icon: ShieldAlert, heading: "Early Stress & Pest Risk Alerts", question: "Where should I inspect more closely?", desc: "Highlight unusual crop changes and areas worth checking.", img: inspectImg, alt: "Farmer's hand inspecting wheat leaves", scenario: "stress", tag: "Indicators to inspect — not a diagnosis" },
  { icon: Bot, heading: "AI-Powered Action Guidance", question: "What should I do next?", desc: "Turn complex information into simple, prioritised next steps.", img: actionImg, alt: "Farmer checking a phone at the edge of a wheat field", scenario: "dry", tag: "Rule-based in this demo" },
];

const STEPS = [
  { icon: Satellite, t: "Observe", d: "Satellite and weather data" },
  { icon: Radar, t: "Detect", d: "Unusual changes and possible risks" },
  { icon: Search, t: "Understand", d: "What it may mean, and how reliable it is" },
  { icon: Lightbulb, t: "Act", d: "Practical next steps for the farmer" },
];

const QUESTIONS = [
  { icon: MapPin, q: "Where is the risk developing?", label: "Risk location", status: "Parcel level in the app", available: true },
  { icon: Clock, q: "When is a safer time to work?", label: "Safe work windows", status: "Forecast-based suggestions in the app", available: true },
  { icon: Thermometer, q: "Has the weather changed suddenly?", label: "Climate changes", status: "Planned", available: false },
];

function FeatureCard({ f, onTry }: { f: Feature; onTry: () => void }) {
  const I = f.icon;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden sm:h-56">
        <img src={f.img} alt={f.alt} loading="lazy" width={1200} height={800} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/80 via-sidebar/10 to-transparent" />
        <span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl bg-card/95 text-primary shadow-md">
          <I className="h-6 w-6" />
        </span>
        {f.tag && (
          <span className="absolute right-4 top-5 rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold text-warning-foreground shadow">
            {f.tag}
          </span>
        )}
        <p className="absolute bottom-4 left-5 right-5 font-display text-xl italic text-sidebar-foreground md:text-2xl">
          “{f.question}”
        </p>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-sans text-lg font-extrabold uppercase leading-tight tracking-wide text-foreground md:text-xl">{f.heading}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
        <button onClick={onTry} className="mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold text-primary transition-all group-hover:gap-2">
          See an example <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function WarningCard({ w }: { w: DemoWarning }) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-sans text-lg font-bold">{w.title}</h3>
        <Badge2 className={SEVERITY_CLS[w.severity]}>{w.severityLabel}</Badge2>
      </div>
      <p className="mt-2 text-sm text-foreground/80">{w.noticed}</p>
      <div className="mt-4 rounded-xl bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">What to do</p>
        <p className="mt-1 text-sm font-medium text-foreground">{w.action}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{w.timing}</p>
      </div>
      <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />{w.confidence}
      </p>
      <details className="group/d mt-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-primary">
          Why this warning? <ChevronDown className="h-4 w-4 transition-transform group-open/d:rotate-180" />
        </summary>
        <dl className="mt-2 space-y-2 text-foreground/80">
          <div><dt className="font-medium text-foreground">Why it might matter</dt><dd>{w.why}</dd></div>
          <div><dt className="font-medium text-foreground">Still missing</dt><dd>{w.missing}</dd></div>
          <div><dt className="font-medium text-foreground">How TinyCrops decided</dt><dd>{w.evidence}</dd></div>
        </dl>
      </details>
    </article>
  );
}

function DemoPage() {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>(DEFAULT_SCENARIO);
  const s = DEMO_SCENARIO_MAP[scenarioId];
  const centreRef = useRef<HTMLElement>(null);
  const tryScenario = (id: DemoScenarioId) => {
    setScenarioId(id);
    centreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const status = [
    { icon: CloudSun, label: "Weather", text: s.weatherOutlook, cls: "text-info" },
    { icon: Leaf, label: "Crop", text: s.cropObservation, cls: "text-primary" },
    { icon: Flame, label: "Fire", text: s.fireMonitoring, cls: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <img src={heroImg} alt="Aerial view of wheat fields beside a Finnish lake" width={1920} height={1088} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sidebar/70 via-sidebar/55 to-sidebar/90" />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-sidebar-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Sprout className="h-5 w-5" /></span>
            <span className="font-display text-xl font-semibold">TinyCrops</span>
          </Link>
          <Button asChild variant="secondary" size="sm"><Link to="/auth">Sign in</Link></Button>
        </header>
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-6 md:pb-28 md:pt-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-3 py-1 text-xs font-bold uppercase tracking-widest text-warning-foreground shadow-lg">
            <Sparkles className="h-3.5 w-3.5" />Demo mode · Illustrative data
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] text-sidebar-foreground sm:text-5xl md:text-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            Know Your Fields.<br /><span className="text-sidebar-primary">Act at the Right Time.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sidebar-foreground/85 md:text-xl">From satellite data to smarter farming decisions.</p>
          <div className="mt-8 inline-flex flex-col gap-1 rounded-2xl border border-sidebar-border/60 bg-sidebar/60 px-5 py-4 backdrop-blur">
            <p className="font-display text-lg font-semibold text-sidebar-foreground">{DEMO_FARM.name}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-sidebar-foreground/80">
              <span className="inline-flex items-center gap-1"><Wheat className="h-4 w-4" />{DEMO_FARM.crop}</span>·
              <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" />{DEMO_FARM.sizeHa} hectares</span>·
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />Lappeenranta</span>
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* FEATURES */}
        <section aria-labelledby="features" className="-mt-10 md:-mt-14">
          <h2 id="features" className="sr-only">What TinyCrops helps with</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((f) => <FeatureCard key={f.heading} f={f} onTry={() => tryScenario(f.scenario)} />)}
          </div>
        </section>

        {/* PROCESS */}
        <section aria-labelledby="process" className="mt-20">
          <h2 id="process" className="text-center text-3xl font-semibold md:text-4xl">From Satellite Data to a Daily Action Card</h2>
          <ol className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div aria-hidden className="absolute left-[12%] right-[12%] top-8 hidden h-0.5 bg-gradient-to-r from-primary/20 via-primary to-warning lg:block" />
            {STEPS.map(({ icon: I, t, d }, i) => (
              <li key={t} className="relative flex flex-col items-center text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-background">
                  <I className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-warning text-xs font-bold text-warning-foreground">{i + 1}</span>
                </span>
                <h3 className="mt-4 font-sans text-xl font-extrabold uppercase tracking-wide">{t}</h3>
                <p className="mt-1 max-w-[14rem] text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* WARNING CENTRE */}
        <section ref={centreRef} aria-labelledby="demo-warnings" className="mt-20 scroll-mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Interactive</p>
              <h2 id="demo-warnings" className="text-3xl font-semibold md:text-4xl">Warning centre</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setScenarioId(DEFAULT_SCENARIO)}>
              <RotateCcw className="mr-1 h-4 w-4" />Reset demo
            </Button>
          </div>

          <div role="group" aria-label="Demo scenarios" className="mt-5 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            {DEMO_SCENARIOS.map((sc) => {
              const I = SCENARIO_ICON[sc.id];
              const active = sc.id === scenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => setScenarioId(sc.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    active ? "border-primary bg-primary text-primary-foreground shadow-md" : "bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                  )}
                >
                  <I className="h-4 w-4" />{sc.label}
                </button>
              );
            })}
          </div>

          {/* Daily action card */}
          <div key={s.id} className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-md animate-in fade-in duration-300">
            <div className={cn("flex items-center gap-3 px-6 py-4", s.attentionCount > 0 ? "bg-warning/15" : "bg-success/10")}>
              {s.attentionCount > 0 ? <AlertTriangle className="h-6 w-6 text-warning-foreground" /> : <CheckCircle2 className="h-6 w-6 text-success" />}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's action card · illustrative</p>
                <p className={cn("text-lg font-bold", s.attentionCount > 0 ? "text-warning-foreground" : "text-success")} role="status">{s.statusSummary}</p>
              </div>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr]">
              <div>
                <h3 className="font-sans text-base font-bold">What should I do today?</h3>
                <ul className="mt-3 space-y-2">
                  {s.today.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-foreground/90">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">{s.explanation}</p>
              </div>
              <ul className="space-y-3">
                {status.map(({ icon: I, label, text, cls }) => (
                  <li key={label} className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                    <I className={cn("mt-0.5 h-5 w-5 shrink-0", cls)} />
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-sm text-foreground/85">{text}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div key={`w-${s.id}`} className="mt-6 grid gap-5 lg:grid-cols-2">
            {s.warnings.map((w) => <WarningCard key={w.id} w={w} />)}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Last illustrative satellite observation: {DEMO_FARM.lastObservation}. Satellite data points where to look — the field visit makes the decision.
          </p>
        </section>

        {/* MORE QUESTIONS */}
        <section aria-labelledby="more-q" className="mt-20">
          <h2 id="more-q" className="text-center text-2xl font-semibold md:text-3xl">More questions farmers ask</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {QUESTIONS.map(({ icon: I, q, label, status, available }) => (
              <li key={label} className="flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground"><I className="h-6 w-6" /></span>
                <p className="mt-3 font-sans text-sm font-extrabold uppercase tracking-wide">{label}</p>
                <p className="mt-1 font-display text-base italic text-foreground/80">“{q}”</p>
                <span className={cn("mt-3 rounded-full border px-2.5 py-0.5 text-xs font-medium", available ? "border-success/30 bg-success/10 text-success" : "border-warning/40 bg-warning/15 text-warning-foreground")}>
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="my-16 flex flex-col items-center gap-4 rounded-2xl bg-sidebar px-6 py-10 text-center">
          <p className="font-display text-2xl font-semibold text-sidebar-foreground md:text-3xl">Ready to see your own fields?</p>
          <Button asChild size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Link to="/auth">Try TinyCrops on your farm</Link>
          </Button>
          <p className="text-xs text-sidebar-foreground/70">Simulated demo — no real farm, account, or live data is involved.</p>
        </footer>
      </main>
    </div>
  );
}
