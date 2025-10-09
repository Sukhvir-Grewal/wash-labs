"use client";
import { useState } from "react";

export default function Contact() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false); // ✅ track sending state

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("");
        setLoading(true); // ✅ disable button + show loading

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (res.ok) {
                setStatus("✅ Message sent successfully!");
                setFormData({ name: "", email: "", message: "" });
            } else {
                setStatus(data.message || "❌ Something went wrong.");
            }
        } catch (err) {
            setStatus("❌ Failed to send. Please try again.");
        } finally {
            setLoading(false); // ✅ re-enable button
        }
    };

    return (
        <section
            id="contact"
            className="py-20 bg-blue-50 text-blue-900 min-h-screen w-full"
            style={{ minHeight: "100dvh" }}
        >
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12">
                {/* Contact Info */}
                <div>
                    <h2 className="text-4xl font-bold mb-6 text-[#0076ff]">
                        Get in  <span className="text-[#0076ff]">Touch</span>
                    </h2>
                    <p className="text-blue-800 mb-8">
                        Have questions or want to book a wash? Reach out to us — we’re always happy to help.
                    </p>

                    <ul className="space-y-6">
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center  rounded-full text-white text-xl">
                                📞
                            </span>
                            <div className="flex flex-col">
                                <a
                                    href="tel:+17828275010"
                                    className="text-lg text-blue-900 hover:text-[#0076ff] underline underline-offset-2"
                                >
                                    +1 (782) 827-5010
                                </a>
                            </div>
                        </li>
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center  rounded-full text-white text-xl">
                                ✉️
                            </span>
                            <a
                                href="mailto:washlabs.ca@gmail.com"
                                className="text-lg text-blue-900 hover:text-[#0076ff] underline underline-offset-2"
                            >
                                washlabs.ca@gmail.com
                            </a>
                        </li>
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center rounded-full text-white text-xl">
                                📍
                            </span>
                            <a
                                href="https://maps.app.goo.gl/5oipyqCoU83Zq6hy9"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg text-blue-900 hover:text-[#0076ff] underline underline-offset-2"
                            >
                                53 Vitalia Ct, Halifax, NS B3S 0H4
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
                    <h3 className="text-2xl font-semibold mb-6 text-[#0076ff]">
                        Send us a Message
                    </h3>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm mb-2 text-blue-900">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your Name"
                                className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-2 text-blue-900">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Your Email"
                                className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-2 text-blue-900">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Your Message"
                                className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-blue-900"
                                required
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-semibold transition ${
                                loading
                                    ? "bg-blue-200 cursor-not-allowed text-blue-400"
                                    : "bg-[#0076ff] hover:bg-blue-700 text-white"
                            }`}
                        >
                            {loading ? "⏳ Sending..." : "Send Message"}
                        </button>
                    </form>
                    {status && <p className="mt-4 text-center text-blue-700">{status}</p>}
                </div>
            </div>
        </section>
    );
}
