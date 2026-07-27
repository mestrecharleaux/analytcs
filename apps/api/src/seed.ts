import { nanoid } from "nanoid";
import { ensureBootstrapAuth } from "./auth/service.js";
import { connectDataStores, disconnectDataStores } from "./db.js";
import { Campaign, PageView, Session, Site } from "./models.js";

await connectDataStores();
await ensureBootstrapAuth();

let site = await Site.findOne({ domains: "akros.com.br" });
if (!site) {
  site = await Site.create({
    name: "Akros Institucional",
    domains: ["akros.com.br", "www.akros.com.br", "localhost"],
    avatarColor: "#6d5dfc",
    trackingKey: `ak_${nanoid(24)}`,
    timezone: "America/Sao_Paulo"
  });
}

let campaign = await Campaign.findOne({ siteId: site._id, utmCampaign: "crescer-com-akros" });
if (!campaign) {
  campaign = await Campaign.create({
    siteId: site._id,
    name: "Crescer com a Akros",
    channel: "google_ads",
    startDate: new Date(Date.now() - 30 * 86400000),
    endDate: null,
    status: "active",
    utmCampaign: "crescer-com-akros",
    goalPath: "/contato"
  });
}

if (!(await Session.exists({ siteId: site._id }))) {
  const pages = ["/", "/solucoes", "/quem-somos", "/cases", "/conteudos", "/contato"];
  const cities = [
    { city: "São Paulo", region: "SP", country: "BR", latitude: -23.5505, longitude: -46.6333 },
    { city: "Curitiba", region: "PR", country: "BR", latitude: -25.4284, longitude: -49.2733 },
    { city: "Belo Horizonte", region: "MG", country: "BR", latitude: -19.9167, longitude: -43.9345 },
    { city: "Recife", region: "PE", country: "BR", latitude: -8.0578, longitude: -34.8829 }
  ];

  for (let index = 0; index < 90; index++) {
    const startedAt = new Date(Date.now() - Math.floor(Math.random() * 29 * 86400000));
    const sessionId = `demo-${nanoid(14)}`;
    const location = cities[index % cities.length]!;
    const count = 1 + (index % 5);
    const isBot = index % 17 === 0;
    await Session.create({
      siteId: site._id,
      sessionId,
      ip: `198.51.100.${(index % 200) + 1}`,
      location,
      browser: { name: index % 3 ? "Chrome" : "Safari", version: "1" },
      os: { name: index % 2 ? "Windows" : "iOS", version: "1" },
      deviceType: index % 3 ? "Computador" : "Celular",
      isBot,
      userAgent: isBot ? "DemoBot/1.0" : "DemoBrowser/1.0",
      entryPage: pages[0],
      referrer: "https://www.google.com/",
      queryParams: { utm_source: "google", utm_campaign: "crescer-com-akros" },
      startedAt,
      lastSeenAt: new Date(startedAt.getTime() + count * 60000)
    });
    for (let view = 0; view < count; view++) {
      const path = pages[(index + view) % pages.length]!;
      await PageView.create({
        siteId: site._id,
        sessionId,
        campaignId: campaign._id,
        path,
        url: `https://akros.com.br${path}?utm_source=google&utm_campaign=crescer-com-akros`,
        title: `Akros · ${path}`,
        referrer: view ? `https://akros.com.br${pages[(index + view - 1) % pages.length]}` : "https://www.google.com/",
        queryParams: { utm_source: "google", utm_campaign: "crescer-com-akros" },
        isBot,
        occurredAt: new Date(startedAt.getTime() + view * 60000)
      });
    }
  }
}

console.log(`Dados de demonstração prontos. Site: ${site.name} | Chave: ${site.trackingKey}`);
await disconnectDataStores();
