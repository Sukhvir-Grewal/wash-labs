"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function UserInfo({ userInfo, setUserInfo, onNext, onBack }) {
    const [touched, setTouched] = useState({
        name: false,
        email: false,
        phone: false,
    });

    const isValidEmail =
        /^[^\s@]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/.test(
            userInfo.email
        );

    const isValidPhone =
        /^\(\d{3}\) \d{3}-\d{4}$/.test(userInfo.phone) &&
        !!userInfo.countryCode;

    const isValidName = userInfo.name.trim().length > 1;

    const isFormValid = isValidEmail && isValidPhone && isValidName;

    function formatPhoneNumber(value) {
        if (!value) return value;
        const phoneNumber = value.replace(/\D/g, "");
        const phoneNumberLength = phoneNumber.length;

        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
            3,
            6
        )}-${phoneNumber.slice(6, 10)}`;
    }

    return (
        <motion.div
            key="user-step"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
        >
            {/* Name */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">Name</label>
                <input
                    type="text"
                    placeholder="Your Name"
                    value={userInfo.name}
                    onChange={(e) =>
                        setUserInfo((prev) => ({
                            ...prev,
                            name: e.target.value,
                        }))
                    }
                    onBlur={() =>
                        setTouched((prev) => ({ ...prev, name: true }))
                    }
                    className={`w-full px-4 py-3 rounded-lg bg-white border 
                        ${
                            !isValidName && touched.name
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        }
                        focus:ring-2 outline-none text-gray-900`}
                    required
                />
                {!isValidName && touched.name && (
                    <p className="text-red-500 text-sm mt-1">
                        Enter a valid name
                    </p>
                )}
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">Email</label>
                <input
                    type="email"
                    placeholder="Your Email"
                    value={userInfo.email}
                    onChange={(e) =>
                        setUserInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                        }))
                    }
                    onBlur={() =>
                        setTouched((prev) => ({ ...prev, email: true }))
                    }
                    className={`w-full px-4 py-3 rounded-lg bg-white border 
                        ${
                            !isValidEmail && touched.email
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        }
                        focus:ring-2 outline-none text-gray-900`}
                    required
                />
                {!isValidEmail && touched.email && (
                    <p className="text-red-500 text-sm mt-1">
                        Enter a valid email
                    </p>
                )}
            </div>

            {/* Phone */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">Phone</label>
                <div className="flex gap-2">
                    <select
                        value={userInfo.countryCode || "+1"}
                        onChange={(e) =>
                            setUserInfo((prev) => ({
                                ...prev,
                                countryCode: e.target.value,
                            }))
                        }
                        className="px-3 py-3 rounded-lg bg-white border border-blue-200 
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    >
                        <option value="+1">+1 (CA/US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+91">+91 (IN)</option>
                    </select>

                    <input
                        type="tel"
                        placeholder="(123) 456-7890"
                        value={userInfo.phone}
                        onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setUserInfo((prev) => ({
                                ...prev,
                                phone: formatted,
                            }));
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                        className={`flex-1 px-4 py-3 rounded-lg bg-white border 
                            ${
                                !isValidPhone && touched.phone
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                            }
                            focus:ring-2 outline-none text-gray-900`}
                        required
                    />
                </div>
                {!isValidPhone && touched.phone && (
                    <p className="text-red-500 text-sm mt-1">Enter a valid phone number</p>
                )}
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">Additional Notes</label>
                <textarea
                    rows="3"
                    placeholder="Any extra info..."
                    value={userInfo.message}
                    onChange={(e) =>
                        setUserInfo((prev) => ({
                            ...prev,
                            message: e.target.value,
                        }))
                    }
                    className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                ></textarea>
            </div>

            {/* Buttons */}
            <div className="flex justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="py-3 px-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold transition border border-blue-200"
                >
                    Back
                </button>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={!isFormValid}
                    className={`py-3 px-6 rounded-lg font-semibold transition border 
                        ${
                            isFormValid
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                : "bg-gray-200 cursor-not-allowed text-gray-400 border-blue-100"
                        }`}
                >
                    Review Booking
                </button>
            </div>
        </motion.div>
    );
}
