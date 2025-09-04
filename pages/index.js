import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion } from "framer-motion";

export default function BookingPage() {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 6 || day === 0; // Saturday or Sunday
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, date, time }),
    });

    if (res.ok) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold mb-6 text-blue-800 drop-shadow-lg"
      >
        Book Your Detailing Appointment
      </motion.h1>

      {submitted ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="p-6 bg-green-100 rounded-2xl shadow-lg"
        >
          <h2 className="text-xl font-semibold text-green-800">
            ✅ Booking Sent! We’ll confirm with you soon.
          </h2>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg space-y-6"
        >
          <div>
            <label className="block font-medium text-gray-700">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Your Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="e.g. 647-123-4567"
            />
          </div>

          <div className="flex flex-col items-center">
            <label className="block font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <Calendar
              value={date}
              onChange={setDate}
              className="rounded-xl shadow-lg p-2"
              tileDisabled={({ date }) => !isWeekend(date)}
            />
            <p className="mt-2 text-sm text-gray-500 italic">
              (Bookings available only on Saturday & Sunday)
            </p>
          </div>

          <div>
            <label className="block font-medium text-gray-700">
              Select Time Slot
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">-- Choose a time --</option>
              <option>9:00 AM</option>
              <option>11:00 AM</option>
              <option>1:00 PM</option>
              <option>3:00 PM</option>
              <option>5:00 PM</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:bg-blue-700 transition"
          >
            Confirm Booking
          </motion.button>
        </motion.form>
      )}
    </div>
  );
}
