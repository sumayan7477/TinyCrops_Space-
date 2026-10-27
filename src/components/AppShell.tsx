import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Map, Tractor, Leaf, ScanSearch, History, Droplets, CloudSun, ThermometerSun,
  Flame, Lightbulb, ListChecks, MessageSquare, Bell, Settings, Menu, LogOut, Sprout, Clock,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-context";
import { useNotifications, useProfile } from "@/lib/data";

export const NAV = [
  { to: "/dashboard", label: "Daily Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Farm Map", icon: Map },
  { to: "/farms", label: "My Farms & Parcels", icon: Tractor },
  { to: "/crop-health", label: "Crop Health", icon: Leaf },
  { to: "/stress-detection", label: "Sub-Parcel Stress", icon: ScanSearch },
  { to: "/timeline", label: "Problem Timeline", icon: History },
  { to: "/irrigation", label: "Irrigation Alerts", icon: Droplets },
  { to: "/weather", label: "Weather & Heat", icon: CloudSun },
  { to: "/heat-safety", label: "Heat Safety", icon: ThermometerSun },
  { to: "/work-windows", label: "Safe Work Windows", icon: Clock },
  { to: "/wildfire", label: "Wildfire Risk", icon: Flame },
  { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/tasks", label: "Farm Tasks", icon: ListChecks },
  { to: "/assistant", label: "AI Farm Assistant", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Data Sources & Settings", icon: Settings },
] as const;

function NavList({ onNav }: { onNav?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNav}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-medium" }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 px-6 py-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Sprout className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold text-sidebar-accent-foreground">TinyCrops</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { farms, farm, setFarmId, date, setDate } = useFarm();
  const { data: notes = [] } = useNotifications();
  const { data: profile } = useProfile();
  const unread = notes.filter((n) => !n.read).length;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sidebar pb-6 lg:flex">
        <Brand />
        <NavList />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[500] flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavList onNav={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          {farms.length > 0 ? (
            <Select value={farm?.id} onValueChange={setFarmId}>
              <SelectTrigger className="w-44 md:w-56" aria-label="Select farm">
                <SelectValue placeholder="Select farm" />
              </SelectTrigger>
              <SelectContent className="z-[600]">
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button asChild variant="outline" size="sm"><Link to="/farms">Add a farm</Link></Button>
          )}
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="hidden w-40 md:block" aria-label="Selected date" />
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative">
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread}</span>
                )}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" aria-label="User menu">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[600]">
                <DropdownMenuLabel>{profile?.display_name ?? "Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
