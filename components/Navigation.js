import { useState } from "react";
import Image from "next/image";

export default function Navigation() {
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            setMenuOpen(false);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-[var(--color-bg-dark)] border-b border-[var(--color-border)] shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                {/* Logo (transparent stays transparent) */}
                <button
                    onClick={() => scrollTo("hero")}
                    aria-label="Go to top"
                    className="flex items-center bg-transparent p-0"
                >
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

                {/* Desktop Menu */}
                <nav className="hidden md:flex items-center gap-8 font-semibold">
                    {["services", "gallery", "about", "contact"].map((id) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="text-[var(--color-text-main)] hover:text-[var(--color-primary)] transition-colors"
                        >
                            <span className="capitalize">
                                {id.charAt(0).toUpperCase() + id.slice(1)}
                            </span>
                        </button>
                    ))}
                </nav>

                {/* Mobile Hamburger (bars perfectly parallel; crisp X) */}
                <div className="md:hidden">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                        className="relative w-10 h-10"
                    >
                        {/* Base geometry: all bars share same center; closed => offset by ±8px */}
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-transform transition-colors duration-300 ease-out",
                                menuOpen
                                    ? "rotate-45 bg-[var(--color-primary)]"
                                    : "-translate-y-[8px] bg-white",
                            ].join(" ")}
                        />
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-all duration-300 ease-out",
                                menuOpen
                                    ? "opacity-0 bg-[var(--color-primary)]"
                                    : "opacity-100 bg-white",
                            ].join(" ")}
                        />
                        <span
                            className={[
                                "absolute left-1/2 top-1/2 -translate-x-1/2 rounded",
                                "w-7 h-[3px] transition-transform transition-colors duration-300 ease-out",
                                menuOpen
                                    ? "-rotate-45 bg-[var(--color-primary)]"
                                    : "translate-y-[8px] bg-white",
                            ].join(" ")}
                        />
                    </button>
                </div>
            </div>

            {/* Mobile Menu (solid background for contrast; darker link color) */}
            <div
                className={`md:hidden w-full overflow-hidden transition-[max-height] duration-300 bg-[var(--color-bg-dark)] ${
                    menuOpen ? "max-h-96" : "max-h-0"
                }`}
            >
                <nav className="px-4 py-2">
                    <ul className="flex flex-col">
                        {["services", "gallery", "about", "contact"].map(
                            (id) => (
                                <li
                                    key={id}
                                    className="border-b border-[var(--color-border)] last:border-b-0"
                                >
                                    <button
                                        onClick={() => scrollTo(id)}
                                        className="
                    w-full text-left py-4 text-[17px] font-semibold
                    text-white /* high contrast */
                    hover:text-[var(--color-primary)]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40
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

                        {/* Example CTA (optional) */}
                        {/* <li className="pt-2">
              <a href="#contact" className="btn btn-primary w-full">Book Now</a>
            </li> */}
                    </ul>
                </nav>
            </div>
        </header>
    );
}
