import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), konsol: resolve(__dirname, "konsol.html") } },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Mahalle Ağı",
        short_name: "Mahalle Ağı",
        description: "İnternet ve baz istasyonu olmadan çalışan mahalle afet iletişim ağı",
        lang: "tr",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#14161a",
        theme_color: "#14161a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/konsol/, /^\/disa-aktar/, /^\/dugum-bilgi/, /^\/ws/],
      },
    }),
  ],
});
