import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb", // Allow image uploads up to 5MB (with some buffer)
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Production Supabase storage
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    // Skip optimization for local Supabase images in development
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
