import { useEffect, useRef, useState } from "react";
import { FiCheck, FiPlus, FiMinus, FiArrowRight, FiPhone, FiShield } from "react-icons/fi";
import Image from "next/image";
import { useRouter } from "next/router";
// Dynamically load services from MongoDB via API

// simple in-memory cache for this module instance
let _servicesCache = null;

// Desired display order by title semantics:
// 1) Premium exterior wash
// 2) Complete interior detail
// 3) Ultimate full detail
// 4) Subscription (always last)
const SERVICE_ORDER = ["wash", "interior", "full", "subscription"]; // fallback by id
const SERVICE_PRIORITY = SERVICE_ORDER.reduce((acc, id, idx) => { acc[id] = idx; return acc; }, {});
function getTitlePriority(service) {
    const t = (service.title || '').toLowerCase();
    // Put subscription last
    if (t.includes('subscription')) return 3;
    // Ultimate full detail
    if (t.includes('ultimate') && t.includes('full')) return 2;
    // Complete interior detail
    if (t.includes('complete') && t.includes('interior')) return 1;
    // Premium exterior wash (be lenient with possible typos like exterir)
    if (t.includes('premium') && (t.includes('exterior') || t.includes('exterir')) && t.includes('wash')) return 0;
    // Fallback to id-based order if available
    const pid = SERVICE_PRIORITY[service.id] ?? 999;
    return pid;
}


function ServiceCard({ service, isOpen, onToggle, onBook }) {
    const priceLabel = typeof service.basePrice === "number" ? `$${service.basePrice}` : "--";
    const baseFeatures = service.baseFeatures ?? [];
    const isSubscription = (service.id === 'subscription') || ((service.title || '').toLowerCase().includes('subscription'));
    // Smooth expand/collapse: measure content height and animate max-height
    const contentRef = useRef(null);
    const [measuredHeight, setMeasuredHeight] = useState(0);
    // Card image selection (sub_image_card for subscription)
    let imageSrc = null;
    const title = (service.title || '').toLowerCase();
    if (isSubscription) {
        imageSrc = '/images/sub_image_card.png';
    } else {
        if (title.includes('premium') && (title.includes('exterior') || title.includes('exterir')) && title.includes('wash')) {
            imageSrc = '/images/wash_image_card.png';
        } else if (title.includes('complete') && title.includes('interior') && title.includes('detail')) {
            imageSrc = '/images/interior_image_card.png';
        } else if (title.includes('ultimate') && title.includes('full') && title.includes('detail')) {
            imageSrc = '/images/full_image_card.png';
        }
    }
    // Opacity for image overlay (edit this value to test different looks)
    const imageOpacity = 0.25; // <--- CHANGE THIS VALUE TO TEST

    useEffect(() => {
        // Measure on mount and whenever open state changes
        if (contentRef.current) {
            const h = contentRef.current.scrollHeight || 0;
            setMeasuredHeight(h);
        }
    }, [isOpen, baseFeatures.length, service.summary]);

    return (
        <div
            className={`group rounded-3xl border shadow-sm ring-1 ring-black/0 hover:shadow-lg hover:-translate-y-1 transition duration-300 ${isSubscription ? 'subscription-card' : ''}`}
            style={
                isSubscription
                    ? {
                          background:
                              'linear-gradient(135deg, #FFF7E6 0%, #FFE8A3 35%, #F9D976 65%, #F5B942 100%)',
                          borderColor: '#F5B942',
                          position: 'relative',
                          overflow: 'hidden'
                      }
                    : { background: 'rgba(255,255,255,0.90)', borderColor: '#E5E7EB', position: 'relative', overflow: 'hidden' }
            }
        >
            {/* Card image background (z-0) */}
            {imageSrc && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0,
                    pointerEvents: 'none',
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                }}>
                    <Image
                        src={imageSrc}
                        alt="Service visual"
                        fill
                        style={{
                            objectFit: 'cover',
                            borderRadius: 'inherit',
                            opacity: imageOpacity,
                            background: isSubscription ? undefined : 'rgba(255,255,255,0.90)'
                        }}
                        sizes="(max-width: 768px) 100vw, 600px"
                        priority
                        unoptimized={false}
                    />
                </div>
            )}
            {/* Shine overlay for subscription */}
            {isSubscription && (
                <>
                    <div className="shine" aria-hidden="true" />
                </>
            )}
            {/* All content is z-10 so not affected by image opacity */}
            <button
                type="button"
                onClick={() => onToggle(service.id)}
                className="w-full text-left px-6 py-6 flex flex-col gap-2 relative z-10"
            >
                <span className="text-xs uppercase tracking-[0.18em] text-blue-600">
                    {service.comingSoon ? "Stay tuned" : "Detail package"}
                </span>
                <span className="text-2xl font-bold" style={{ color: isSubscription ? '#7C2D12' : '#0A0A0A' }}>{service.title}</span>
                {!service.comingSoon && (
                    <span className="inline-flex items-center gap-2 text-base font-semibold" style={{ color: isSubscription ? '#7C2D12' : '#0A0A0A' }}>
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                        Starting at {priceLabel}
                    </span>
                )}
                <span className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border group-hover:border-gray-300 transition"
                    style={{ color: isSubscription ? '#7C2D12' : '#111827', borderColor: isSubscription ? '#F5B942' : '#E5E7EB' }}>
                    {isOpen ? <FiMinus /> : <FiPlus />}
                </span>
            </button>
            <div
                className="overflow-hidden"
                style={{
                    maxHeight: isOpen ? measuredHeight : 0,
                    transition: 'max-height 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange: 'max-height'
                }}
            >
                <div ref={contentRef} className="px-6 pb-6 space-y-5">
                    {baseFeatures.length ? (
                        <ul
                            className="space-y-2 text-sm"
                            style={{
                                color: "#1F2937",
                                borderRadius: '0.75rem',
                                padding: '0.75rem 1rem',
                                backdropFilter: 'blur(8px)',
                                background: 'rgba(255,255,255,0.08)',
                                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.03)'
                            }}
                        >
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
                                onClick={() => onBook(service)}
                                className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold transition ${isSubscription ? '' : ''}`}
                                style={ isSubscription
                                    ? { background: '#D97706', boxShadow: '0 6px 20px rgba(217, 119, 6, 0.25)', opacity: 1 }
                                    : { background: '#2563EB', opacity: 1 } }
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
            {isSubscription && (
                <style jsx>{`
                    .subscription-card { position: relative; overflow: hidden; }
                    .subscription-card .shine {
                        position: absolute;
                        top: -20%;
                        bottom: -20%;
                        left: -30%;
                        width: 50%;
                        background: linear-gradient(60deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%);
                        transform: translateX(-120%) rotate(8deg);
                        animation: shine 2.75s ease-in-out infinite;
                        pointer-events: none;
                    }
                    @keyframes shine {
                        0% { transform: translateX(-120%) rotate(8deg); }
                        60% { transform: translateX(160%) rotate(8deg); }
                        100% { transform: translateX(160%) rotate(8deg); }
                    }
                `}</style>
            )}
        </div>
    );
}

// Dynamically load services from MongoDB via API

// simple in-memory cache for this module instance


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
                // Order by title-based priority; within same, non-comingSoon first; then title
                const ordered = [...list].sort((a, b) => {
                    const pa = getTitlePriority(a);
                    const pb = getTitlePriority(b);
                    if (pa !== pb) return pa - pb;
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
                <div className="flex flex-col gap-6">
                    {loading && (
                        <div className="col-span-full text-center text-blue-600">Loading services...</div>
                    )}
                    {!loading && services.map((service) => {
                        const isOpen = openId === service.id;
                        return (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                isOpen={isOpen}
                                onToggle={handleToggle}
                                onBook={handleBook}
                            />
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
