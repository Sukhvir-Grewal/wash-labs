// pages/index.js
import { useEffect } from "react";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

// Use dynamic import for Gallery (disable SSR)
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

export default function Home() {
    useEffect(() => {
        // Remove the hash (#something) from the URL on load/refresh
        if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />
            <Hero />
            <Services />
            <Gallery />
            <About />
            <Contact />
            <Footer />
        </div>
    );
}
