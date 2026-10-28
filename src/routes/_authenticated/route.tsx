import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { FarmProvider } from "@/lib/farm-context";
import { ViewModeProvider } from "@/lib/view-mode-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: () => (
    <ViewModeProvider><FarmProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </FarmProvider></ViewModeProvider>
  ),
});
