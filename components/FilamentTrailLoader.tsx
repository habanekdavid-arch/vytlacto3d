"use client";

import dynamic from "next/dynamic";

// next/dynamic's `ssr: false` option is only valid inside a Client
// Component. Most pages in this app are Server Components, so the
// dynamic-import call itself lives here — pages just render
// <FilamentTrailLoader /> with no extra boilerplate.
const FilamentTrail = dynamic(() => import("./FilamentTrail"), {
  ssr: false,
});

export default function FilamentTrailLoader() {
  return <FilamentTrail />;
}
