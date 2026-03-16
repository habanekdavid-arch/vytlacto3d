import "./globals.css";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export const metadata = {
  metadataBase: new URL(baseUrl),

  title: {
    default: "VytlačTo3D – Online konfigurátor 3D tlače",
    template: "%s | VytlačTo3D",
  },

  description:
    "Nahrajte STL model, vyberte materiál, kvalitu a parametre tlače. Okamžite vypočítame cenu a doručíme hotový 3D výtlačok priamo k vám.",

  keywords: [
    "3D tlač",
    "3D tlač online",
    "3D tlač kalkulátor",
    "STL tlač",
    "3D printing Slovakia",
    "3D model tlač",
  ],

  openGraph: {
    title: "VytlačTo3D – Online konfigurátor 3D tlače",
    description:
      "Nahraj STL model, nastav parametre a okamžite zisti cenu 3D tlače.",
    url: baseUrl,
    siteName: "VytlačTo3D",
    locale: "sk_SK",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "VytlačTo3D – Online konfigurátor 3D tlače",
    description:
      "Nahraj STL model a okamžite zisti cenu 3D tlače.",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="min-h-screen flex flex-col bg-white text-neutral-900 antialiased">
        <div className="flex-1">{children}</div>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}