import { useState } from "react";
import {
    motion,
    AnimatePresence,
    useViewportScroll,
    useTransform,
} from "framer-motion";
import Booking from "./Booking";

export default function Services() {
    const { scrollY } = useViewportScroll();
    const yMove = useTransform(scrollY, [0, 500], [0, -30]);

    const services = [
        {
            title: "Premium Exterior Wash",
            price: "$50",
            features: [
                "Full Exterior Foam Bath",
                "Ceramic Sealant (6mo protection)",
                "Wheels & Tires Deep Cleaned",
                "Tire Shine Applied",
            ],
            time: "1 hr",
            animation: "fade-right",
        },
        {
            title: "Complete Interior Detail",
            price: "$100",
            features: [
                "Vacuum & Wipe Cracks + Crevices",
                "UV Protection Applied",
                "Leather Cleaned",
                "Streak-Free Glass",
            ],
            time: "2 hrs",
            animation: "fade-up",
        },
        {
            title: "Ultimate Full Detail",
            price: "$140",
            features: [
                "Full Exterior Foam Bath",
                "Ceramic Sealant Applied",
                "Wheels & Tires Deep Cleaned",
                "Tire Shine Applied",
                "Vacuum & Wipe Cracks + Crevices",
                "UV Protection Applied",
                "Leather Cleaned",
                "Streak-Free Glass",
            ],
            time: "3 hrs",
            animation: "fade-left",
        },
    ];

    const addons = [
        { title: "Decontamination Treatment", price: "Free (Limited Time)" },
        { title: "Clay Bar Service", price: "Free (Limited Time)" },
        { title: "Pet Hair Removal", price: "Free (Limited Time)" },
    ];

    const [selectedService, setSelectedService] = useState(null);

    const handleSelect = (service) => {
        setSelectedService(service);
        document.body.style.overflow = "hidden"; // lock scroll when modal is open
    };

    const handleClose = () => {
        setSelectedService(null);
        document.body.style.overflow = "auto"; // unlock scroll
    };

    return (
        <section
            id="services"
            className="py-20 bg-gradient-to-r from-[#333333] to-[#1a1a1a]"
        >
            <div className="max-w-7xl mx-auto px-6 text-center">
                <h2 className="text-4xl font-extrabold text-orange-500 mb-12">
                    Our Services
                </h2>
                <div className="grid gap-8 md:grid-cols-3">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            data-aos={service.animation}
                            style={{ y: yMove }}
                            className="bg-white/10 rounded-2xl shadow-lg p-8 flex flex-col justify-between
              transform transition-transform duration-500 ease-in-out
              hover:scale-105 hover:shadow-2xl hover:bg-white/20
              cursor-pointer"
                            onClick={() => handleSelect(service)}
                        >
                            <div>
                                <h3 className="text-2xl font-bold text-orange-400 mb-4">
                                    {service.title}
                                </h3>
                                <p className="text-green-400 font-semibold mb-2">
                                    {service.price}
                                </p>
                                <ul className="text-left text-gray-200 mb-6 space-y-2">
                                    {service.features.map((feature, i) => (
                                        <li key={i}>✔ {feature}</li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-gray-400 mt-auto font-medium">
                                Time: {service.time}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* ✅ Add-ons Section */}
                <div className="mt-16">
                    <h3 className="text-3xl font-extrabold text-orange-400 mb-6">
                        Add-Ons (Affordable Upgrades)
                    </h3>
                    <div className="grid gap-6 md:grid-cols-3">
                        {addons.map((addon, i) => (
                            <div
                                key={i}
                                className="bg-white/10 rounded-xl p-6 shadow-md hover:shadow-lg transition"
                            >
                                <h4 className="text-xl font-bold text-orange-300 mb-2">
                                    {addon.title}
                                </h4>
                                <p
                                    className={`${
                                        addon.price.includes("Free")
                                            ? "text-green-400 font-semibold"
                                            : "text-green-400"
                                    }`}
                                >
                                    {addon.price}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Booking Modal */}
                <AnimatePresence>
                    {selectedService && (
                        <motion.div
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
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
