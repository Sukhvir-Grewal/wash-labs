"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import Image from "next/image"; // ✅ use next/image
import "swiper/css";

const galleryImages = [
    "/images/slides/slide1.jpg",
    "/images/slides/slide2.jpg",
    "/images/slides/slide3.jpg",
    "/images/slides/slide4.jpg",
];

export default function Gallery() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <section id="gallery" className="py-20 bg-gray-900">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <h2 className="text-4xl font-extrabold text-orange-400 mb-12">
                    Gallery
                </h2>

                <Swiper
                    spaceBetween={20}
                    loop={true}
                    allowTouchMove={false} // stops dragging
                    slidesPerView={1}
                    speed={6000} // slow & smooth
                    autoplay={{
                        delay: 0, // no delay, keep moving
                        disableOnInteraction: false,
                    }}
                    breakpoints={{
                        640: { slidesPerView: 2 },
                        1024: { slidesPerView: 3 },
                    }}
                    modules={[Autoplay]}
                >
                    {galleryImages.map((img, index) => (
                        <SwiperSlide key={index}>
                            <div className="overflow-hidden rounded-2xl cursor-pointer hover:scale-105 transition-transform duration-500">
                                <Image
                                    src={img}
                                    alt={`Gallery ${index + 1}`}
                                    width={600} // pick something around your actual width
                                    height={400} // and height
                                    className="w-full h-64 object-cover rounded-2xl"
                                    quality={100} // ✅ max quality
                                    priority={true} // loads fast
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
}
