import { Sprout, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/lib/view-mode-context";

export function ModeSwitch() {
  const { mode, setMode } = useViewMode();
  return <div role="group" aria-label="Viewing mode" className="flex shrink-0 gap-1 rounded-md border bg-background p-1">
    <Button size="sm" variant={mode === "farmer" ? "default" : "ghost"} onClick={() => setMode("farmer")} aria-pressed={mode === "farmer"} className="gap-1.5 px-2"><Sprout className="h-4 w-4" />Farmer</Button>
    <Button size="sm" variant={mode === "inspector" ? "default" : "ghost"} onClick={() => setMode("inspector")} aria-pressed={mode === "inspector"} className="gap-1.5 px-2"><ScanSearch className="h-4 w-4" />Inspector</Button>
  </div>;
}