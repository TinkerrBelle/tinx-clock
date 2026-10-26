import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tinx",
    short_name: "Tinx",
    description: "Track your shifts, hours and pay.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5a2f17",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
