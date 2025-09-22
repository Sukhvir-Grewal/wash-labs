// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import { DefaultSeo } from "next-seo";
import SEO from "../next-seo.config";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    AOS.init({ duration: 800, once: true }); // smooth animations
  }, []);

  return (
    <>
      {/* ✅ Global SEO config */}
      <DefaultSeo {...SEO} />

      {/* Page content */}
      <Component {...pageProps} />
    </>
  );
}
