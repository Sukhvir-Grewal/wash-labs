"use client";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { isAfter, startOfToday, isWeekend } from "date-fns";
import { useState } from "react";

export default function DateTimePicker({
    dateTime,
    setDateTime,
    onNext,
    onBack,
}) {
    const today = startOfToday();
    const [selectedDay, setSelectedDay] = useState(
        dateTime.date ? new Date(dateTime.date) : undefined
    );
    const [selectedTime, setSelectedTime] = useState(dateTime.time || "");

    // Generate times between 7 AM - 7 PM
    const times = [];
    for (let h = 7; h <= 19; h++) {
        const ampm = h < 12 ? "AM" : "PM";
        const hour = h % 12 === 0 ? 12 : h % 12;
        times.push(`${hour}:00 ${ampm}`);
        times.push(`${hour}:30 ${ampm}`);
    }

    const isValid = selectedDay && selectedTime;

    const handleNext = () => {
        if (isValid) {
            setDateTime({
                date: selectedDay.toISOString().split("T")[0],
                time: selectedTime,
            });
            onNext({
                date: selectedDay.toISOString().split("T")[0],
                time: selectedTime,
            });
        }
    };

    return (
        <motion.div
            key="date-time-step"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
        >
            {/* Calendar */}
            <div>
                <label className="block text-sm mb-2 text-gray-300">
                    Select Date
                </label>
                <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    disabled={(date) =>
                        !isWeekend(date) ||
                        (!isAfter(date, today) &&
                            date.toDateString() !== today.toDateString())
                    }
                    modifiers={{
                        weekend: (date) => isWeekend(date),
                    }}
                    modifiersClassNames={{
                        weekend: "text-orange-500 font-bold",
                        selected:
                            "bg-orange-500 text-white font-bold rounded-full",
                    }}
                />
            </div>

            {/* Time Picker */}
            <div>
                <label className="block text-sm mb-2 text-gray-300">
                    Select Time
                </label>

                <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#333333] border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                    <option value="">-- Select Time --</option>
                    {times.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="py-3 px-6 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold transition"
                >
                    Back
                </button>

                <button
                    type="button"
                    disabled={!isValid}
                    onClick={handleNext}
                    className={`py-3 px-6 rounded-lg font-semibold transition ${
                        isValid
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-gray-600 cursor-not-allowed"
                    }`}
                >
                    Next
                </button>
            </div>
        </motion.div>
    );
}

// Helpers to handle iPhone time input conversion
function convertTo12Hour(time24) {
    let [hour, minute] = time24.split(":");
    hour = parseInt(hour, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
}

function convertTo24Hour(time12) {
    if (!time12) return "";
    const [time, modifier] = time12.split(" ");
    let [hours, minutes] = time.split(":");
    if (modifier === "PM" && hours !== "12") {
        hours = String(parseInt(hours, 10) + 12);
    }
    if (modifier === "AM" && hours === "12") {
        hours = "00";
    }
    return `${hours.padStart(2, "0")}:${minutes}`;
}
