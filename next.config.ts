import type { NextConfig } from "next";

// A malformed env var must not break the build; the image loader simply stays off.
function supabaseHostname(): string | undefined {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return undefined;
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHost = supabaseHostname();

const devOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set ALLOWED_DEV_ORIGINS when the dev server is reached through a tunnel.
  allowedDevOrigins: devOrigins.length > 0 ? devOrigins : undefined,
  images: {
    // Covers are served from the private bucket, so signed URLs are the norm.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
