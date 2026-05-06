import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const KEY = "intellix.onboarding.complete";

export function useOnboarding() {
  const { user } = useAuth();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    if (!user) {
      setIsFirstTime(null);
      return;
    }
    if (localStorage.getItem(KEY) === "true") {
      setIsFirstTime(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [okrs, leads, ws] = await Promise.all([
        supabase.from("okrs").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("workspaces").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      const total = (okrs.count ?? 0) + (leads.count ?? 0) + (ws.count ?? 0);
      setIsFirstTime(total === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function completeOnboarding() {
    localStorage.setItem(KEY, "true");
    setIsFirstTime(false);
  }

  return { isFirstTime, currentStep, setCurrentStep, completeOnboarding };
}
