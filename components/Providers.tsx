"use client";

import { SessionProvider } from "next-auth/react";
import { CartUiProvider } from "@/lib/cart-ui-context";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <CartUiProvider>{children}</CartUiProvider>
    </SessionProvider>
  );
}