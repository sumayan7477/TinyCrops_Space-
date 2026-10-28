import type { ReactNode } from "react";
import { AlertTriangle, Database, Info, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFarm } from "@/lib/farm-context";
import { useViewMode } from "@/lib/view-mode-context";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border bg-card p-5", className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <div className="mb-3 text-muted-foreground">{icon ?? <Database className="h-8 w-8" />}</div>
      <h3 className="font-sans text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Data could not be loaded</p>
        <p className="text-muted-foreground">{message}. Nothing has been substituted — try again shortly.</p>
      </div>
    </div>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-md border p-3 text-xs", tone === "info" ? "border-info/25 bg-info/5" : "border-warning/40 bg-warning/10")}>
      <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone === "info" ? "text-info" : "text-warning-foreground")} />
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}

export function Freshness({ source, at }: { source: string; at: string }) {
  const { mode } = useViewMode();
  return (
    <p className="text-xs text-muted-foreground">
      {mode === "inspector" ? `Source: ${source} · retrieved` : "Last updated:"} {new Date(at).toLocaleString()}
    </p>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

export function Badge2({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

export const PRIORITY_CLS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/10 text-info border-info/30",
  high: "bg-warning/20 text-warning-foreground border-warning/40",
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
};

/** Renders children only when a farm exists; otherwise prompts to add one. */
export function NeedsFarm({ children }: { children: ReactNode }) {
  const { farm, loading } = useFarm();
  if (loading) return <LoadingBlock />;
  if (!farm)
    return (
      <EmptyState
        title="Add your first farm"
        body="TinyCrops needs a farm location to fetch weather and build recommendations."
        action={
          <Button asChild>
            <Link to="/farms">Add a farm</Link>
          </Button>
        }
      />
    );
  return <>{children}</>;
}

export const RISK_CLS: Record<"lower" | "caution" | "high" | "very_high" | "extreme", string> = {
  lower: "bg-success/15 text-success border-success/30",
  caution: "bg-info/10 text-info border-info/30",
  high: "bg-warning/20 text-warning-foreground border-warning/40",
  very_high: "bg-destructive/10 text-destructive border-destructive/30",
  extreme: "bg-destructive text-destructive-foreground border-destructive",
};
