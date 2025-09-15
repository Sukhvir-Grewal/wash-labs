// pages/index.js
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import About from "@/components/About";
import Contact from "@/components/Contact";

// Use dynamic import for Gallery (disable SSR)
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white">

            <Navigation />
            <Hero />
            <Services />
            <Gallery />
            <About />
            <Contact />

        </div>
    );
}
