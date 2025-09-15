"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VehicleInput from "./VehicleInput";
import DateTimePicker from "./DateTimePicker";
import UserInfo from "./UserInfo";
import ReviewInfo from "./ReviewInfo";

export default function Booking({ service, onClose }) {
    const [step, setStep] = useState(1);
    const [vehicle, setVehicle] = useState({ name: "", year: "" });
    const [dateTime, setDateTime] = useState({ date: "", time: "" });
    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
        countryCode: "+1",
    });

    const handleNextVehicle = ({ car, year }) => {
        setVehicle({ name: car, year });
        setStep(2);
    };

    const handleNextDateTime = ({ date, time }) => {
        setDateTime({ date, time });
        setStep(3);
    };

    const handleNextUserInfo = () => setStep(4);
    const handleBack = () => setStep((prev) => prev - 1);

    const handleSubmit = async () => {
        const bookingData = { service, vehicle, dateTime, userInfo };

        try {
            const res = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            if (!res.ok) throw new Error("Failed to send booking");

            alert(
                "✅ Booking submitted successfully! You’ll get a call soon to confirm."
            );
            onClose();
        } catch (error) {
            console.error("Error submitting booking:", error);
            alert(
                "❌ Something went wrong while submitting your booking. Please try again."
            );
        }
    };

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={service.title + step}
                    className="relative bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-orange-500 text-xl font-bold hover:text-orange-400"
                    >
                        ✕
                    </button>

                    <h3 className="text-2xl font-semibold mb-6 text-orange-400">
                        Book: {service.title}
                    </h3>

                    {/* Step 1: Vehicle */}
                    {step === 1 && <VehicleInput onNext={handleNextVehicle} />}

                    {/* Step 2: Date & Time */}
                    {step === 2 && (
                        <DateTimePicker
                            dateTime={dateTime}
                            setDateTime={setDateTime}
                            onNext={handleNextDateTime}
                            onBack={handleBack}
                        />
                    )}

                    {/* Step 3: User Info */}
                    {step === 3 && (
                        <UserInfo
                            userInfo={userInfo}
                            setUserInfo={setUserInfo}
                            onNext={handleNextUserInfo}
                            onBack={handleBack}
                        />
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <ReviewInfo
                            service={service}
                            vehicle={vehicle}
                            userInfo={userInfo}
                            dateTime={dateTime}
                            onBack={handleBack}
                            onSubmit={handleSubmit}
                        />
                    )}

                    {/* Step 5: Confirmation */}
                    {step === 5 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
                            <h4 className="text-2xl font-bold text-green-400">
                                Booking Confirmed!
                            </h4>
                            <p className="text-gray-200 text-lg">
                                Thank you, {userInfo.name}. <br />
                                You will receive a call soon to confirm your
                                booking details.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 py-3 px-6 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
