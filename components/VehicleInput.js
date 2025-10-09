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
        const input = e.target.value;
        setBrand(input);
        setModel(""); // reset model when brand changes
        setModelSuggestions([]);

        if (input.trim().length > 0) {
            const filtered = carList
                .filter((c) =>
                    c.name.toLowerCase().startsWith(input.toLowerCase())
                )
                .slice(0, 5)
                .map((c) => c.name);
            setBrandSuggestions(filtered);
        } else {
            setBrandSuggestions([]);
        }
    };

    // Handle suggestion fill on Tab or click/tap
    const handleBrandInputKeyDown = (e) => {
        if (
            brandSuggestions.length > 0 &&
            (e.key === "Tab" || e.key === "ArrowRight")
        ) {
            e.preventDefault();
            setBrand(brandSuggestions[0]);
            setBrandSuggestions([]);
        }
    };

    const handleBrandSuggestionClick = (name) => {
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
                <label className="block text-sm mb-1 text-gray-700">
                    Car Brand
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={brand}
                        onChange={handleBrandChange}
                        onKeyDown={handleBrandInputKeyDown}
                        placeholder="Enter Car Brand"
                        className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        autoComplete="off"
                    />
                    <AnimatePresence>
                        {brandSuggestions.length > 0 && !model && (
                            <motion.ul
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute left-0 right-0 mt-1 bg-white rounded-lg overflow-hidden z-50 border border-blue-200"
                            >
                                {brandSuggestions.map((s, i) => (
                                    <li
                                        key={i}
                                        onMouseDown={() => handleBrandSuggestionClick(s)}
                                        onTouchStart={() => handleBrandSuggestionClick(s)}
                                        className="px-4 py-2 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition text-black"
                                    >
                                        {/* Show the full suggestion, highlight the rest */}
                                        <span className="font-semibold text-black">{brand}</span>
                                        <span className="text-blue-600">
                                            {s.slice(brand.length)}
                                        </span>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Model Input */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">
                    Car Model
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={model}
                        onChange={handleModelChange}
                        placeholder={brand ? "Enter Model" : "Select Brand First"}
                        disabled={!brand}
                        className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 disabled:bg-gray-100"
                    />
                    <AnimatePresence>
                        {modelSuggestions.length > 0 && model && (
                            <motion.ul
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute left-0 right-0 mt-1 bg-white rounded-lg overflow-hidden z-50 border border-blue-200"
                            >
                                {modelSuggestions.map((s, i) => (
                                    <li
                                        key={i}
                                        onMouseDown={() => handleModelSelect(s)}
                                        onTouchStart={() => handleModelSelect(s)}
                                        className="px-4 py-2 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition text-black"
                                    >
                                        <span className="font-semibold text-black">{model}</span>
                                        <span className="text-blue-600">
                                            {s.slice(model.length)}
                                        </span>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Year Input */}
            <div>
                <label className="block text-sm mb-1 text-gray-700">
                    Car Year
                </label>
                <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
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
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-200 cursor-not-allowed text-gray-400"
                }`}
            >
                Next
            </button>
        </div>
    );
}
