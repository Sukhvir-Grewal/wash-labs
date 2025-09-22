// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Default SEO setup for every page */}
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Theme Color (browser address bar color on mobile) */}
        <meta name="theme-color" content="#1a1a1a" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
