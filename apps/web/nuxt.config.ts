export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css", "leaflet/dist/leaflet.css", "@rrweb/replay/dist/style.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4000/api",
      trackerBase: process.env.NUXT_PUBLIC_TRACKER_BASE || "http://localhost:4000"
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: "pt-BR" },
      titleTemplate: "%s · Akros Pulse",
      meta: [
        { name: "description", content: "Analytics de tráfego, campanhas e jornadas digitais." },
        { name: "theme-color", content: "#1f2b46" }
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=Playfair+Display:wght@600;700&display=swap"
        }
      ]
    }
  }
});
