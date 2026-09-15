import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "e service",
    short_name: "e service",
    description:
      "Service report, field evidence, SAP inventory, and admin review system.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f3f6fb",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity", "utilities"],
  };
}
