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
      {/* Background video within hero only (non-fixed) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <video
          src="/videos/main.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="object-cover w-full h-full [object-position:center_70%] brightness-95 blur-[0.25px] transition-all duration-700"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 70%' }}
        />
      </div>

  {/* Removed blur overlay for video background */}

      {/* Subtle bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(0,0,0,0.18)] to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-5 sm:px-6 max-w-2xl">
        <motion.h1
          style={{ y: titleY, opacity: titleOpacity }}
          className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight mb-6
                     text-transparent bg-clip-text bg-gradient-to-r from-white via-[#e0f7fa] to-[#33CFFF]
                     drop-shadow-[0_2px_12px_rgba(0,0,0,0.18)]"
        >
          <span className="text-white">Wash</span>{" "}
          <span className="text-[#0076ff]">Labs</span>
        </motion.h1>

        <motion.p
          style={{ y: subtitleY, opacity: subtitleOpacity }}
          className="text-lg sm:text-xl md:text-2xl mb-10 text-white/80 font-light"
        >
          <span className="text-white/80">
            Mobile Car Detailing — premium results at your doorstep.
          </span>
        </motion.p>

        <motion.a
          aria-label="Book now — Winter Deal 30% off applied"
          style={{ y: buttonY, opacity: buttonOpacity }}
          href="#services"
          className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-3 md:px-10 md:py-4 text-lg md:text-xl font-medium
                     bg-transparent hover:bg-blue-50 text-[#0076ff] shadow-lg transition-all duration-200
                     border border-[#0076ff] backdrop-blur-sm"
        >
          <span>BOOK NOW</span>
          {/* <span className="inline-flex items-center gap-1 rounded-full bg-[#0a4aa6] text-white text-xs md:text-sm px-3 py-1">
            <span aria-hidden="true">❄</span>
            <span>30% OFF</span>
          </span> */}
        </motion.a>
        <div className="mt-3 text-xs text-white/80">
          Winter pricing applied automatically at checkout
        </div>
      </div>
    </section>
  );
}
