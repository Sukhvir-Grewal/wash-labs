import { useState } from "react";

export default function Navigation() {
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            setMenuOpen(false); // close menu after click
        }
    };

    return (
        <header className="bg-black/90 sticky top-0 z-50 shadow-md">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                {/* Logo */}
                <button
                    onClick={() => scrollTo("hero")}
                    className="flex items-center"
                >
                    <img
                        src="/images/logo.png"
                        alt="Wash Labs Logo"
                        className="w-[120px] h-[120px] cursor-pointer"
                    />
                </button>

                {/* Desktop Menu */}
                <nav className="hidden md:flex space-x-8 text-white font-semibold">
                    {["services", "gallery", "about", "contact"].map((id) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="hover:text-orange-500 transition"
                        >
                            {id.charAt(0).toUpperCase() + id.slice(1)}
                        </button>
                    ))}
                </nav>

                {/* Mobile Hamburger */}
                <div className="md:hidden">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="relative w-8 h-8 flex flex-col justify-between items-center focus:outline-none"
                    >
                        <span
                            className={`absolute w-8 h-0.5 transition-transform duration-300 ease-in-out ${
                                menuOpen
                                    ? "bg-orange-500 rotate-45 top-3.5"
                                    : "bg-white top-0"
                            }`}
                        ></span>
                        <span
                            className={`absolute w-8 h-0.5 transition-opacity duration-300 ease-in-out ${
                                menuOpen ? "opacity-0" : "bg-white top-3.5"
                            }`}
                        ></span>
                        <span
                            className={`absolute w-8 h-0.5 transition-transform duration-300 ease-in-out ${
                                menuOpen
                                    ? "bg-orange-500 -rotate-45 top-3.5"
                                    : "bg-white top-7"
                            }`}
                        ></span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`md:hidden bg-black/95 text-white absolute w-full left-0 transition-all duration-300 overflow-hidden ${
                    menuOpen ? "max-h-96 py-4" : "max-h-0"
                }`}
            >
                <div className="flex flex-col items-center space-y-4">
                    {["services", "gallery", "about", "contact"].map((id) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="text-xl font-semibold hover:text-orange-500 transition"
                        >
                            {id.charAt(0).toUpperCase() + id.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
}
