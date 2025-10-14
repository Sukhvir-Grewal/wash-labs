"use client";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { isBefore, startOfToday } from "date-fns";
import { useState } from "react";

export default function DateTimePicker({
    dateTime,
    setDateTime,
    onNext,
    onBack,
}) {
    const today = startOfToday();
    // Do not select any date by default
    const [selectedDay, setSelectedDay] = useState(undefined);
    const [selectedTime, setSelectedTime] = useState(dateTime.time || "");
    const [showValidation, setShowValidation] = useState(false);

    // Static times for each day (easy to read)
    const STATIC_TIMES = {
        // 0 = Sunday, 1 = Monday, ...
        0: [ // Sunday
            "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
            "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
            "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
            "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"
        ],
        1: [ // Monday
            "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM"
        ],
        2: [], // Tuesday (blocked)
        3: [ // Wednesday
            "7:00 AM", "8:00 AM", "8:30 AM"
        ],
        4: [ // Thursday
            "7:00 AM", "8:00 AM", "8:30 AM"
        ],
        5: [], // Friday (blocked)
        6: [ // Saturday
            "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
            "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", 
            "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
            "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"
        ]
    };

    let times = [];
    if (selectedDay) {
        const day = selectedDay.getDay();
        times = STATIC_TIMES[day] || [];
    }

    const isValid = selectedDay && selectedTime;

    const handleNext = () => {
        if (!isValid) {
            setShowValidation(true);
            return;
        }

        const formattedDate = selectedDay.toISOString().split("T")[0];
        setShowValidation(false);
        setDateTime({
            date: formattedDate,
            time: selectedTime,
        });
        onNext({
            date: formattedDate,
            time: selectedTime,
        });
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
                <label className="block text-sm mb-2 text-gray-700">
                    Select Date
                </label>
                <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={(day) => {
                        setSelectedDay(day);
                        if (day && selectedTime) {
                            setShowValidation(false);
                        }
                    }}
                    disabled={date => {
                        // Block past days, current day, Tuesday (2), and Friday (5)
                        if (isBefore(date, today)) return true;
                        if (date.toDateString() === today.toDateString()) return true;
                        const day = date.getDay();
                        if (day === 2 || day === 5) return true;
                        return false;
                    }}
                    weekStartsOn={1}
                    modifiers={{}}
                    modifiersClassNames={{
                        selected: "bg-blue-600 text-white font-bold rounded-full",
                    }}
                    className="bg-white rounded-lg p-2 border border-blue-100"
                    style={{
                        color: "#222",
                    }}
                />
                <p className="text-xs text-gray-500 mt-2">
                    Bookings start from today onward. We&apos;ll confirm any same-day
                    requests as soon as possible.
                </p>
                {showValidation && !selectedDay && (
                    <p className="text-sm text-red-600 mt-2">
                        Please choose a future appointment date.
                    </p>
                )}
            </div>

            {/* Time Picker */}
            <div>
                <label className="block text-sm mb-2 text-gray-700">
                    Select Time
                </label>

                <select
                    value={selectedTime}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTime(value);
                        if (value && selectedDay) {
                            setShowValidation(false);
                        }
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                >
                    <option value="">-- Select Time --</option>
                    {times.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                    Times are available in 30-minute intervals between 7:00 AM and
                    7:00 PM.
                </p>
                {showValidation && !selectedTime && (
                    <p className="text-sm text-red-600 mt-2">
                        Please pick a time slot to continue.
                    </p>
                )}
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
                    onClick={handleNext}
                    aria-disabled={!isValid}
                    className={`py-3 px-6 rounded-lg font-semibold transition border ${
                        isValid
                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                            : "bg-gray-200 cursor-not-allowed text-gray-400 border-blue-100"
                    }`}
                >
                    Next
                </button>
            </div>
        </motion.div>
    );
}
