"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SuccessAutoRefresh({
  intervalMs = 3000,
  maxAttempts = 6,
}: {
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > maxAttempts) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs, maxAttempts]);

  return null;
}
