import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Lazy-load the Booking modal to keep the main bundle small
const Booking = dynamic(() => import("./Booking"), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white text-blue-700 px-4 py-3 rounded-lg shadow border border-blue-100">
                Loading booking…
            </div>
        </div>
    ),
});

const shineOptions = [
    { label: "Wax", price: 0 },
    { label: "Ceramic Sealant", price: 10 },
    // { label: "Ceramic Coating", price: 20 }, // Removed for now
];

const deconOptions = [
    { label: "Iron Remover", price: 10 },
    { label: "Clay Bar", price: 15 },
];

const carTypeOptions = [
    { label: "Sedan", price: 0 },
    { label: "SUV", price: 10 },
    { label: "Truck", price: 20 },
];

// Helper to format minutes as hours text
const formatDuration = (mins) => {
	const hours = mins / 60;
	const label = Number.isInteger(hours) ? hours : hours.toFixed(1);
	return `${label} hr${hours === 1 ? "" : "s"}`;
};

export default function Services() {

    // State for shine selection per service (by index)
    const [shineSelections, setShineSelections] = useState({
        0: shineOptions[0], // Premium Exterior Wash
        2: shineOptions[0], // Ultimate Full Detail
    });

    // State for decontamination selection per service (by index)
    // Now supports multiple selections per service (array of selected options)
    const [deconSelections, setDeconSelections] = useState({
        0: [],
        2: [],
    });

    // State for car type selection per service (by index)
    const [carTypeSelections, setCarTypeSelections] = useState({
        0: carTypeOptions[0],
        1: carTypeOptions[0],
        2: carTypeOptions[0],
    });

    const services = [
        {
            title: "Premium Exterior Wash",
            basePrice: 50,
            features: [
                "Foam Bath & Hand Wash",
                "Wheels & Tires Cleaned",
                "Tire Shine Finish",
                "Spot-Free Dry",
            ],
            time: "1 hr",
            durationMinutes: 60,
            animation: "fade-right",
            hasShine: true,
        },
        {
            title: "Complete Interior Detail",
            basePrice: 100,
            features: [
                "Full Vacuum & Wipe Down",
                "Hot Steam Cleaning",
                "Carpet Extraction",
                "Pet Hair Removal",
                "Leather Care & UV Protection",
                "Streak-Free Glass",
            ],
            time: "2 hrs",
            durationMinutes: 120,
            animation: "fade-up",
            hasShine: false,
        },

        {
            title: "Ultimate Full Detail",
            basePrice: 140,
            features: [" Exterior Wash + Interior Detail"],
            time: "3 hrs",
            durationMinutes: 180,
            animation: "fade-left",
            hasShine: true,
        },
    ];

    const [selectedService, setSelectedService] = useState(null);

    const handleSelect = (service, totalPrice) => {
        setSelectedService({ ...service, totalPrice });
        document.body.style.overflow = "hidden"; // lock scroll when modal is open
    };

    const handleClose = () => {
        setSelectedService(null);
        document.body.style.overflow = "auto"; // unlock scroll
    };

    // Handle shine selection for a card
    const handleShineChange = (serviceIdx, option) => {
        // if (option.label === "Ceramic Coating") {
        //     // Any special logic for Ceramic Coating can be commented here
        // }
        setShineSelections((prev) => ({
            ...prev,
            [serviceIdx]: option,
        }));
    };

    // Handle decon selection for a card (multi-select, toggle)
    const handleDeconChange = (serviceIdx, option) => {
        setDeconSelections((prev) => {
            const selected = prev[serviceIdx] || [];
            const exists = selected.find((o) => o.label === option.label);
            let updated;
            if (exists) {
                updated = selected.filter((o) => o.label !== option.label);
            } else {
                updated = [...selected, option];
            }
            return { ...prev, [serviceIdx]: updated };
        });
    };

    // Handle car type selection for a card
    const handleCarTypeChange = (serviceIdx, option) => {
        setCarTypeSelections((prev) => ({
            ...prev,
            [serviceIdx]: option,
        }));
    };

    return (
        <section id="services" className="py-20 min-h-screen bg-blue-50">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-extrabold mb-12 font-heading tracking-tight"
                    style={{ color: "#000" }}>
                    <span className="text-black">Our </span>
                    <span className="text-blue-600">Services</span>
                </h2>
                <div className="grid gap-10 md:grid-cols-3" >
                    {services.map((service, index) => {
                        // Calculate price with shine and decon add-on if applicable
                        const shine = service.hasShine
                            ? shineSelections[index] || shineOptions[0]
                            : null;
                        const deconArr = service.hasShine
                            ? deconSelections[index] || []
                            : [];
                        // Calculate decon total, apply -5 if both selected
                        let deconTotal = deconArr.reduce((sum, o) => sum + o.price, 0);
                        if (deconArr.length === 2) deconTotal -= 5;
                        const carType = carTypeSelections[index] || carTypeOptions[0];
                        const totalPrice =
                            service.basePrice +
                            (shine ? shine.price : 0) +
                            deconTotal +
                            (carType ? carType.price : 0);

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.15 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="rounded-2xl shadow-xl p-8 flex flex-col justify-between border border-gray-200
              bg-gray-50
              transition-transform duration-500 ease-in-out
              hover:shadow-2xl hover:bg-gray-100"
                            >
                                <div>
                                    <h3
                                        className="text-2xl font-bold mb-4 font-heading"
                                        style={{ color: "#000" }}
                                    >
                                        {service.title}
                                    </h3>
                                    <p className="font-semibold mb-2 text-xl" style={{ color: "#000" }}>
                                        ${totalPrice}
                                    </p>
                                    {/* Car Type Selection */}
                                    <div className="mb-5">
                                        <div className="text-base font-semibold text-gray-700 mb-2 text-left">
                                            Car Type
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {carTypeOptions.map((opt) => (
                                                <button
                                                    key={opt.label}
                                                    type="button"
                                                    onClick={() => handleCarTypeChange(index, opt)}
                                                    className={`px-5 py-2 rounded-full border font-medium transition-all
                                                        ${
															(carTypeSelections[index]?.label ?? "Sedan") === opt.label
																? "bg-blue-600 text-white border-blue-600 shadow"
																: "bg-white border-gray-300 text-blue-600 hover:bg-blue-50"
														}
                                                    `}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <ul className="text-left mb-6 space-y-2">
                                        {service.features.map((feature, i) => (
                                            <li key={i}>
                                                <span className="text-blue-600 mr-2">
                                                    •
                                                </span>
                                                <span className="text-gray-700">
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    {/* Paint Protection & Shine */}
                                    {service.hasShine && (
                                        <div className="mb-5">
                                            <div className="text-base font-semibold text-gray-700 mb-2 text-left">
                                                Paint Protection &amp; Shine
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {shineOptions.map((opt) => (
                                                    <button
                                                        key={opt.label}
                                                        type="button"
                                                        onClick={() => handleShineChange(index, opt)}
                                                        className={`px-5 py-2 rounded-full border font-medium transition-all
                                                            ${
																(shineSelections[index]?.label ?? "Wax") === opt.label
																	? "bg-blue-600 text-white border-blue-600 shadow"
																	: "bg-white border-gray-300 text-blue-600 hover:bg-blue-50"
															}
                                                        `}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Decontamination */}
                                    {service.hasShine && (
                                        <div className="mb-5">
                                            <div className="text-base font-semibold text-gray-700 mb-2 text-left">
                                                Decontamination
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {deconOptions.map((opt) => {
                                                    const deconArr = service.hasShine ? deconSelections[index] || [] : [];
                                                    const selected = !!deconArr.find((o) => o.label === opt.label);
                                                    return (
                                                        <button
                                                            key={opt.label}
                                                            type="button"
                                                            onClick={() => handleDeconChange(index, opt)}
                                                            className={`px-5 py-2 rounded-full border font-medium transition-all
                                                                ${
																	selected
																		? "bg-blue-600 text-white border-blue-600 shadow"
																		: "bg-white border-gray-300 text-blue-600 hover:bg-blue-50"
																}
                                                            `}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(deconSelections[index] || []).length === 2 && (
                                                <div className="text-xs text-blue-600 mt-2 font-semibold">
                                                    Combo discount applied (-$5)
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom actions */}
                                <div className="mt-auto space-y-3">
                                    <p className="font-medium text-gray-500" style={{ color: "#000" }}>
                                        Time: {service.durationMinutes ? formatDuration(service.durationMinutes) : service.time}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(service, totalPrice)}
                                        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                        aria-label={`Book ${service.title}`}
                                    >
                                        Book Now
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                {/* Booking Modal */}
                <AnimatePresence>
                    {selectedService && (
                        <motion.div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Booking
                                service={selectedService}
                                onClose={handleClose}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
