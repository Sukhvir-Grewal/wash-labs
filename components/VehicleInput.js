"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import carList from "./carList";

const currentYear = new Date().getFullYear();
const years = Array.from(
    { length: currentYear - 1990 + 1 },
    (_, i) => 1990 + i
);

export default function VehicleInput({ onNext }) {
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [brandSuggestions, setBrandSuggestions] = useState([]);
    const [modelSuggestions, setModelSuggestions] = useState([]);

    // Brand input handler
    const handleBrandChange = (e) => {
        const input = e.target.value.trim();
        setBrand(e.target.value);
        setModel(""); // reset model when brand changes
        setModelSuggestions([]);

        if (input.length > 0) {
            const filtered = carList
                .filter((c) =>
                    c.name.toLowerCase().includes(input.toLowerCase())
                )
                .slice(0, 5)
                .map((c) => c.name);
            setBrandSuggestions(filtered);
        } else {
            setBrandSuggestions([]);
        }
    };

    const handleBrandSelect = (name) => {
        setBrand(name);
        setBrandSuggestions([]);
    };

    // Model input handler
    const handleModelChange = (e) => {
        const input = e.target.value.trim();
        setModel(e.target.value);

        if (!brand) return;

        const selectedBrand = carList.find((c) => c.name === brand);
        if (selectedBrand) {
            const filtered = selectedBrand.models
                .filter((m) => m.toLowerCase().includes(input.toLowerCase()))
                .slice(0, 5);
            setModelSuggestions(filtered);
        }
    };

    const handleModelSelect = (m) => {
        setModel(m);
        setModelSuggestions([]);
    };

    const canProceed = brand && model && year;

    return (
        <div className="relative space-y-4">
            {/* Brand Input */}
            <div>
                <label className="block text-sm mb-1 text-gray-200">
                    Car Brand
                </label>
                <input
                    type="text"
                    value={brand}
                    onChange={handleBrandChange}
                    placeholder="Enter Car Brand"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <AnimatePresence>
                    {brandSuggestions.length > 0 && !model && (
                        <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="absolute left-0 right-0 mt-1 bg-gray-800 rounded-lg overflow-hidden z-50"
                        >
                            {brandSuggestions.map((s, i) => (
                                <li
                                    key={i}
                                    onClick={() => handleBrandSelect(s)}
                                    className="px-4 py-2 cursor-pointer hover:bg-orange-500 hover:text-black transition"
                                >
                                    {s}
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>

            {/* Model Input */}
            <div>
                <label className="block text-sm mb-1 text-gray-200">
                    Car Model
                </label>
                <input
                    type="text"
                    value={model}
                    onChange={handleModelChange}
                    placeholder={brand ? "Enter Model" : "Select Brand First"}
                    disabled={!brand}
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-700"
                />
                <AnimatePresence>
                    {modelSuggestions.length > 0 && model && (
                        <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="absolute left-0 right-0 mt-1 bg-gray-800 rounded-lg overflow-hidden z-50"
                        >
                            {modelSuggestions.map((s, i) => (
                                <li
                                    key={i}
                                    onClick={() => handleModelSelect(s)}
                                    className="px-4 py-2 cursor-pointer hover:bg-orange-500 hover:text-black transition"
                                >
                                    {s}
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>

            {/* Year Input */}
            <div>
                <label className="block text-sm mb-1 text-gray-200">
                    Car Year
                </label>
                <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                    <option value="">Select Year</option>
                    {years
                        .slice()
                        .reverse()
                        .map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                </select>
            </div>

            {/* Next Button */}
            <button
                onClick={() =>
                    canProceed && onNext({ car: `${brand} ${model}`, year })
                }
                disabled={!canProceed}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                    canProceed
                        ? "bg-orange-500 hover:bg-orange-600 text-black"
                        : "bg-gray-600 cursor-not-allowed text-gray-300"
                }`}
            >
                Next
            </button>
        </div>
    );
}
