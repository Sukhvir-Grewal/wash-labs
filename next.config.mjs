/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "images.unsplash.com",
      "uqqunhpfgnqrkalycrbr.supabase.co",
    ], // allow Unsplash and Supabase storage images
  },
};

export default nextConfig;
