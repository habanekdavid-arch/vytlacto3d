"use client";

import { useEffect } from "react";
import { HOVER_FX_ENABLED } from "@/lib/fx";
import { startHoverFx } from "@/lib/hover-fx";

export default function HoverFx() {
  useEffect(() => (HOVER_FX_ENABLED ? startHoverFx() : undefined), []);
  return null;
}
