// pages/index.js
import { useEffect } from "react";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Navigation from "@/components/Navigation";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SEOJsonLd from "@/components/SEOJsonLd";


export default function Home() {
    useEffect(() => {
        if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    return (
        <main className="min-h-screen bg-transparent text-white relative">
            <SEOJsonLd />
            <Navigation />
            <Hero />
            <Services />
            <About />
            <Contact />
            <Footer />
        </main>
    );
}
