"use client";
import { motion } from "framer-motion";

export default function ReviewInfo({
    service,
    vehicle,
    userInfo,
    dateTime,
    location, // added
    onBack,
    onSubmit,
    totalPrice,
    status,
    isSubmitting,
}) {
    // Price formatting
    let priceContent;
    if (typeof totalPrice === "number") {
        const orig = service?.originalPrice;
        priceContent = (
            <span className="font-bold text-lg sm:text-xl">
                {typeof orig === "number" ? (
                    <>
                        <span className="line-through text-gray-400 mr-2">${orig}</span>
                        <span className="text-blue-600">${totalPrice}</span>
                        <span className="ml-2 text-xs text-gray-500">(30% off)</span>
                    </>
                ) : (
                    <span className="text-blue-600">${totalPrice}</span>
                )}
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

    return (
        <motion.div
            key="review-step"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full"
        >
            <h4 className="text-lg sm:text-xl font-bold mb-6 text-center mt-2 tracking-tight" style={{ color: "#000" }}>
                Review Your Booking
            </h4>

            {/* Info List */}
            <div className="flex flex-col gap-4 mb-8">
                {(() => {
                    const vehicleDisplay = [
                        userInfo?.vehicleYear || (vehicle?.year && vehicle.year !== "NA" ? vehicle.year : null),
                        vehicle?.name
                    ].filter(Boolean).join(" ");

                    const items = [
                        { label: "Service", value: service.title },
                        { label: "Price", value: priceContent, isPrice: true },
                        { label: "Vehicle", value: vehicleDisplay },
                        location?.address && { label: "Address", value: location.address }, // added
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
                    ].filter(Boolean);

                    return items.map((item, idx) => (
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
                    ));
                })()}
            </div>

            {/* Sticky Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between bg-white p-4 border-t border-blue-100">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className={`py-3 px-6 rounded-lg font-semibold transition w-full sm:w-auto ${
                        isSubmitting
                            ? "bg-gray-200 cursor-not-allowed text-gray-400 border border-blue-100"
                            : "bg-white hover:bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                >
                    Back
                </button>

                <button
                    type="submit"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className={`py-3 px-6 rounded-lg font-bold transition w-full sm:w-auto flex items-center justify-center ${
                        isSubmitting
                            ? "bg-blue-200 cursor-not-allowed text-blue-400 border border-blue-100"
                            : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600"
                    }`}
                >
                    {isSubmitting ? (
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
            {status?.type === "error" && status.message && (
                <p className="mt-4 text-center text-red-600 text-sm">
                    {status.message}
                </p>
            )}
        </motion.div>
    );
}
