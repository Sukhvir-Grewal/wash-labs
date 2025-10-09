// pages/index.js
import { useEffect } from "react";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Head from "next/head";
import SEOJsonLd from "@/components/SEOJsonLd";


export default function Home() {
    useEffect(() => {
        if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    return (
        <div className="min-h-screen bg-transparent text-white relative">

            {/* ✅ Local Business JSON-LD */}
            <SEOJsonLd />

            {/* ✅ SEO Tags */}
            <Head>
                <title>Wash Labs | Affordable Car Detailing Halifax</title>
                <meta
                    name="description"
                    content="Affordable car detailing in Halifax, Dartmouth & Bedford. Full washes from $50, interior from $100, full detail $140."
                />
                <meta
                    name="keywords"
                    content="car detailing Halifax, affordable detailing, Wash Labs, Dartmouth car wash, Bedford detailing"
                />
                <meta name="robots" content="index, follow" />

                {/* Open Graph (Facebook/LinkedIn) */}
                <meta
                    property="og:title"
                    content="Wash Labs | Affordable Car Detailing Halifax"
                />
                <meta
                    property="og:description"
                    content="Professional detailing in Halifax starting from $50."
                />
                <meta
                    property="og:image"
                    content="https://www.washlabs.ca/cover.jpg"
                />
                <meta property="og:url" content="https://www.washlabs.ca/" />
                <meta property="og:type" content="website" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:title"
                    content="Wash Labs | Affordable Car Detailing Halifax"
                />
                <meta
                    name="twitter:description"
                    content="Premium yet affordable detailing in Halifax."
                />
                <meta
                    name="twitter:image"
                    content="https://www.washlabs.ca/cover.jpg"
                />

                {/* Canonical URL */}
                <link rel="canonical" href="https://www.washlabs.ca/" />
            </Head>

            {/* Your Page Content */}
            <Navigation />
            <Hero />
            <Services />
            {/* <Gallery /> */}
            <About />
            <Contact />
            <Footer />
        </div>
    );
}
