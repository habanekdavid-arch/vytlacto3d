"use client";

import { useEffect } from "react";
import { CART_STORAGE_KEY } from "@/lib/cart-storage";

export default function ClearCartStorage() {
  useEffect(() => {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore unavailable localStorage
    }
  }, []);

  return null;
}
