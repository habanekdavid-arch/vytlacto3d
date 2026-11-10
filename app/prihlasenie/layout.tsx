import type { ReactNode } from "react";

/** Prihlásenie a registrácia nepatria do výsledkov vyhľadávania. */
export const metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
