import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les fotos ja venen preparades a quatre amplades: es serveixen com a fitxers estàtics.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [640, 1080, 1600, 2400],
    imageSizes: [320],
  },
  experimental: {
    // Hi ha un layout arrel per idioma: sense això, les URL inexistents surten amb la 404 nua de Next.
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
