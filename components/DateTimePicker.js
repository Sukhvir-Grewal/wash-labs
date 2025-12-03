"use client";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { isBefore, startOfToday, addMinutes } from "date-fns";
import { useState, useEffect, useMemo } from "react";

export default function DateTimePicker({
    dateTime,
    setDateTime,
    onNext,
    onBack,
    durationMinutes = 60,
}) {
    const today = startOfToday();
    const initialDay = useMemo(() => {
        if (!dateTime?.date) return undefined;
        const pieces = dateTime.date.split("-").map(Number);
        if (pieces.length === 3 && pieces.every((n) => Number.isInteger(n))) {
            return new Date(pieces[0], pieces[1] - 1, pieces[2]);
        }
        return undefined;
    }, [dateTime?.date]);
    const [selectedDay, setSelectedDay] = useState(initialDay);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showValidation, setShowValidation] = useState(false);

    // Business rules
    const BUSINESS_START_HOUR = 8; // 8:00 AM
    const BUSINESS_END_HOUR = 18; // 6:00 PM
    const SLOT_INTERVAL_MIN = 30; // minutes
    const BUFFER_MINUTES = 30; // buffer before/after existing appointments

    const [occupiedSlots, setOccupiedSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => new Date());
    const [unavailableSet, setUnavailableSet] = useState(new Set());

    useEffect(() => {
        if (!selectedDay && initialDay) {
            setSelectedDay(initialDay);
        }
    }, [initialDay, selectedDay]);

    // When a date is selected, query the server for occupied slots for that day
    useEffect(() => {
        if (!selectedDay) return;
        const dateStr = selectedDay.toISOString().split('T')[0];
        let cancelled = false;
        async function load() {
            setLoadingSlots(true);
            try {
                const resp = await fetch(`/api/availability?date=${encodeURIComponent(dateStr)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (!cancelled) setOccupiedSlots(Array.isArray(data.occupied) ? data.occupied : []);
                } else {
                    if (!cancelled) setOccupiedSlots([]);
                }
            } catch (e) {
                if (!cancelled) setOccupiedSlots([]);
            } finally {
                if (!cancelled) setLoadingSlots(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [selectedDay]);

    // Prefetch availability for the visible month so we can disable full days with no slots
    useEffect(() => {
        if (!visibleMonth) return;
        let cancelled = false;
        async function loadMonth() {
            const year = visibleMonth.getFullYear();
            const month = visibleMonth.getMonth();
            const first = new Date(year, month, 1);
            const last = new Date(year, month + 1, 0);
            const days = last.getDate();
            const prefs = [];
            for (let d = 1; d <= days; d++) {
                const dt = new Date(year, month, d);
                // skip past days
                if (isBefore(dt, today) || dt.toDateString() === today.toDateString()) {
                    prefs.push({ date: dt.toISOString().split('T')[0], available: false });
                    continue;
                }
                const day = dt.getDay();
                if (day === 2 || day === 5) {
                    prefs.push({ date: dt.toISOString().split('T')[0], available: false });
                    continue;
                }
                prefs.push({ date: dt.toISOString().split('T')[0], available: null });
            }
            // Parallel fetch availability for dates with available===null
            await Promise.all(prefs.map(async (p) => {
                if (p.available !== null) return;
                try {
                    const resp = await fetch(`/api/availability?date=${encodeURIComponent(p.date)}`);
                    if (!resp.ok) { p.available = false; return; }
                    const data = await resp.json();
                    const occupied = Array.isArray(data.occupied) ? data.occupied : [];
                    // compute candidate slots for that date and see if any fits
                    const dtParts = p.date.split('-').map(Number);
                    const dtObj = new Date(dtParts[0], dtParts[1]-1, dtParts[2]);
                    // build candidate slots quickly (same logic as below)
                    let found = false;
                    for (let hour = BUSINESS_START_HOUR; hour <= BUSINESS_END_HOUR; hour++) {
                        for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MIN) {
                            const slotStart = new Date(dtObj);
                            slotStart.setHours(hour, minute, 0, 0);
                            const slotEnd = addMinutes(slotStart, durationMinutes);
                            if (slotEnd.getHours() > BUSINESS_END_HOUR || (slotEnd.getHours() === BUSINESS_END_HOUR && slotEnd.getMinutes() > 0)) continue;
                            // check conflicts
                            let ok = true;
                            for (const occ of occupied) {
                                const occStart = new Date(occ.start);
                                const occEnd = new Date(occ.end);
                                const occStartWithBuffer = new Date(occStart.getTime() - BUFFER_MINUTES * 60 * 1000);
                                const occEndWithBuffer = new Date(occEnd.getTime() + BUFFER_MINUTES * 60 * 1000);
                                if (slotStart < occEndWithBuffer && slotEnd > occStartWithBuffer) { ok = false; break; }
                            }
                            if (ok) { found = true; break; }
                        }
                        if (found) break;
                    }
                    p.available = found;
                } catch (e) {
                    p.available = false;
                }
            }));
            if (cancelled) return;
            const disabledSet = new Set(prefs.filter(p => !p.available).map(p => p.date));
            setUnavailableSet(disabledSet);
        }
        // only prefetch when durationMinutes is defined
        loadMonth();
        return () => { cancelled = true; };
    }, [visibleMonth, durationMinutes]);

    const to24HourString = (dateObj) =>
        dateObj.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

    // Generate candidate slots between business hours
    const candidateTimes = useMemo(() => {
        if (!selectedDay) return [];
        const day = selectedDay.getDay();
        // Exclude Tuesdays (2) and Fridays (5)
        if (day === 2 || day === 5) return [];
        const slots = [];
        for (let hour = BUSINESS_START_HOUR; hour <= BUSINESS_END_HOUR; hour++) {
            for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MIN) {
                const slotStart = new Date(selectedDay);
                slotStart.setHours(hour, minute, 0, 0);
                const slotEnd = addMinutes(slotStart, SLOT_INTERVAL_MIN);
                // Only include start times where the appointment would end within business hours
                if (slotEnd.getHours() > BUSINESS_END_HOUR || (slotEnd.getHours() === BUSINESS_END_HOUR && slotEnd.getMinutes() > 0)) continue;
                const label = slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                slots.push({ label, iso: slotStart.toISOString(), start: slotStart, end: slotEnd });
            }
        }
        return slots;
    }, [selectedDay]);

    // Filter candidate times against occupiedSlots and requested duration (prop)
    let times = [];
    if (selectedDay) {
        const duration = Number((typeof durationMinutes === 'number' ? durationMinutes : 60));
        times = candidateTimes.filter((slot) => {
            const slotStart = new Date(slot.iso);
            const slotEnd = addMinutes(slotStart, duration);
            if (slotEnd.getHours() > BUSINESS_END_HOUR || (slotEnd.getHours() === BUSINESS_END_HOUR && slotEnd.getMinutes() > 0)) return false;
            for (const occ of occupiedSlots) {
                const occStart = new Date(occ.start);
                const occEnd = new Date(occ.end);
                const occStartWithBuffer = new Date(occStart.getTime() - BUFFER_MINUTES * 60 * 1000);
                const occEndWithBuffer = new Date(occEnd.getTime() + BUFFER_MINUTES * 60 * 1000);
                if (slotStart < occEndWithBuffer && slotEnd > occStartWithBuffer) return false;
            }
            return true;
        });
    }

    useEffect(() => {
        if (!selectedDay || !times.length || selectedSlot) return;
        if (dateTime?.timeValue) {
            const match = times.find((slot) => to24HourString(slot.start) === dateTime.timeValue);
            if (match) {
                setSelectedSlot(match);
                return;
            }
        }
        if (dateTime?.time) {
            const match = times.find((slot) => slot.label === dateTime.time);
            if (match) {
                setSelectedSlot(match);
            }
        }
    }, [times, selectedDay, selectedSlot, dateTime?.timeValue, dateTime?.time]);

    const isValid = Boolean(selectedDay && selectedSlot);

    const handleNext = () => {
        if (!isValid) {
            setShowValidation(true);
            return;
        }

        const formattedDate = selectedDay.toISOString().split("T")[0];
        setShowValidation(false);
        const slot = selectedSlot;
        const timeLabel = slot?.label || "";
        const timeValue = slot ? to24HourString(slot.start) : "";
        const timeISO = slot ? slot.start.toISOString() : "";
        setDateTime({
            date: formattedDate,
            time: timeLabel,
            timeValue,
            timeISO,
        });
        onNext({
            date: formattedDate,
            time: timeLabel,
            timeValue,
            timeISO,
        });
    };

    return (
        <motion.div
            key="date-time-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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
                        if (day && selectedDay && day.toDateString() !== selectedDay.toDateString()) {
                            setSelectedSlot(null);
                        }
                        setSelectedDay(day);
                        if (day && selectedSlot) {
                            setShowValidation(false);
                        }
                    }}
                    disabled={date => {
                        // Block past days, current day, Tuesday (2), and Friday (5)
                        if (isBefore(date, today)) return true;
                        if (date.toDateString() === today.toDateString()) return true;
                        const day = date.getDay();
                        if (day === 2 || day === 5) return true;
                        const dateStr = date.toISOString().split('T')[0];
                        if (unavailableSet && unavailableSet.has && unavailableSet.has(dateStr)) return true;
                        return false;
                    }}
                    onMonthChange={(month) => setVisibleMonth(month)}
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

                                {/* Time slots as clickable buttons */}
                                <div className="grid grid-cols-3 gap-2">
                                        {loadingSlots ? (
                                            <div className="text-sm text-gray-500">Loading...</div>
                                        ) : times.length === 0 ? (
                                            <div className="text-sm text-gray-500">No candidate slots for this day.</div>
                                        ) : (
                                            times.map((slot) => {
                                                const isSelected = selectedSlot?.iso === slot.iso;
                                                return (
                                                    <button
                                                        key={slot.iso}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSlot(slot);
                                                            setShowValidation(false);
                                                        }}
                                                        className={`py-2 px-3 rounded-full text-sm font-medium transition ${
                                                            isSelected
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-white text-gray-900 hover:bg-blue-50 border border-blue-100'
                                                        }`}
                                                    >
                                                        {slot.label}
                                                    </button>
                                                );
                                            })
                                        )}
                                </div>

                {showValidation && !selectedSlot && (
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
