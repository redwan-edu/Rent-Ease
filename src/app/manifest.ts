import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rent Ease",
    short_name: "Rent Ease",
    description: "The simplest way to manage rent, tenants and properties.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4f4f0",
    theme_color: "#f4f4f0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
