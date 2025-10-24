import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SERVICES, getServiceById } from "@/data/services";

const Booking = dynamic(() => import("@/components/Booking"), { ssr: false });

const VEHICLE_OPTIONS = [
  { id: "sedan", label: "Sedan", adjustment: 0 },
  { id: "suv", label: "SUV", adjustment: 20 },
  { id: "truck", label: "Truck", adjustment: 40 },
];

export default function BookPage() {
  const router = useRouter();
  const { service: serviceId } = router.query;
  const selectedService = useMemo(() => {
    if (typeof serviceId !== "string") return null;
    return getServiceById(serviceId) || null;
  }, [serviceId]);

  const [showBooking, setShowBooking] = useState(false);
  const [plan, setPlan] = useState("base");
  const [vehicleType, setVehicleType] = useState(VEHICLE_OPTIONS[0].id);

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

  const totalPrice = useMemo(() => {
    if (typeof basePlanPrice !== "number") return null;
    return basePlanPrice + vehicleOption.adjustment;
  }, [basePlanPrice, vehicleOption.adjustment]);

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

  const fallbackService = SERVICES.find((svc) => !svc.comingSoon);

  return (
    <main className="min-h-screen bg-blue-50 text-blue-900">
      <Navigation />
      <section className="max-w-4xl mx-auto px-4 py-20">
        {selectedService ? (
          <div className="bg-white border border-blue-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 sm:px-10 py-10 space-y-6">
              <span className="inline-flex px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold uppercase tracking-widest">
                {selectedService.comingSoon ? "Coming Soon" : "Book Now"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "#000" }}>
                {selectedService.title}
              </h1>
              <div className="relative grid grid-cols-2 bg-blue-50 border border-blue-200 rounded-full overflow-hidden w-full sm:w-auto">
                <div
                  className="absolute inset-y-0 w-1/2 rounded-full bg-white shadow transition-transform duration-300 ease-out"
                  style={{ transform: plan === "revive" ? "translateX(100%)" : "translateX(0%)" }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setPlan("base")}
                  className={`relative z-10 px-5 py-2 text-sm font-semibold transition-colors ${
                    plan === "base" ? "text-blue-700" : "text-blue-500 hover:text-blue-600"
                  }`}
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
                    plan === "revive" ? "text-blue-700" : "text-blue-500 hover:text-blue-600"
                  } ${
                    selectedService.comingSoon || typeof selectedService.revivePrice !== "number"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={selectedService.comingSoon || typeof selectedService.revivePrice !== "number"}
                >
                  Revive
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-1">
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLE_OPTIONS.map((option, index) => {
                    const isSelected = vehicleType === option.id;
                    const alignment = index === 0 ? "justify-start" : index === 1 ? "justify-center" : "justify-end";
                    return (
                      <div key={option.id} className={`flex ${alignment}`}>
                        <button
                          type="button"
                          onClick={() => setVehicleType(option.id)}
                          className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                            isSelected
                              ? "bg-white text-blue-700 shadow"
                              : "text-blue-500 hover:text-blue-600"
                          }`}
                        >
                          {option.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-blue-700">
                  {totalPrice !== null ? `Total: $${totalPrice}` : "Contact us"}
                </div>
              </div>
              {planFeatures.length ? (
                <ul className="grid sm:grid-cols-2 gap-3 text-blue-800 text-sm sm:text-base">
                  {planFeatures.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      <span className="text-lg leading-none mt-[2px]">{feature.status}</span>
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
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-6 text-blue-700 text-sm">
                  Subscriptions are almost here. We’ll share flexible plans that keep your vehicle spotless on your schedule.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-blue-100 rounded-3xl shadow-lg p-10 text-center space-y-6">
            <h1 className="text-3xl font-bold" style={{ color: "#000" }}>Select a service to get started</h1>
            <p className="text-blue-700">
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
       