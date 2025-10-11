// components/SEOJsonLd.js
import Head from "next/head";

export default function SEOJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CarWash",
    name: "Wash Labs",
    url: "https://washlabs.ca/",
    "@id": "https://washlabs.ca/#carwash",
    image: "https://washlabs.ca/images/hero/car-detailing.jpg",
    logo: "https://washlabs.ca/images/logo.png",
    telephone: "+1-782-827-5010",
    email: "washlabs.ca@gmail.com",
    priceRange: "$$",
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
      latitude: 44.6488,
      longitude: -63.5752,
    },
    areaServed: [
      "Halifax",
      "Dartmouth",
      "Bedford",
      "Sackville",
      "Clayton Park",
      "Cole Harbour",
      "Hammonds Plains",
    ],
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
          "Sunday",
        ],
        opens: "07:00",
        closes: "19:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/people/Wash-Labs/61581335875166/",
      "https://www.instagram.com/wash_labs",
      "https://www.tiktok.com/@wash__labs",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Car Detailing Services",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Premium Exterior Wash",
          itemOffered: {
            "@type": "Service",
            name: "Premium Exterior Wash",
            description:
              "Foam bath, hand wash, wheels and tires, tire shine, spot-free dry.",
            areaServed: "Halifax Regional Municipality",
            hoursAvailable: "Mo-Su 07:00-19:00",
            serviceType: "Exterior car wash",
            provider: { "@id": "https://washlabs.ca/#carwash" },
          },
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "CAD",
            price: "50",
          },
        },
        {
          "@type": "Offer",
          name: "Complete Interior Detail",
          itemOffered: {
            "@type": "Service",
            name: "Complete Interior Detail",
            description:
              "Full vacuum, wipe down, steam cleaning, carpet extraction, glass.",
            areaServed: "Halifax Regional Municipality",
            hoursAvailable: "Mo-Su 07:00-19:00",
            serviceType: "Interior detailing",
            provider: { "@id": "https://washlabs.ca/#carwash" },
          },
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "CAD",
            price: "100",
          },
        },
        {
          "@type": "Offer",
          name: "Full Detail (Interior + Exterior)",
          itemOffered: {
            "@type": "Service",
            name: "Full Detail (Interior + Exterior)",
            description:
              "Complete interior detail plus exterior wash and shine.",
            areaServed: "Halifax Regional Municipality",
            hoursAvailable: "Mo-Su 07:00-19:00",
            serviceType: "Full detail",
            provider: { "@id": "https://washlabs.ca/#carwash" },
          },
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "CAD",
            price: "140",
          },
        },
      ],
    },
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
