import { Satellite } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-kit";

export function SatellitePending({ what }: { what: string }) {
  return (
    <EmptyState
      icon={<Satellite className="h-8 w-8" />}
      title="No satellite observations yet"
      body={`${what} needs Sentinel-2 observations from the Copernicus Data Space Ecosystem. That connection isn't set up, so nothing is shown rather than made-up values.`}
      action={<Button asChild variant="outline"><Link to="/settings">View data source status</Link></Button>}
    />
  );
}
