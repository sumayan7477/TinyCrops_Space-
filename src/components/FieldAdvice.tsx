import { AlertTriangle, Leaf, Info } from "lucide-react";
import { useParcels, useObservations, type Parcel, type Observation } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";
import { parcelAdvice } from "@/lib/ndvi-trend";
import { Badge2, LoadingBlock, ErrorState } from "@/components/ui-kit";

export function FieldAdvice({ parcel, observations }: { parcel: Parcel; observations: Observation[] }) {
  const a = parcelAdvice(observations, { boundary: !!parcel.boundary, crop: parcel.crop_type, stage: parcel.growth_stage });
  const Icon = a.needsInspection ? AlertTriangle : a.limited ? Info : Leaf;
  return <article className="rounded-lg border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="flex items-center gap-2 font-sans text-base font-semibold"><Icon className="h-5 w-5 shrink-0 text-primary" />{parcel.name}</h3>
      <Badge2 className={a.needsInspection ? "border-warning/40 bg-warning/20 text-warning-foreground" : "border-border bg-muted text-muted-foreground"}>{a.needsInspection ? "Check this field" : a.limited ? "Limited information" : "No urgent change"}</Badge2>
    </div>
    <p className="mt-3 font-medium">{a.summary}</p>
    <p className="mt-2 text-sm"><strong>Suggested action: </strong>{a.action}</p>
    <p className="mt-3 text-xs text-muted-foreground">Latest image: {a.latestDate ?? "none saved"}{a.clearDate && ` · last clear image: ${a.clearDate}`}</p>
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-primary">Why this advice?</summary>
      <div className="mt-2 space-y-2 text-foreground/80">
        <p><strong>Image evidence: </strong>{a.analysis.reliableCount} usable readings. {a.analysis.compared ? `Compared images from ${a.analysis.compared.from} to ${a.analysis.compared.to}.` : "The available images cannot support a reliable comparison."}</p>
        <p><strong>Rule-based suggestion, not a diagnosis. </strong>We compare this field with its own earlier images. Images do not establish a disease, pest, nutrient deficiency or soil moisture.</p>
        {a.analysis.cloudRisk && <p>Some images have clouds or uncertain quality and are left out of the comparison.</p>}
        {a.analysis.largestGapDays > 20 && <p>There is a long gap between clear images; changes during that gap are unknown.</p>}
        {a.stale && <p>Older images cannot tell us what is happening today.</p>}
        {a.approximate && <p>The readings cover an approximate area and may include other land. {parcel.boundary ? "An outline is saved, but these readings did not use it; the outline must be checked before obtaining field-specific readings." : "No field outline is saved."}</p>}
        {a.missingCropDetails && <p>Crop type or growth stage is missing, so we cannot say whether a change is expected for this crop.</p>}
      </div>
    </details>
  </article>;
}

export function FarmFieldAdvice() {
  const { farm } = useFarm();
  const p = useParcels(), o = useObservations();
  if (p.isLoading || o.isLoading) return <LoadingBlock />;
  if (p.error || o.error) return <ErrorState message="Field images could not be loaded. No field-change advice is available." />;
  const parcels = (p.data ?? []).filter((parcel) => parcel.farm_id === farm?.id);
  if (!parcels.length) return <p className="text-sm text-muted-foreground">No fields saved on this farm yet.</p>;
  return <div className="grid gap-4 xl:grid-cols-2">{parcels.map((parcel) => <FieldAdvice key={parcel.id} parcel={parcel} observations={(o.data ?? []).filter((ob) => ob.parcel_id === parcel.id && ob.indicator === "NDVI")} />)}</div>;
}