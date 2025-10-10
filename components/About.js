// components/About.js
import Image from "next/image";

export default function About() {
    return (
        <section
            id="about"
            className="py-20 bg-blue-50 text-blue-900"
            aria-labelledby="about-heading"
        >
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                {/* Heading: Always first on mobile */}
                <h2
                    id="about-heading"
                    className="text-4xl font-extrabold mb-6 block md:hidden"
                    style={{ color: "#000" }}
                >
                    About Wash <span className="text-[#0076ff]">Labs</span>
                </h2>
                {/* Right Side - Text (first on mobile, second on desktop) */}
                <div className="order-2 md:order-1">
                    {/* Heading: Only show on desktop */}
                    <h2
                        id="about-heading"
                        className="text-4xl font-extrabold mb-6 hidden md:block"
                        style={{ color: "#000" }}
                    >
                        About Wash <span className="text-[#0076ff]">Labs</span>
                    </h2>
                    <p
                        className="text-lg mb-6 leading-relaxed"
                        style={{ color: "#000" }}
                    >
                        At{" "}
                        <span className="text-[#0076ff] font-semibold">
                            Wash <span className="text-[#0076ff]">Labs</span>
                        </span>
                        , we believe car care should be{" "}
                        <span className="font-semibold">
                            flawless and affordable
                        </span>
                        . Every service is carried out with precision so your
                        car looks showroom ready—without breaking your budget.
                    </p>
                    <p
                        className="text-lg mb-8 leading-relaxed"
                        style={{ color: "#000" }}
                    >
                        Using professional-grade products and modern detailing
                        techniques, we provide{" "}
                        <span className="text-[#0076ff] font-semibold">
                            long-lasting shine and protection
                        </span>
                        . Whether it’s a quick wash or a full interior +
                        exterior detail, our mission is simple:{" "}
                        <strong>
                            perfection at a price everyone can afford
                        </strong>
                        .
                    </p>
                    {/* Highlights */}
                    <div className="grid grid-cols-2 gap-6">
                        <article
                            className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition border border-blue-100 flex flex-col items-center"
                            aria-label="Affordable Pricing"
                        >
                            <div className="mb-3 bg-white rounded-full p-2 shadow">
                                {/* Dollar sign icon */}
                                <svg
                                    width="32"
                                    height="32"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d="M12 6v12m0 0c-2.5 0-3.5-1.5-3.5-2.5S9.5 13 12 13s3.5-1.5 3.5-2.5S14.5 8 12 8"
                                        stroke="#0076ff"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-[#0076ff] mt-2" style={{ color: "#000" }}>
                                Affordable
                            </h3>
                        </article>

                        <article
                            className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition border border-blue-100 flex flex-col items-center"
                            aria-label="Perfect Finish"
                        >
                            <div className="mb-3 bg-white rounded-full p-2 shadow">
                                {/* Sparkle icon */}
                                <svg
                                    width="32"
                                    height="32"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
                                        stroke="#0076ff"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
                                        stroke="#0076ff"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-[#0076ff] mt-2" style={{ color: "#000" }}>
                                Perfect Finish
                            </h3>
                        </article>
                    </div>
                </div>
                {/* Left Side - Image (second on mobile, second on desktop) */}
                <div className="relative group order-1 md:order-2">
                    <Image
                        src="/images/about-car.jpg"
                        alt="Affordable premium car detailing Halifax"
                        width={600}
                        height={400}
                        priority
                        className="rounded-2xl shadow-lg transform group-hover:scale-105 transition duration-700 object-cover w-full h-[400px]"
                    />
                    <div className="absolute inset-0 bg-blue-900/20 rounded-2xl"></div>
                    <h3 className="absolute bottom-6 left-6 text-2xl font-bold text-blue-600 drop-shadow">
                        <span className="text-[white]">
                            Affordable Perfection
                        </span>
                    </h3>
                </div>
            </div>
        </section>
    );
}
