// components/Navigation.js
export default function Navigation() {
    // Function to scroll to top smoothly
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Smooth scroll to section
    const handleScroll = (e, id) => {
        e.preventDefault();
        const section = document.querySelector(id);
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <header className="bg-black/90 sticky top-0 z-50 shadow-md">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                {/* Logo */}
                <button
                    onClick={scrollToTop}
                    className="flex items-center focus:outline-none"
                >
                    <img
                        src="/images/logo.png"
                        alt="Wash Labs Logo"
                        className="w-[120px] h-[120px] cursor-pointer"
                    />
                </button>

                {/* Navigation Links */}
                <nav className="hidden md:flex space-x-8 text-white font-semibold">
                    <a
                        href="#services"
                        onClick={(e) => handleScroll(e, "#services")}
                        className="hover:text-orange-500 transition cursor-pointer"
                    >
                        Services
                    </a>
                    <a
                        href="#gallery"
                        onClick={(e) => handleScroll(e, "#gallery")}
                        className="hover:text-orange-500 transition cursor-pointer"
                    >
                        Gallery
                    </a>
                    <a
                        href="#about"
                        onClick={(e) => handleScroll(e, "#about")}
                        className="hover:text-orange-500 transition cursor-pointer"
                    >
                        About
                    </a>
                    <a
                        href="#contact"
                        onClick={(e) => handleScroll(e, "#contact")}
                        className="hover:text-orange-500 transition cursor-pointer"
                    >
                        Contact
                    </a>
                </nav>
            </div>
        </header>
    );
}
