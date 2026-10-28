import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geometria modelov z výkresov (lib/drawing-csg) — WASM sa načíta zo súboru.
  serverExternalPackages: ["manifold-3d"],
  outputFileTracingIncludes: {
    "/api/drawing-to-model": ["./node_modules/manifold-3d/manifold.wasm"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      // Obrázky príspevkov a profilovka z Instagram API
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
  async redirects() {
    return [
      // Článok o cene 3D tlače dostal v CMS kratšiu adresu — staré odkazy
      // (zdieľané, z Google) vedú trvalo na novú, namiesto 404.
      {
        source: "/blog/co-ovplyvnuje-cenu-3d-tlace-manipulacny-poplatok",
        destination: "/blog/co-ovplyvnuje-cenu-3d-tlace",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
