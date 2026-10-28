import { createFileRoute, Link } from "@tanstack/react-router";
import { Sprout, ScanSearch, Droplets, ThermometerSun, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-fields.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TinyCrops — Farm intelligence for daily field decisions" },
      { name: "description", content: "TinyCrops turns satellite, weather and wildfire data into clear daily actions for small and medium farms." },
      { property: "og:title", content: "TinyCrops — Farm intelligence" },
      { property: "og:description", content: "Know which field needs attention today, why, and what to do next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanSearch, t: "Find the problem zone", d: "Spot unusual vegetation patterns inside a field — with the evidence shown." },
  { icon: Droplets, t: "Check before you water", d: "Rainfall and vegetation signals tell you where to inspect irrigation first." },
  { icon: ThermometerSun, t: "Plan safer work hours", d: "Heat-stress estimates and suggested work windows for your crew." },
  { icon: Flame, t: "Wildfire awareness", d: "Regional fire information from official sources, clearly labelled." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Sprout className="h-5 w-5" /></span>
          <span className="font-display text-xl font-semibold">TinyCrops</span>
        </div>
        <Button asChild><Link to="/dashboard">Open dashboard</Link></Button>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Farm intelligence</p>
          <h1 className="mt-3 text-5xl font-semibold leading-tight md:text-6xl">Which field needs you today?</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            TinyCrops turns satellite, weather and wildfire data into a short list of what to inspect, where, and why — without pretending to know more than the data shows.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/demo">Explore Demo Farm</Link></Button>
            <Button asChild size="lg" variant="ghost"><Link to="/dashboard">Sign in</Link></Button>
          </div>
        </div>
        <img src={heroImg} alt="Aerial view of farm parcels at golden hour" width={1280} height={960} className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg" />
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: I, t, d }) => (
          <div key={t} className="rounded-lg border bg-card p-5">
            <I className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-sans text-base font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
