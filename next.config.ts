import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const supabasePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "*.supabase.co",
    port: "",
    pathname: "/storage/v1/object/public/product-images/**",
    search: "",
  },
];

const supabaseUrl = process.env.SUPABASE_URL?.trim();
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      supabasePatterns.unshift({
        protocol: parsed.protocol === "http:" ? "http" : "https",
        hostname: parsed.hostname,
        port: parsed.port || "",
        pathname: "/storage/v1/object/public/product-images/**",
        search: "",
      });
    }
  } catch {
    // Abaikan jika SUPABASE_URL belum valid saat build offline
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabasePatterns,
  },
};

export default nextConfig;
