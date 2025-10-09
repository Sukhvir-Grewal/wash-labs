import Head from "next/head";
import Image from "next/image";
import fs from "fs";
import path from "path";
import { useState } from "react";

// Get all image files from /public/images/gallery at build time
export async function getStaticProps() {
    const galleryDir = path.join(process.cwd(), "public", "images", "gallery");
    let images = [];
    try {
        images = fs
            .readdirSync(galleryDir)
            .filter((file) =>
                /\.(jpe?g|png|webp|gif|heic)$/i.test(file)
            )
            .map((file) => `/images/gallery/${file}`);
    } catch (e) {
        // Directory may not exist yet
    }
    return { props: { galleryImages: images } };
}

export default function GalleryPage({ galleryImages }) {
    const [modalImg, setModalImg] = useState(null);

    return (
        <>
            <Head>
                <title>Gallery | Wash Labs</title>
                <meta name="description" content="Gallery of Wash Labs car detailing work in Halifax." />
            </Head>
            <section className="min-h-screen bg-blue-50 py-14 sm:py-20">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0076ff] mb-6 sm:mb-10 text-center">Gallery</h1>
                    <div
                        className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[200px]"
                        style={{ gridAutoFlow: "dense" }}
                    >
                        {galleryImages.map((img, idx) => {
                            const isLarge = idx % 7 === 0 || idx % 11 === 0;
                            return (
                                <div
                                    key={img}
                                    className={`relative overflow-hidden rounded-xl shadow-lg bg-white group transition-all duration-300
                                        ${isLarge ? "col-span-2 row-span-2" : ""}
                                        cursor-pointer
                                    `}
                                    style={{
                                        minHeight: isLarge ? 240 : 100,
                                        gridColumn: isLarge ? "span 2" : undefined,
                                        gridRow: isLarge ? "span 2" : undefined,
                                    }}
                                    onClick={() => setModalImg(img)}
                                >
                                    <Image
                                        src={img}
                                        alt={`Gallery image ${idx + 1}`}
                                        fill
                                        sizes={isLarge ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 768px) 16vw, 50vw"}
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                        style={{ objectPosition: "center" }}
                                        quality={90}
                                        priority={idx < 4}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Modal for enlarged image */}
                {modalImg && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-all duration-300"
                        onClick={() => setModalImg(null)}
                    >
                        <div
                            className="relative max-w-3xl w-[96vw] sm:w-[90vw] max-h-[90vh] flex items-center justify-center animate-fade-in"
                            onClick={e => e.stopPropagation()}
                            style={{ aspectRatio: "3/2", transition: "transform 0.3s cubic-bezier(.4,2,.6,1)" }}
                        >
                            <div className="relative w-full h-[60vw] sm:h-[50vw] max-h-[80vh] max-w-3xl transition-all duration-300">
                                <Image
                                    src={modalImg}
                                    alt="Enlarged gallery image"
                                    fill
                                    sizes="90vw"
                                    className="object-contain rounded-2xl shadow-2xl bg-white transition-all duration-300 scale-100"
                                    style={{ background: "white" }}
                                    quality={95}
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>
            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.96);}
                    to { opacity: 1; transform: scale(1);}
                }
                .animate-fade-in {
                    animation: fade-in 0.35s cubic-bezier(.4,2,.6,1);
                }
            `}</style>
        </>
    );
}
