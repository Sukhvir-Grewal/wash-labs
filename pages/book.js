import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FiCheck, FiX } from "react-icons/fi";

const Booking = dynamic(() => import("@/components/Booking"), { ssr: false });

const VEHICLE_OPTIONS = [
  { id: "sedan", label: "Sedan", adjustment: 0 },
  { id: "suv", label: "SUV", adjustment: 20 },
  { id: "truck", label: "Truck", adjustment: 40 },
];

export default function BookPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [plan, setPlan] = useState("base");
  const [vehicleType, setVehicleType] = useState(VEHICLE_OPTIONS[0].id);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    async function fetchServices() {
      setLoading(true);
      try {
        const resp = await fetch('/api/services');
        const data = await resp.json().catch(() => ({ services: [] }));
        const list = Array.isArray(data.services) ? data.services : [];
        if (!cancelled) {
          setServices(list);
          if (router.isReady) {
            const { service: serviceId } = router.query;
            if (typeof serviceId === "string") {
              const svc = list.find((s) => s.id === serviceId);
              setSelectedService(svc || null);
            } else {
              setSelectedService(list.length > 0 ? list[0] : null);
            }
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setServices([]);
          setSelectedService(null);
          setLoading(false);
        }
      }
    }
    if (router.isReady) {
      fetchServices();
      // Fallback: clear loading after 7 seconds if fetch hangs
      timeoutId = setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 7000);
    }
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [router.isReady, router.query.service]);

  const planFeatures = useMemo(() => {
    if (!selectedService) return [];
    const baseFeatures = selectedService.baseFeatures ?? [];
    const reviveFeatures = selectedService.reviveFeatures ?? [];
    if (plan === "revive") {
      return [...baseFeatures, ...reviveFeatures].map((feature) => ({ text: feature, status: "✅" }));
    }
    const baseIncluded = baseFeatures.map((feature) => ({ text: feature, status: "✅" }));
    const reviveExtras = reviveFeatures.map((feature) => ({ text: feature, status: "❌" }));
    return [...baseIncluded, ...reviveExtras];
  }, [selectedService, plan]);

  const basePlanPrice = useMemo(() => {
    if (!selectedService) return null;
    if (plan === "revive" && typeof selectedService.revivePrice === "number") {
      return selectedService.revivePrice;
    }
    if (plan === "base" && typeof selectedService.basePrice === "number") {
      return selectedService.basePrice;
    }
    return null;
  }, [plan, selectedService]);

  const vehicleOption = useMemo(
    () => VEHICLE_OPTIONS.find((option) => option.id === vehicleType) ?? VEHICLE_OPTIONS[0],
    [vehicleType]
  );

  const selectedVehicleIndex = useMemo(() => {
    const idx = VEHICLE_OPTIONS.findIndex((o) => o.id === vehicleType);
    return idx >= 0 ? idx : 0;
  }, [vehicleType]);

  const totalPrice = useMemo(() => {
    if (typeof basePlanPrice !== "number") return null;
    return basePlanPrice + vehicleOption.adjustment;
  }, [basePlanPrice, vehicleOption.adjustment]);

  const isSubscription = useMemo(() => {
    const t = (selectedService?.title || '').toLowerCase();
    return selectedService?.id === 'subscription' || t.includes('subscription');
  }, [selectedService?.id, selectedService?.title]);

  useEffect(() => {
    setPlan("base");
    setVehicleType(VEHICLE_OPTIONS[0].id);
  }, [selectedService?.id]);

  useEffect(() => {
    if (!router.isReady) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [router.isReady]);

  useEffect(() => {
    document.body.style.overflow = showBooking ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showBooking]);

  const handleOpenBooking = () => {
    if (selectedService && !selectedService.comingSoon) {
      setShowBooking(true);
    }
  };

  const handleCloseBooking = () => {
    setShowBooking(false);
  };

  const fallbackService = useMemo(() => {
    return services.find((svc) => !svc.comingSoon);
  }, [services]);

  return (
  <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50" style={{ color: '#0A0A0A' }}>
      <Navigation />
  <section className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white/95 border rounded-3xl shadow-xl overflow-hidden text-center p-10 text-blue-600">Loading services...</div>
        ) : selectedService ? (
          <div
            className={`border rounded-3xl shadow-xl overflow-hidden ${isSubscription ? 'subscription-card relative' : ''}`}
            style={
              isSubscription
                ? {
                    background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE8A3 35%, #F9D976 65%, #F5B942 100%)',
                    borderColor: '#F5B942'
                  }
                : { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb' }
            }
          >
            {isSubscription && <div className="shine" aria-hidden="true" />}
            <div className="px-6 sm:px-10 py-10 space-y-6">
              {/* Go back arrow */}
              <button
                type="button"
                aria-label="Go back"
                onClick={() => router.back()}
                className="mb-2 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="sr-only sm:not-sr-only">Back</span>
              </button>
              <span className="inline-flex px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-widest">
                {selectedService.comingSoon ? "Coming Soon" : "Book Now"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: isSubscription ? '#7C2D12' : '#0A0A0A' }}>
                {selectedService.title}
              </h1>
              {!isSubscription && (
                <div className="relative grid grid-cols-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden w-full sm:w-auto">
                  <div
                    className="absolute inset-y-0 w-1/2 rounded-full bg-white shadow transition-transform duration-300 ease-out"
                    style={{ transform: plan === "revive" ? "translateX(100%)" : "translateX(0%)" }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => setPlan("base")}
                    className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors`}
                    style={{ color: plan === 'base' ? '#0A0A0A' : '#111827' }}
                  >
                    Base
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedService.comingSoon || typeof selectedService.revivePrice !== "number") return;
                      setPlan("revive");
                    }}
                    className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors ${
                      selectedService.comingSoon || typeof selectedService.revivePrice !== "number"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    style={{ color: plan === 'revive' ? '#0A0A0A' : '#111827' }}
                    disabled={selectedService.comingSoon || typeof selectedService.revivePrice !== "number"}
                  >
                    Revive
                  </button>
                </div>
              )}
              <div
                className="relative rounded-2xl p-1 border bg-slate-100"
                style={{
                  background: isSubscription ? 'rgba(254, 243, 199, 0.6)' : '#f1f5f9',
                  borderColor: isSubscription ? '#F5B942' : '#e5e7eb'
                }}
              >
                {/* Single highlight, not duplicated by button backgrounds */}
                <div
                  className={`absolute inset-y-0 left-0 w-1/3 rounded-full transition-transform duration-300 ease-out pointer-events-none ${isSubscription ? 'border shadow-[0_1px_4px_rgba(245,185,66,0.35)] bg-white' : 'bg-white shadow'}`}
                  style={{
                    transform: `translateX(${selectedVehicleIndex * 100}%)`,
                    borderColor: isSubscription ? '#F5B942' : undefined,
                    borderWidth: isSubscription ? 1 : 0
                  }}
                  aria-hidden="true"
                />
                <div className="relative flex">
                  {VEHICLE_OPTIONS.map((option, idx) => {
                    const isSelected = vehicleType === option.id;
                    const selectedColor = isSubscription ? '#7C2D12' : '#0A0A0A';
                    const unselectedColor = isSubscription ? '#7C2D12CC' : '#111827';
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setVehicleType(option.id)}
                        className={`flex-1 relative z-10 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${isSelected ? 'font-bold' : ''}`}
                        style={{
                          color: isSelected ? selectedColor : unselectedColor,
                          background: 'transparent',
                          boxShadow: 'none',
                          position: 'relative',
                        }}
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-semibold" style={{ color: '#0A0A0A' }}>
                  {totalPrice !== null ? `Total: $${totalPrice}` : "Contact us"}
                </div>
              </div>
              {planFeatures.length ? (
                <ul className="grid sm:grid-cols-2 gap-3 text-sm sm:text-base" style={{ color: '#111827' }}>
                  {planFeatures.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.status === "✅" ? (
                        <FiCheck className="mt-0.5" style={{ color: '#16A34A' }} aria-hidden="true" />
                      ) : (
                        <FiX className="mt-0.5" style={{ color: '#9CA3AF' }} aria-hidden="true" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!selectedService.comingSoon && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleOpenBooking}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Begin Booking
                  </button>
                  <a
                    href="tel:+17828275010"
                    className="w-full sm:w-auto px-6 py-3 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold text-center"
                  >
                    Call +1 (782) 827-5010
                  </a>
                </div>
              )}
              {selectedService.comingSoon && (
                <div
                  className="rounded-xl border border-dashed px-4 py-6 text-sm"
                  style={{
                    borderColor: isSubscription ? '#F5B942' : '#BFDBFE',
                    background: isSubscription ? '#FEF3C7' : 'rgba(239,246,255,0.7)',
                    color: isSubscription ? '#7C2D12' : '#1D4ED8'
                  }}
                >
                  Subscriptions are almost here. We’ll share flexible plans that keep your vehicle spotless on your schedule.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold" style={{ color: '#0A0A0A' }}>Select a service to get started</h1>
            <p style={{ color: '#1F2937' }}>
              We couldn’t find the package you were looking for. Choose one of our detailing options to continue.
            </p>
            {fallbackService && (
              <button
                type="button"
                onClick={() => router.push({ pathname: "/book", query: { service: fallbackService.id } })}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                View {fallbackService.title}
              </button>
            )}
          </div>
        )}
      </section>
      <Footer />
      {showBooking && selectedService && !selectedService.comingSoon && (
        <Booking service={selectedService} onClose={handleCloseBooking} />
      )}
    </main>
  );
}
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
       