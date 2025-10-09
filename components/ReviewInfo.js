"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ReviewInfo({
    service,
    vehicle,
    userInfo,
    dateTime,
    onBack,
    onSubmit,
    totalPrice, // <-- add this prop
}) {
    const [loading, setLoading] = useState(false);

    // Price formatting
    let priceContent;
    if (typeof totalPrice === "number") {
        priceContent = (
            <span className="font-bold text-lg sm:text-xl text-blue-600">
                ${totalPrice}
            </span>
        );
    } else if (service?.prices) {
        priceContent = (
            <div className="flex flex-col items-end space-y-1">
                {Object.entries(service.prices).map(([type, price], i) => (
                    <span key={i} className="font-bold text-sm sm:text-base">
                        {type}: <span className="text-green-400">${price}</span>
                    </span>
                ))}
            </div>
        );
    } else if (
        typeof service?.price === "string" &&
        service.price.includes("|")
    ) {
        priceContent = (
            <div className="flex flex-col items-end space-y-1">
                {service.price.split("|").map((p, i) => {
                    const [label, amount] = p.split(":");
                    return (
                        <span key={i} className="font-bold text-sm sm:text-base">
                            {label.trim()}:{" "}
                            <span className="text-green-400">{amount.trim()}</span>
                        </span>
                    );
                })}
            </div>
        );
    } else {
        priceContent = (
            <span className="font-bold text-lg sm:text-xl">
                <span className="text-green-400">
                    ${service.price || "TBD"}
                </span>
            </span>
        );
    }

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onSubmit(); // call parent submit
        } finally {
            setLoading(false); // reset even if error
        }
    };

    return (
        <motion.div
            key="review-step"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full"
        >
            <h4 className="text-lg sm:text-xl font-bold text-blue-700 mb-6 text-center mt-2 tracking-tight">
                Review Your Booking
            </h4>

            {/* Info List */}
            <div className="flex flex-col gap-4 mb-8">
                {[
                    { label: "Service", value: service.title },
                    { label: "Price", value: priceContent, isPrice: true },
                    { label: "Vehicle", value: `${vehicle.year} ${vehicle.name}` },
                    { label: "Date", value: dateTime?.date || "N/A" },
                    { label: "Time", value: dateTime?.time || "N/A" },
                    { label: "Name", value: userInfo.name },
                    { label: "Email", value: userInfo.email },
                    {
                        label: "Phone",
                        value: `${userInfo.countryCode || ""} ${userInfo.phone}`,
                    },
                    userInfo.message && {
                        label: "Notes",
                        value: userInfo.message,
                    },
                ]
                    .filter(Boolean)
                    .map((item, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-start border-b border-blue-100 pb-2 last:border-b-0"
                        >
                            <span className="font-medium text-blue-700">
                                {item.label}
                            </span>
                            <span
                                className={`text-right ${
                                    item.isPrice
                                        ? "text-blue-600 font-bold"
                                        : "text-gray-800"
                                }`}
                            >
                                {item.value}
                            </span>
                        </div>
                    ))}
            </div>

            {/* Sticky Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between p-4 border-t border-blue-100 bg-white">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={loading}
                    className={`py-3 px-6 rounded-lg font-semibold transition w-full sm:w-auto ${
                        loading
                            ? "bg-gray-200 cursor-not-allowed text-gray-400 border border-blue-100"
                            : "bg-white hover:bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                >
                    Back
                </button>

                <button
                    type="submit"
                    onClick={handleConfirm}
                    disabled={loading}
                    className={`py-3 px-6 rounded-lg font-bold transition w-full sm:w-auto flex items-center justify-center ${
                        loading
                            ? "bg-blue-200 cursor-not-allowed text-blue-400 border border-blue-100"
                            : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
                    }`}
                >
                    {loading ? (
                        <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            ></path>
                        </svg>
                    ) : (
                        "Confirm Booking"
                    )}
                </button>
            </div>
        </motion.div>
    );
}
