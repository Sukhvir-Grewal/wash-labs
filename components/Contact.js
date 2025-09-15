// components/Contact.js
export default function Contact() {
    return (
        <section
            id="contact"
            className="py-20 bg-gradient-to-b from-gray-900 to-black text-white"
        >
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12">
                {/* Contact Info */}
                <div>
                    <h2 className="text-4xl font-bold mb-6 text-orange-500">
                        Get in Touch
                    </h2>
                    <p className="text-gray-300 mb-8">
                        Have questions or want to book a wash? Reach out to us —
                        we’re always happy to help.
                    </p>

                    <ul className="space-y-6">
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full">
                                📞
                            </span>
                            <div className="flex flex-col">
                                <span className="text-lg">
                                    +1 (647) 914-3066
                                </span>
                                <span className="text-lg">
                                    +1 (437) 991-2206
                                </span>
                            </div>
                        </li>
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full">
                                ✉️
                            </span>
                            <span className="text-lg">
                                washlabs.ca@gmail.com
                            </span>
                        </li>
                        <li className="flex items-center space-x-4">
                            <span className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full">
                                📍
                            </span>
                            <span className="text-lg">
                                Halifax, Nova Scotia
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Contact Form */}
                <div className="bg-white/10 p-8 rounded-2xl shadow-lg backdrop-blur">
                    <h3 className="text-2xl font-semibold mb-6">
                        Send us a Message
                    </h3>
                    <form className="space-y-6">
                        <div>
                            <label className="block text-sm mb-2">Name</label>
                            <input
                                type="text"
                                placeholder="Your Name"
                                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-2">Email</label>
                            <input
                                type="email"
                                placeholder="Your Email"
                                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-2">
                                Message
                            </label>
                            <textarea
                                rows="4"
                                placeholder="Your Message"
                                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-semibold transition"
                        >
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
