// components/Footer.js
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import { memo } from "react";

function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-blue-50 text-blue-900 py-8 border-t border-blue-100 mt-10">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Rights */}
                <p className="text-sm text-blue-700">
                    © {year}{" "}
                    <span className="text-[#0076ff] font-semibold">
                        Wash <span className="text-[#0076ff]">Labs</span>
                    </span>
                    . All Rights Reserved.
                </p>

                {/* Right: Socials */}
                <div className="flex space-x-6 text-xl">
                    <a
                        href="https://www.instagram.com/wash_labs/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#0076ff] transition"
                    >
                        <FaInstagram />
                    </a>
                    <a
                        href="https://www.facebook.com/profile.php?id=61581204412596"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#0076ff] transition"
                    >
                        <FaFacebook />
                    </a>
                    {/* <a
                        href="https://twitter.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#0076ff] transition"
                    >
                        <FaTwitter />
                    </a> */}
                    <a
                        href="https://www.tiktok.com/@wash__labs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#0076ff] transition"
                    >
                        <FaTiktok />
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default memo(Footer);
