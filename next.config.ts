import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "eyxfvljqxkhtcbtpnnkf.supabase.co";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        // Fotos públicas del bucket (CDN de Supabase, ya optimizadas por su Transform API)
        // Se sirven con <Image unoptimized> para evitar doble procesamiento.
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
