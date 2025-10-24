import { useState } from "react";
import { useRouter } from "next/router";
import { SERVICES } from "@/data/services";

export default function Services() {
    const router = useRouter();
    const [openId, setOpenId] = useState(null);

    const handleToggle = (id) => {
        setOpenId((prev) => (prev === id ? null : id));
    };

    const handleBook = (service) => {
        if (service.comingSoon) return;
        router.push(
            { pathname: "/book", query: { service: service.id } },
            undefined,
            { scroll: true }
        );
    };

    return (
        <section id="services" className="py-20 bg-blue-50">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: "#000" }}>
                        Packages
                    </h2>
                    <p className="mt-4 text-blue-800 text-base sm:text-lg max-w-2xl mx-auto">
                        Pick the finish that fits your ride. Expand a card to book online or ring us right away.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {SERVICES.map((service) => {
                        const isOpen = openId === service.id;
                        const priceLabel = typeof service.basePrice === "number" ? `$${service.basePrice}` : "--";
                        const baseFeatures = service.baseFeatures ?? [];
                        return (
                            <div
                                key={service.id}
                                className="rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleToggle(service.id)}
                                    className="w-full text-left px-6 py-6 flex flex-col gap-2"
                                >
                                    <span className="text-sm uppercase tracking-[0.2em] text-blue-500">
                                        {service.comingSoon ? "Stay tuned" : "Detail package"}
                                    </span>
                                    <span className="text-2xl font-bold text-blue-900" style={{ color: "#000" }}>{service.title}</span>
                                    {/* <p className="text-sm text-blue-700 leading-relaxed">
                                        {service.summary}
                                    </p> */}
                                    {!service.comingSoon && (
                                        <span className="inline-flex items-center text-base font-semibold text-blue-600">
                                            Starting at {priceLabel}
                                        </span>
                                    )}
                                    <span className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border text-blue-600 transition-transform">
                                        {isOpen ? "−" : "+"}
                                    </span>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[32rem]" : "max-h-0"}`}
                                >
                                    <div className="px-6 pb-6 space-y-4">
                                        {baseFeatures.length ? (
                                            <ul className="space-y-2 text-sm text-blue-800">
                                                {baseFeatures.map((feature) => (
                                                    <li key={feature} className="flex items-start gap-2">
                                                        <span className="text-blue-500">•</span>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-blue-700">{service.summary}</p>
                                        )}
                                        {service.comingSoon ? (
                                            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
                                                Subscription plans are almost ready. Join our newsletter to be first in line.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBook(service)}
                                                    className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                                                >
                                                    Book Online
                                                </button>
                                                <a
                                                    href="tel:+17828275010"
                                                    className="w-full py-3 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold text-center transition"
                                                >
                                                    Call +1 (782) 827-5010
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
