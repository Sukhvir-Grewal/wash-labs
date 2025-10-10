// components/SEOJsonLd.js
import Head from "next/head";

export default function SEOJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDetailing",
    name: "Wash Labs",
    image: "https://www.washlabs.ca/cover.jpg",
    "@id": "https://www.washlabs.ca/",
    url: "https://www.washlabs.ca/",
    telephone: "+1-782-827-5010",
    priceRange: "CA$50 - CA$140",
    address: {
      "@type": "PostalAddress",
      streetAddress: "53 Vitalia Ct",
      addressLocality: "Halifax",
      addressRegion: "NS",
      postalCode: "B3S 0H4",
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "44.6488",
      longitude: "-63.5752",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/profile.php?id=61581204412596",
      "https://www.instagram.com/wash_labs/",
      "https://www.tiktok.com/@wash__labs?is_from_webapp=1&sender_device=pc",
    ],
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}
