import Head from "next/head";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import { createClient } from "@supabase/supabase-js";

// Load gallery images from Supabase Storage bucket "Gallery" at request time
export async function getServerSideProps() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Use service role key for server-side operations (bypasses RLS)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const bucket = process.env.SUPABASE_GALLERY_BUCKET || "Gallery";
    const pathPrefix = (process.env.SUPABASE_GALLERY_PATH || "").replace(
        /^\/+|\/+$/g,
        ""
    );
    const supabase = createClient(supabaseUrl, supabaseKey);

    let images = [];
    let errorMsg = null;
    try {
        const listPath = pathPrefix || "";
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(listPath, {
                limit: 200,
                sortBy: { column: "created_at", order: "desc" },
            });
        if (error) throw error;

        images = (data || [])
            .filter(
                (file) =>
                    file &&
                    file.name &&
                    /\.(jpe?g|png|webp|gif|heic)$/i.test(file.name)
            )
            .map((file) => {
                const filePath = pathPrefix
                    ? `${pathPrefix}/${file.name}`
                    : file.name;
                const { data: pub } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);
                return pub?.publicUrl || null;
            })
            .filter(Boolean);
    } catch (e) {
        errorMsg = e?.message || String(e);
        images = [];
    }

    return { props: { galleryImages: images, galleryError: errorMsg } };
}

export default function GalleryPage({ galleryImages, galleryError }) {
    const [modalImg, setModalImg] = useState(null);
    const router = useRouter();

    return (
        <>
            <Head>
                <title>Gallery | Wash Labs</title>
                <meta
                    name="description"
                    content="Gallery of Wash Labs car detailing work in Halifax."
                />
            </Head>

            <Navigation />

            <section className="min-h-screen bg-blue-50 py-14 sm:py-20">
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                    <h1
                        className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-6 sm:mb-10 text-center"
                        style={{ color: "#000" }}
                    >
                        Gallery
                    </h1>
                    {galleryError && (
                        <p
                            className="mb-4 text-center text-sm"
                            style={{ color: "#B91C1C" }}
                        >
                            {galleryError}
                        </p>
                    )}
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
                                        ${
                                            isLarge
                                                ? "col-span-2 row-span-2"
                                                : ""
                                        }
                                        cursor-pointer
                                    `}
                                    style={{
                                        minHeight: isLarge ? 240 : 100,
                                        gridColumn: isLarge
                                            ? "span 2"
                                            : undefined,
                                        gridRow: isLarge ? "span 2" : undefined,
                                    }}
                                    onClick={() => setModalImg(img)}
                                >
                                    <Image
                                        src={img}
                                        alt={`Gallery image ${idx + 1}`}
                                        fill
                                        sizes={
                                            isLarge
                                                ? "(min-width: 768px) 33vw, 100vw"
                                                : "(min-width: 768px) 16vw, 50vw"
                                        }
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
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                aspectRatio: "3/2",
                                transition:
                                    "transform 0.3s cubic-bezier(.4,2,.6,1)",
                            }}
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
                    from {
                        opacity: 0;
                        transform: scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.35s cubic-bezier(0.4, 2, 0.6, 1);
                }
            `}</style>
        </>
    );
}
