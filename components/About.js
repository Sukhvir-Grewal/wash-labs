// components/About.js
import Image from "next/image";

export default function About() {
  return (
    <section
      id="about"
      className="py-20 bg-gradient-to-r from-[#333333] to-[#1a1a1a] text-white"
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Side - Image */}
        <div className="relative group">
          <Image
            src="/images/about-car.jpg"
            alt="Car Detailing"
            width={600}
            height={400}
            priority
            className="rounded-2xl shadow-lg transform group-hover:scale-105 transition duration-700 object-cover w-full h-[400px]"
          />
          <div className="absolute inset-0 bg-black/40 rounded-2xl"></div>
          <h3 className="absolute bottom-6 left-6 text-2xl font-bold text-orange-400">
            Premium Care
          </h3>
        </div>

        {/* Right Side - Text */}
        <div>
          <h2 className="text-4xl font-extrabold text-orange-400 mb-6">
            About Wash Labs
          </h2>
          <p className="text-lg text-gray-300 mb-6 leading-relaxed">
            At <span className="text-orange-400 font-semibold">Wash Labs</span>,
            we redefine car care with precision and passion. From a quick
            exterior shine to complete detailing, our goal is to deliver a
            premium experience that makes your car feel brand new every time.
          </p>
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">
            Using only high-quality products and modern techniques, we ensure
            lasting results and protection. Your ride deserves nothing less than
            the best — and that’s what we provide.
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 text-center shadow-md hover:shadow-lg transition">
              <h4 className="text-2xl font-bold text-orange-400">Eco-Friendly</h4>
              <p className="text-sm text-gray-400">Safe cleaning solutions</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 text-center shadow-md hover:shadow-lg transition">
              <h4 className="text-2xl font-bold text-orange-400">Detail Obsessed</h4>
              <p className="text-sm text-gray-400">Every inch matters</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
