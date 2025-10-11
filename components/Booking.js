"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VehicleInput from "./VehicleInput";
import DateTimePicker from "./DateTimePicker";
import UserInfo from "./UserInfo";
import ReviewInfo from "./ReviewInfo";
import Location from "./Location"; // added

export default function Booking({ service, onClose }) {
    const [step, setStep] = useState(1);
    const [vehicle, setVehicle] = useState({ name: "", year: "" });
    const [dateTime, setDateTime] = useState({ date: "", time: "" });
    const [location, setLocation] = useState({ address: "", lat: null, lon: null }); // added
    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
        countryCode: "+1",
    });
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getTotalPrice = () =>
        typeof service?.totalPrice === "number"
            ? service.totalPrice
            : typeof service?.basePrice === "number"
            ? service.basePrice
            : null;
    const totalPriceValue = getTotalPrice();

    const handleNextVehicle = ({ car, year }) => {
        setVehicle({ name: car, year });
        setStep(2);
    };

    const handleNextDateTime = ({ date, time }) => {
        setDateTime({ date, time });
        setStep(3);
    };

    const handleNextLocation = ({ address, lat, lon }) => { // added
        setLocation({ address, lat, lon });
        setStep(4);
    };

    const handleNextUserInfo = () => setStep(5); // shifted to step 5
    const handleBack = () => setStep((prev) => prev - 1);

    const resetAndClose = () => {
        setStep(1);
        setVehicle({ name: "", year: "" });
        setDateTime({ date: "", time: "" });
        setLocation({ address: "", lat: null, lon: null }); // reset
        setUserInfo({
            name: "",
            email: "",
            phone: "",
            message: "",
            countryCode: "+1",
        });
        setSubmissionStatus(null);
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmit = async () => {
        const computedTotal = getTotalPrice();
        const bookingData = {
            service: { ...service, totalPrice: computedTotal },
            vehicle,
            dateTime,
            location, // include address
            userInfo,
        };

        try {
            setIsSubmitting(true);
            setSubmissionStatus(null);
            const res = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message || "Failed to send booking");
            }

            setSubmissionStatus({
                type: "success",
                message:
                    data.message ||
                    "Booking submitted successfully! You’ll get a call soon to confirm.",
            });
            setStep(6); // shifted confirmation to step 6
        } catch (error) {
            console.error("Error submitting booking:", error);
            setSubmissionStatus({
                type: "error",
                message:
                    error.message ||
                    "Something went wrong while submitting your booking. Please try again.",
            });
            setStep(5); // stay on review
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center 
             bg-black/20 backdrop-blur-md 
             z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={service.title + step}
                    className="relative bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-blue-100"
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    {/* Close Button */}
                    <button
                        onClick={resetAndClose}
                        className="absolute top-4 right-4 text-blue-600 text-xl font-bold hover:text-blue-500"
                    >
                        ✕
                    </button>

                    {/* Only show heading for steps except review */}
                    {step !== 5 && ( // updated (review is step 5)
                        <h3
                            className="text-2xl font-semibold mb-6 text-neutral-950"
                            style={{ color: "#000" }}
                        >
                            {service.title}
                        </h3>
                    )}

                    {/* Step 1: Vehicle */}
                    {step === 1 && <VehicleInput onNext={handleNextVehicle} />}

                    {/* Step 2: Date & Time */}
                    {step === 2 && (
                        <DateTimePicker
                            dateTime={dateTime}
                            setDateTime={setDateTime}
                            onNext={handleNextDateTime}
                            onBack={handleBack}
                            durationMinutes={service?.durationMinutes ?? 60}
                        />
                    )}

                    {/* Step 3: Location (new) */}
                    {step === 3 && (
                        <Location
                            location={location}
                            onNext={handleNextLocation}
                            onBack={handleBack}
                        />
                    )}

                    {/* Step 4: User Info */}
                    {step === 4 && (
                        <UserInfo
                            userInfo={userInfo}
                            setUserInfo={setUserInfo}
                            onNext={handleNextUserInfo}
                            onBack={handleBack}
                        />
                    )}

                    {/* Step 5: Review */}
                    {step === 5 && (
                        <ReviewInfo
                            service={service}
                            vehicle={vehicle}
                            userInfo={userInfo}
                            dateTime={dateTime}
                            location={location} // pass location for review
                            onBack={handleBack}
                            onSubmit={handleSubmit}
                            totalPrice={totalPriceValue}
                            status={submissionStatus}
                            isSubmitting={isSubmitting}
                        />
                    )}

                    {/* Step 6: Confirmation */}
                    {step === 6 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
                            <h4 className="text-2xl font-bold text-blue-600">
                                Booking Confirmed!
                            </h4>
                            <p className="text-gray-700 text-lg">
                                Thank you, {userInfo.name}. <br />
                                You will receive a call soon to confirm your
                                booking details.
                            </p>
                            {typeof totalPriceValue === "number" && (
                                <p className="text-base text-gray-700">
                                    Estimated total:{" "}
                                    <span className="font-semibold text-blue-600">
                                        ${totalPriceValue}
                                    </span>
                                </p>
                            )}
                            {submissionStatus?.message && (
                                <p className="text-sm text-blue-600 max-w-md">
                                    {submissionStatus.message}
                                </p>
                            )}
                            <button
                                onClick={resetAndClose}
                                className="mt-6 py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
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
