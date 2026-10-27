import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { FarmMapProps } from "./FarmMap";

const FarmMap = lazy(() => import("./FarmMap"));

export function LazyMap(props: FarmMapProps) {
  const fb = <Skeleton style={{ height: props.height ?? 480 }} className="w-full" />;
  return (
    <ClientOnly fallback={fb}>
      <Suspense fallback={fb}>
        <FarmMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
