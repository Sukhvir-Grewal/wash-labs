import { useState } from "react";
import {
    motion,
    AnimatePresence,
    useViewportScroll,
    useTransform,
} from "framer-motion";
import Booking from "./Booking";

const shineOptions = [
    { label: "Wax", price: 0 },
    { label: "Ceramic Sealant", price: 10 },
    { label: "Ceramic Coating", price: 20 },
];

const deconOptions = [
    { label: "Clay Bar", price: 10 },
    { label: "Iron Remover", price: 20 },
];

export default function Services() {
    const { scrollY } = useViewportScroll();
    const yMove = useTransform(scrollY, [0, 500], [0, -30]);

    // State for shine selection per service (by index)
    const [shineSelections, setShineSelections] = useState({
        0: shineOptions[0], // Premium Exterior Wash
        2: shineOptions[0], // Ultimate Full Detail
    });

    // State for decontamination selection per service (by index)
    const [deconSelections, setDeconSelections] = useState({
        0: null, // Premium Exterior Wash
        2: null, // Ultimate Full Detail
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
            animation: "fade-up",
            hasShine: false,
        },

        {
            title: "Ultimate Full Detail",
            basePrice: 140,
            features: [" Exterior Wash + Interior Detail"],
            time: "3 hrs",
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
        setShineSelections((prev) => ({
            ...prev,
            [serviceIdx]: option,
        }));
    };

    // Handle decon selection for a card
    const handleDeconChange = (serviceIdx, option) => {
        setDeconSelections((prev) => {
            // Deselect if already selected
            if (prev[serviceIdx]?.label === option.label) {
                return { ...prev, [serviceIdx]: null };
            }
            return { ...prev, [serviceIdx]: option };
        });
    };

    return (
        <section id="services" className="py-20 min-h-screen bg-blue-50">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-extrabold mb-12 text-gray-900 font-heading tracking-tight">
                    <span className="text-black">Our </span>
                    <span className="text-blue-600">Services</span>
                </h2>
                <div className="grid gap-10 md:grid-cols-3">
                    {services.map((service, index) => {
                        // Calculate price with shine and decon add-on if applicable
                        const shine = service.hasShine
                            ? shineSelections[index] || shineOptions[0]
                            : null;
                        const decon = service.hasShine
                            ? deconSelections[index]
                            : null;
                        const totalPrice =
                            service.basePrice +
                            (shine ? shine.price : 0) +
                            (decon ? decon.price : 0);

                        return (
                            <motion.div
                                key={index}
                                data-aos={service.animation}
                                style={{ y: yMove }}
                                className="rounded-2xl shadow-xl p-8 flex flex-col justify-between border border-gray-200
              bg-gray-50
              transition-transform duration-500 ease-in-out
              hover:shadow-2xl hover:bg-gray-100
              cursor-pointer"
                                onClick={() => handleSelect(service, totalPrice)}
                            >
                                <div>
                                    <h3 className="text-2xl font-bold mb-4 text-gray-900 font-heading">
                                        {service.title}
                                    </h3>
                                    <p className="font-semibold mb-2 text-xl text-blue-600">
                                        ${totalPrice}
                                    </p>
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShineChange(
                                                                index,
                                                                opt
                                                            );
                                                        }}
                                                        className={`px-5 py-2 rounded-full border font-medium transition-all
                                                            ${
                                                                (shineSelections[
                                                                    index
                                                                ]?.label ??
                                                                    "Wax") ===
                                                                opt.label
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
                                                {deconOptions.map((opt) => (
                                                    <button
                                                        key={opt.label}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeconChange(
                                                                index,
                                                                opt
                                                            );
                                                        }}
                                                        className={`px-5 py-2 rounded-full border font-medium transition-all
                                                            ${
                                                                (deconSelections[
                                                                    index
                                                                ]?.label ??
                                                                    null) ===
                                                                opt.label
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
                                </div>
                                <p className="mt-auto font-medium text-gray-500">
                                    Time: {service.time}
                                </p>
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
