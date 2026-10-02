import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "brief",
    short_name: "brief",
    description: "Lo que tienes que grabar esta semana.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0D",
    theme_color: "#0B0B0D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
