// components/About.js
import Image from "next/image";

export default function About() {
  return (
    <section
      id="about"
      className="py-20 bg-gradient-to-r from-[#333333] to-[#1a1a1a] text-white"
      aria-labelledby="about-heading"
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Side - Image */}
        <div className="relative group">
          <Image
            src="/images/about-car.jpg"
            alt="Affordable premium car detailing Halifax"
            width={600}
            height={400}
            priority
            className="rounded-2xl shadow-lg transform group-hover:scale-105 transition duration-700 object-cover w-full h-[400px]"
          />
          <div className="absolute inset-0 bg-black/40 rounded-2xl"></div>
          <h3 className="absolute bottom-6 left-6 text-2xl font-bold text-orange-400">
            Affordable Perfection
          </h3>
        </div>

        {/* Right Side - Text */}
        <div>
          <h2
            id="about-heading"
            className="text-4xl font-extrabold text-orange-400 mb-6"
          >
            About Wash Labs
          </h2>

          <p className="text-lg text-gray-300 mb-6 leading-relaxed">
            At <span className="text-orange-400 font-semibold">Wash Labs</span>,
            we believe car care should be <span className="font-semibold">flawless and affordable</span>. 
            Every service is carried out with precision so your car looks showroom ready—without breaking your budget.
          </p>

          <p className="text-lg text-gray-300 mb-8 leading-relaxed">
            Using professional-grade products and modern detailing techniques, 
            we provide <span className="text-orange-400 font-semibold">long-lasting shine and protection</span>. 
            Whether it’s a quick wash or a full interior + exterior detail, 
            our mission is simple: <strong>perfection at a price everyone can afford</strong>.
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-6">
            <article
              className="bg-gray-800 rounded-xl p-6 text-center shadow-md hover:shadow-lg transition"
              aria-label="Affordable Pricing"
            >
              <h3 className="text-2xl font-bold text-orange-400">Affordable</h3>
              <p className="text-sm text-gray-400">Premium quality, fair price</p>
            </article>

            <article
              className="bg-gray-800 rounded-xl p-6 text-center shadow-md hover:shadow-lg transition"
              aria-label="Perfect Finish"
            >
              <h3 className="text-2xl font-bold text-orange-400">Perfect Finish</h3>
              <p className="text-sm text-gray-400">Detailing without compromise</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
