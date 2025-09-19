// components/Hero.js
import { motion, useViewportScroll, useTransform } from "framer-motion";
import Image from "next/image";

export default function Hero() {
    const { scrollY } = useViewportScroll();

    // Parallax scroll effect
    const bgY = useTransform(scrollY, [0, 500], [0, -50]);
    const titleY = useTransform(scrollY, [0, 300], [0, -100]);
    const subtitleY = useTransform(scrollY, [0, 300], [0, -30]);
    const buttonY = useTransform(scrollY, [0, 300], [0, -20]);

    const text = "Wash Labs".split("");

    return (
        <section
            id="hero"
            className="relative bg-gradient-to-r from-[#333333] to-[#1a1a1a] text-white h-screen flex items-center justify-center overflow-hidden"
        >
            {/* Background Image with parallax */}
            <motion.div style={{ y: bgY }} className="absolute inset-0">
                <Image
                    src="/images/hero/car-detailing.jpg"
                    alt="Car Detailing"
                    fill={true}
                    style={{ objectFit: "cover" }}
                    className="opacity-60"
                />
            </motion.div>

            {/* Hero Content */}
            <div className="relative z-10 text-center px-6">
                <motion.h1
                    style={{ y: titleY }}
                    className="text-5xl md:text-6xl font-extrabold text-orange-400 mb-4 flex justify-center gap-1"
                >
                    {text.map((letter, i) => (
                        <motion.span
                            key={i}
                            animate={{ y: [0, -8, 0, 6, 0] }} // wiggle up/down
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.15, // stagger per letter
                            }}
                            className="inline-block"
                        >
                            {letter === " " ? "\u00A0" : letter}
                        </motion.span>
                    ))}
                </motion.h1>

                <motion.p
                    style={{ y: subtitleY }}
                    className="text-lg md:text-xl mb-8 text-gray-200"
                >
                    Mobile Car Detailing. Premium Service at Your Doorstep.
                </motion.p>

                <motion.a
                    style={{ y: buttonY }}
                    href="#services"
                    className="inline-block bg-orange-500 hover:bg-orange-600 transition px-8 py-4 rounded-full font-semibold text-black"
                >
                    Book Now
                </motion.a>
            </div>
        </section>
    );
}
