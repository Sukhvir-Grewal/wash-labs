// components/Footer.js
import { FaInstagram, FaFacebook, FaTwitter, FaTiktok } from "react-icons/fa";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-black/90 text-gray-300 py-6 mt-10 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Rights */}
                <p className="text-sm text-gray-400">
                    © {year} <span className="text-orange-500 font-semibold">Wash Labs</span>. All Rights Reserved.
                </p>

                {/* Right: Socials */}
                <div className="flex space-x-6 text-xl">
                    <a
                        href="https://instagram.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-500 transition"
                    >
                        <FaInstagram />
                    </a>
                    {/* <a
                        href="https://facebook.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-500 transition"
                    >
                        <FaFacebook />
                    </a> */}
                    {/* <a
                        href="https://twitter.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-500 transition"
                    >
                        <FaTwitter />
                    </a> */}
                    <a
                        href="https://tiktok.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-orange-500 transition"
                    >
                        <FaTiktok />
                    </a>
                </div>
            </div>
        </footer>
    );
}
