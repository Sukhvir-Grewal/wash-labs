// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import { DefaultSeo } from "next-seo";
import SEO from "../next-seo.config";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: "ease-out-cubic" });
    const handle = () => {
      try {
        AOS.refreshHard();
      } catch {}
    };
    window.addEventListener("load", handle);
    router.events.on("routeChangeComplete", handle);
    return () => {
      window.removeEventListener("load", handle);
      router.events.off("routeChangeComplete", handle);
    };
  }, [router.events]);

  const measurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_ID ||
    "G-HP96DXQWLF";

  return (
    <>
      {/* ✅ Global SEO config */}
      <DefaultSeo {...SEO} />

      {/* ✅ Google Analytics */}
      {measurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      ) : null}

      {/* Page content */}
      <Component {...pageProps} />

      {/* ✅ Vercel Analytics */}
      <Analytics />
    </>
  );
}
