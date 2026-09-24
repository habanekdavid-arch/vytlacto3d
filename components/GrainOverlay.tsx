"use client";

import { useEffect } from "react";
import { startGrain } from "@/lib/ambient";

export default function GrainOverlay() {
  useEffect(() => startGrain(), []);
  return null;
}
