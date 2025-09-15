"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const carList = [
    {
        name: "Honda",
        models: [
            "Civic",
            "Accord",
            "CR-V",
            "HR-V",
            "Pilot",
            "Odyssey",
            "Ridgeline",
            "Insight",
        ],
    },
    {
        name: "Toyota",
        models: [
            "Corolla",
            "Camry",
            "RAV4",
            "Highlander",
            "Tacoma",
            "Prius",
            "Sienna",
            "Tundra",
            "Sequoia",
        ],
    },
    {
        name: "Ford",
        models: [
            "F-150",
            "Escape",
            "Mustang",
            "Explorer",
            "Edge",
            "Super Duty",
            "Bronco",
        ],
    },
    {
        name: "Chevrolet",
        models: [
            "Silverado",
            "Equinox",
            "Malibu",
            "Traverse",
            "Colorado",
            "Bolt EV",
            "Spark",
        ],
    },
    {
        name: "Hyundai",
        models: [
            "Kona",
            "Elantra",
            "Tucson",
            "Santa Fe",
            "Palisade",
            "Ioniq",
            "Veloster",
        ],
    },
    {
        name: "Nissan",
        models: [
            "Rogue",
            "Altima",
            "Sentra",
            "Murano",
            "Frontier",
            "Leaf",
            "Kicks",
            "Titan",
        ],
    },
    { name: "Ram", models: ["1500", "2500", "3500", "ProMaster"] },
    { name: "GMC", models: ["Sierra", "Canyon", "Terrain", "Acadia"] },
    {
        name: "Kia",
        models: ["Sorento", "Sportage", "Telluride", "Forte", "Soul"],
    },
    {
        name: "Mazda",
        models: ["CX-5", "Mazda3", "CX-30", "Mazda6", "CX-9", "MX-5", "CX-50"],
    },
    {
        name: "Volkswagen",
        models: [
            "Jetta",
            "Golf",
            "Tiguan",
            "Passat",
            "ID.4",
            "ID. Buzz",
            "Arteon",
        ],
    },
    {
        name: "BMW",
        models: ["3 Series", "X5", "X3", "5 Series", "X7", "i4", "iX", "i3"],
    },
    {
        name: "Mercedes-Benz",
        models: [
            "C-Class",
            "GLC",
            "E-Class",
            "GLS",
            "EQB",
            "EQS",
            "EQE",
            "EQC",
        ],
    },
    {
        name: "Audi",
        models: [
            "A4",
            "Q5",
            "A3",
            "Q7",
            "e-tron",
            "Q4 e-tron",
            "Q5 e-tron",
            "A6 e-tron",
        ],
    },
    {
        name: "Tesla",
        models: [
            "Model 3",
            "Model Y",
            "Model S",
            "Model X",
            "Cybertruck",
            "Roadster",
            "Model S Plaid",
        ],
    },
    {
        name: "Jeep",
        models: [
            "Grand Cherokee",
            "Cherokee",
            "Wrangler",
            "Compass",
            "Gladiator",
            "Wagoneer",
            "Grand Wagoneer",
            "Renegade",
        ],
    },
    {
        name: "Subaru",
        models: [
            "Outback",
            "Forester",
            "Impreza",
            "Crosstrek",
            "Ascent",
            "WRX",
            "BRZ",
            "Legacy",
        ],
    },
    {
        name: "Chrysler",
        models: [
            "Pacifica",
            "Voyager",
            "Grand Caravan",
            "300",
            "Aspen",
            "Pacifica Hybrid",
        ],
    },
    {
        name: "Buick",
        models: ["Envision", "Encore", "Enclave", "Regal", "Cascada", "Verano"],
    },
    { name: "Lexus", models: ["RX", "NX", "ES", "UX", "GX", "LX", "LC"] },
    {
        name: "Porsche",
        models: [
            "911",
            "Macan",
            "Cayenne",
            "Taycan",
            "718 Cayman",
            "718 Boxster",
            "Panamera",
        ],
    },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => 1990 + i);


export default function VehicleInput({ onNext }) {
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [suggestions, setSuggestions] = useState([]);

    // Brand input handler
    const handleBrandChange = (e) => {
        const input = e.target.value;
        setBrand(input);
        setModel(""); // reset model when brand changes

        if (input.length > 0) {
            const filtered = carList
                .filter((c) =>
                    c.name.toLowerCase().includes(input.toLowerCase())
                )
                .slice(0, 2)
                .map((c) => c.name);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const handleBrandSelect = (name) => {
        setBrand(name);
        setSuggestions([]);
    };

    // Model input handler
    const handleModelChange = (e) => {
        const input = e.target.value;
        setModel(input);

        if (!brand) return; // don't suggest if brand not selected

        const selectedBrand = carList.find((c) => c.name === brand);
        if (selectedBrand) {
            const filtered = selectedBrand.models
                .filter((m) => m.toLowerCase().includes(input.toLowerCase()))
                .slice(0, 2);
            setSuggestions(filtered);
        }
    };

    const handleModelSelect = (m) => {
        setModel(m);
        setSuggestions([]);
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
                    {suggestions.length > 0 && !model && (
                        <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="absolute left-0 right-0 mt-1 bg-gray-800 rounded-lg overflow-hidden z-50"
                        >
                            {suggestions.map((s, i) => (
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
                    {suggestions.length > 0 && model && (
                        <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="absolute left-0 right-0 mt-1 bg-gray-800 rounded-lg overflow-hidden z-50"
                        >
                            {suggestions.map((s, i) => (
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
                    {years.reverse().map((y) => (
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
