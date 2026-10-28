import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { modeKey, parseMode, type ViewMode } from "./view-mode";

const Context = createContext<{ mode: ViewMode; setMode: (mode: ViewMode) => void }>({ mode: "farmer", setMode: () => {} });

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<{ userId: string | null; mode: ViewMode }>({ userId: null, mode: "farmer" });
  useEffect(() => {
    let active = true;
    const load = (userId: string | undefined) => {
      let mode: ViewMode = "farmer";
      try { if (userId) mode = parseMode(localStorage.getItem(modeKey(userId))); } catch { /* Storage may be disabled. */ }
      if (active) setPreference({ userId: userId ?? null, mode });
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => load(session?.user.id));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const setMode = (mode: ViewMode) => {
    if (!preference.userId) return;
    try { localStorage.setItem(modeKey(preference.userId), mode); } catch { /* Keep a session-only preference. */ }
    setPreference({ ...preference, mode });
  };
  return <Context.Provider value={{ mode: preference.mode, setMode }}>{children}</Context.Provider>;
}

export const useViewMode = () => useContext(Context);