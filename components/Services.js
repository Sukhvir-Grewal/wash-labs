import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCheck, FiPlus, FiMinus, FiArrowRight, FiPhone, FiShield } from "react-icons/fi";
import { useRouter } from "next/router";
// Dynamically load services from MongoDB via API

// simple in-memory cache for this module instance
let _servicesCache = null;

export default function Services() {
    const router = useRouter();
    const [openId, setOpenId] = useState(null);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const loadedRef = useRef(false);

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

    useEffect(() => {
        let cancelled = false;
        async function fetchServices() {
            try {
                if (_servicesCache) {
                    if (!cancelled) {
                        setServices(_servicesCache);
                        setLoading(false);
                    }
                    return;
                }
                const resp = await fetch('/api/services');
                const data = await resp.json().catch(() => ({ services: [] }));
                const list = Array.isArray(data.services) ? data.services : [];
                // keep a stable order: comingSoon last, then by title
                const ordered = [...list].sort((a, b) => {
                    if (a.comingSoon && !b.comingSoon) return 1;
                    if (!a.comingSoon && b.comingSoon) return -1;
                    return (a.title || '').localeCompare(b.title || '');
                });
                _servicesCache = ordered;
                if (!cancelled) {
                    setServices(ordered);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setServices([]);
                    setLoading(false);
                }
            }
        }
        if (!loadedRef.current) {
            loadedRef.current = true;
            fetchServices();
        }
        return () => { cancelled = true; };
    }, []);

    return (
        <section id="services" className="relative py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50">
            <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_10%,black,transparent)]" />
            <div className="relative max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <FiShield /> Trusted care
                    </span>
                    <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: "#0A0A0A" }}>
                        Premium Detailing Packages
                    </h2>
                    <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "#1F2937" }}>
                        Curated services that protect your finish and elevate the look. Open a card to book instantly.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {loading && (
                        <div className="col-span-full text-center text-blue-600">Loading services...</div>
                    )}
                    {!loading && services.map((service) => {
                        const isOpen = openId === service.id;
                        const priceLabel = typeof service.basePrice === "number" ? `$${service.basePrice}` : "--";
                        const baseFeatures = service.baseFeatures ?? [];
                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="group rounded-3xl border border-slate-200 bg-white/90 shadow-sm ring-1 ring-black/0 hover:shadow-lg hover:-translate-y-1 transition duration-300"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleToggle(service.id)}
                                    className="w-full text-left px-6 py-6 flex flex-col gap-2"
                                >
                                    <span className="text-xs uppercase tracking-[0.18em] text-blue-600">
                                        {service.comingSoon ? "Stay tuned" : "Detail package"}
                                    </span>
                                    <span className="text-2xl font-bold" style={{ color: "#0A0A0A" }}>{service.title}</span>
                                    {!service.comingSoon && (
                                        <span className="inline-flex items-center gap-2 text-base font-semibold" style={{ color: "#0A0A0A" }}>
                                            <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                                            Starting at {priceLabel}
                                        </span>
                                    )}
                                    <span className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 group-hover:border-gray-300 transition" style={{ color: "#111827" }}>
                                        {isOpen ? <FiMinus /> : <FiPlus />}
                                    </span>
                                </button>
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[32rem]" : "max-h-0"}`}>
                                    <div className="px-6 pb-6 space-y-5">
                                        {baseFeatures.length ? (
                                            <ul className="space-y-2 text-sm" style={{ color: "#1F2937" }}>
                                                {baseFeatures.map((feature) => (
                                                    <li key={feature} className="flex items-start gap-3">
                                                        <FiCheck className="mt-0.5" style={{ color: "#16A34A" }} />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm" style={{ color: "#1F2937" }}>{service.summary}</p>
                                        )}
                                        {service.comingSoon ? (
                                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm" style={{ color: "#1F2937" }}>
                                                Subscription plans are almost ready. Join our newsletter to be first in line.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBook(service)}
                                                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                                                >
                                                    Book Online <FiArrowRight />
                                                </button>
                                                <a
                                                    href="tel:+17828275010"
                                                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-300 hover:bg-slate-100 font-semibold text-center transition"
                                                    style={{ color: "#0A0A0A" }}
                                                >
                                                    <FiPhone /> Call +1 (782) 827-5010
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
