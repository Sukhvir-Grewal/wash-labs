// components/Hero.js
import { motion, useViewportScroll, useTransform } from "framer-motion";
import Image from "next/image";

export default function Hero() {
  const { scrollY } = useViewportScroll();

  // Parallax scroll effect (smoothed & synced)
  const titleY = useTransform(scrollY, [0, 200], [0, -60]);
  const subtitleY = useTransform(scrollY, [0, 200], [0, -40]);
  const buttonY = useTransform(scrollY, [0, 200], [0, -30]);

  // Fade-out effect
  const titleOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const subtitleOpacity = useTransform(scrollY, [0, 250], [1, 0]);
  const buttonOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      id="hero"
      className="relative h-[90vh] md:h-screen flex items-center justify-center overflow-hidden bg-transparent"
    >
      {/* Fixed background image (stays visible while scrolling) */}
      <div className="fixed inset-0 -z-20">
        <Image
          src="/images/hero/car-detailing.jpg"
          alt="Car Detailing"
          fill
          priority
          className="object-cover brightness-[0.65]"
        />
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.65)] md:bg-[rgba(0,0,0,0.55)]" />

      {/* Subtle bottom vignette to pop text/buttons */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-5 sm:px-6 max-w-2xl">
        <motion.h1
          style={{ y: titleY, opacity: titleOpacity }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4
                     text-transparent bg-clip-text bg-[var(--gradient-primary)]
                     drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
        >
         <span className="text-white">Wash</span> <span className="text-[#33CFFF]">Labs</span>
        </motion.h1>

        <motion.p
          style={{ y: subtitleY, opacity: subtitleOpacity }}
          className="text-base sm:text-lg md:text-xl mb-8 text-[var(--color-text-main)]/95"
        >
           <span className="text-[#D1D1D1]">Mobile Car Detailing — premium results at your doorstep.</span>
        </motion.p>

        <motion.a
          style={{ y: buttonY, opacity: buttonOpacity }}
          href="#services"
          className="btn btn-primary rounded-full px-7 py-3 md:px-8 md:py-4 text-base md:text-lg"
        >
          Book Now
        </motion.a>
      </div>
    </section>
  );
}
