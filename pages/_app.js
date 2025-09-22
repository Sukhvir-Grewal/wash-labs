// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import { DefaultSeo } from "next-seo";
import SEO from "../next-seo.config";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    AOS.init({ duration: 800, once: true }); // smooth animations
  }, []);

  return (
    <>
      {/* ✅ Global SEO config */}
      <DefaultSeo {...SEO} />

      {/* ✅ Google Analytics (replace G-XXXXXXXXXX with your Measurement ID) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-HP96DXQWLF');
        `}
      </Script>

      {/* Page content */}
      <Component {...pageProps} />

      {/* ✅ Vercel Analytics */}
      <Analytics />
    </>
  );
}
