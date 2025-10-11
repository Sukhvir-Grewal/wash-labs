import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

export default function Navigation() {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const scrollTo = (id) => {
        const onHome = router.pathname === "/";
        if (id === "gallery") {
            router.push("/gallery");
            setMenuOpen(false);
            return;
        }
        if (!onHome) {
            router.push(`/#${id}`);
            setMenuOpen(false);
            return;
        }
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            setMenuOpen(false);
        }
    };

    const baseItems = ["services", "gallery", "about", "contact"];
    const items =
        router.pathname === "/gallery"
            ? baseItems.filter((i) => i !== "gallery")
            : baseItems;

    return (
        <header className="sticky top-0 z-50 bg-blue-50 border-b border-gray-200 shadow">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded"
            >
                Skip to content
            </a>
            <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
                {/* Logo (flush left) */}
                <div className="flex-1 flex items-center">
                    <button
                        onClick={() => scrollTo("hero")}
                        aria-label="Go to top"
                        className="flex items-center bg-transparent p-0"
                    >
                        {/* If you want to keep the text logo, comment out the image below and uncomment this */}
                        {/* <span className="text-2xl font-bold select-none" style={{ color: "#0076ff", fontFamily: "Poppins, sans-serif" }}>
                            Wash Labs
                        </span> */}
                        <Image
                            src="/images/logo.png"
                            alt="Wash Labs Logo"
                            width={120}
                            height={120}
                            priority
                            className="cursor-pointer bg-transparent mix-blend-normal pointer-events-none select-none"
                            style={{
                                backgroundColor: "transparent",
                                filter: "none",
                            }}
                        />
                    </button>
                </div>
                {/* Desktop Menu (flush right) */}
                <nav className="hidden md:flex items-center gap-8 font-semibold flex-1 justify-end">
                    {items.map((id) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="text-black hover:text-blue-600 transition-colors"
                        >
                            <span className="capitalize">
                                {id.charAt(0).toUpperCase() + id.slice(1)}
                            </span>
                        </button>
                    ))}
                </nav>
                {/* Mobile Hamburger (right edge) */}
                <div className="md:hidden flex-1 flex justify-end">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                        className="relative w-10 h-10"
                    >
                        {/* Hamburger bars: always visible on light bg */}
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-transform transition-colors duration-300 ease-out",
                                menuOpen
                                    ? "rotate-45 bg-blue-600"
                                    : "-translate-y-[8px] bg-black",
                            ].join(" ")}
                        />
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-all duration-300 ease-out",
                                menuOpen
                                    ? "opacity-0 bg-blue-600"
                                    : "opacity-100 bg-black",
                            ].join(" ")}
                        />
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-transform transition-colors duration-300 ease-out",
                                menuOpen
                                    ? "-rotate-45 bg-blue-600"
                                    : "translate-y-[8px] bg-black",
                            ].join(" ")}
                        />
                    </button>
                </div>
            </div>
            {/* Mobile Menu (smooth fade & slide, light theme) */}
            <div
                className={`md:hidden w-full overflow-hidden bg-blue-50 
                    transition-all duration-500 ease-in-out
                    ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
                `}
            >
                <nav
                    className={`px-4 py-2 transition-all duration-500 ease-in-out
                        ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
                    `}
                >
                    <ul
                        className={`flex flex-col transition-all duration-500 ease-in-out
                        ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
                    `}
                    >
                        {items.map(
                            (id) => (
                                <li
                                    key={id}
                                    className="border-b border-gray-200 last:border-b-0"
                                >
                                    <button
                                        onClick={() => scrollTo(id)}
                                        className="
                    w-full text-left py-4 text-[17px] font-semibold
                    text-black
                    hover:text-blue-600
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40
                  "
                                    >
                                        <span className="capitalize">
                                            {id.charAt(0).toUpperCase() +
                                                id.slice(1)}
                                        </span>
                                    </button>
                                </li>
                            )
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}

