import "./globals.css";
import Script from "next/script";
import { headers } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import FourFromFloatingButton from "@/components/FourFromFloatingButton";
import PromoTipPopup from "@/components/PromoTipPopup";
import PromoBar from "@/components/PromoBar";
import { activePromo } from "@/lib/promo";
import RegisterNudgePopup from "@/components/RegisterNudgePopup";
import CompleteProfilePopup from "@/components/CompleteProfilePopup";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import { dictionaryFor } from "@/lib/i18n/messages";
import { GA_MEASUREMENT_ID, GTM_ID, isAnalyticsHost } from "@/lib/analytics";
import AnalyticsRouteGuard from "@/components/AnalyticsRouteGuard";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.vytlacto3d.sk";

export async function generateMetadata() {
  const { t, locale } = await getT();
  const title = t("VytlačTo3D – Online konfigurátor 3D tlače");
  return {
    metadataBase: new URL(baseUrl),

    title: {
      default: title,
      template: "%s | VytlačTo3D",
    },
  

    description: t(
      "Nahrajte STL model, vyberte materiál, kvalitu a parametre tlače. Okamžite vypočítame cenu a doručíme hotový 3D výtlačok priamo k vám."
    ),

    keywords: [
      "3D tlač",
      "3D tlač online",
      "3D tlač kalkulátor",
      "STL tlač",
      "3D printing Slovakia",
      "3D model tlač",
    ],

    verification: {
      google: "N3KPmt1kWah9CIVFQz1gvt1MnfmYAj6oVVTTtvJ-zzs",
    },

    openGraph: {
      title,
      description: t("Nahraj STL model, nastav parametre a okamžite zisti cenu 3D tlače."),
      url: baseUrl,
      siteName: "VytlačTo3D",
      locale: { sk: "sk_SK", en: "en_GB", hu: "hu_HU", de: "de_DE" }[locale],
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description: t("Nahraj STL model a okamžite zisti cenu 3D tlače."),
    },

    robots: {
      index: true,
      follow: true,
    },

    icons: {
      icon: "/favicon.ico",
      apple: "/icon-320.png",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const promo = activePromo();
  // Meranie len na www.vytlacto3d.sk (nie na náhľadoch *.vercel.app ani lokálne).
  const analytics = isAnalyticsHost((await headers()).get("host"));

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col bg-white text-neutral-900 antialiased">
        {analytics && (
          <>
            {/* Google Tag Manager (noscript) */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
            {/* End Google Tag Manager (noscript) */}

            {/* Google Consent Mode v2 — kým návštevník nesúhlasí, Google nič neukladá.
                Súhlas zbiera CookieScript (šablóna v GTM, spúšťač Consent Initialization)
                a stav po kliknutí prepne. Musí byť pred GTM a Google Analytics.
                V administrácii (/admin) sa GA vypne a GTM ani GA sa nenačítajú. */}
            <Script id="consent-default" strategy="beforeInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted',
                wait_for_update: 500
              });
              var path = location.pathname;
              window.__noAnalytics = path === '/admin' || path.indexOf('/admin/') === 0;
              if (window.__noAnalytics) window['ga-disable-${GA_MEASUREMENT_ID}'] = true;`}
            </Script>

            {/* Google Tag Manager */}
            <Script id="google-tag-manager" strategy="beforeInteractive">
              {`if (!window.__noAnalytics) (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>
            {/* End Google Tag Manager */}

            <Script id="google-analytics" strategy="afterInteractive">
              {`if (!window.__noAnalytics) {
                var s = document.createElement('script');
                s.async = true;
                s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
                document.head.appendChild(s);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              }`}
            </Script>
            <AnalyticsRouteGuard />
          </>
        )}

        <LocaleProvider locale={locale} dict={dictionaryFor(locale)}>
        <Providers>
          {promo && <PromoBar percent={promo.percent} endsAt={promo.endsAt} theme={promo.theme} />}
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FourFromFloatingButton />
          <PromoTipPopup />
          <RegisterNudgePopup />
          <CompleteProfilePopup />
        </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}