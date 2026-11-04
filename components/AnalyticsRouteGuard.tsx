"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, isUntrackedPath } from "@/lib/analytics";

/**
 * Pri prechode do administrácie bez obnovenia stránky vypne GA4
 * (štandardný prepínač ga-disable platí aj pre značky z GTM).
 */
export default function AnalyticsRouteGuard() {
  const pathname = usePathname();
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = isUntrackedPath(pathname ?? "");
  }, [pathname]);
  return null;
}
