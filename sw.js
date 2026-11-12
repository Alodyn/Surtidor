const SHELL = "surtidor-shell-v2";
const DATA = "surtidor-data-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./places.json",
  "./vehicles.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== DATA && k !== "surtidor-cfg").map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isApi = url.hostname.includes("minetur.gob.es") || url.hostname.includes("serviciosmin.gob.es");
  if (isApi) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, SHELL));
  }
});

async function cacheFirst(req, name) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    const c = await caches.open(name);
    c.put(req, res.clone());
    return res;
  } catch (err) {
    if (req.mode === "navigate") return caches.match("./index.html");
    throw err;
  }
}

async function networkFirst(req, name) {
  try {
    const res = await fetch(req);
    const c = await caches.open(name);
    c.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "precios") e.waitUntil(checkFavPrices());
});

async function checkFavPrices() {
  try {
    const cfgRes = await caches.match(new URL("./__alerts", self.registration.scope));
    if (!cfgRes) return;
    const cfg = await cfgRes.json();
    const favs = cfg.favs || [];
    const alerts = cfg.alerts || {};
    if (!favs.length || !Object.keys(alerts).length) return;
    const url = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
    const r = await fetch(url);
    if (!r.ok) return;
    const data = await r.json();
    const lista = data.ListaEESSPrecio || [];
    const keys = {
      goa: "Precio Gasoleo A",
      gop: "Precio Gasoleo Premium",
      g95: "Precio Gasolina 95 E5",
      g98: "Precio Gasolina 98 E5",
      glp: "Precio Gases licuados del petróleo"
    };
    const hits = [];
    for (const s of lista) {
      if (!favs.includes(s.IDEESS)) continue;
      for (const [id, th] of Object.entries(alerts)) {
        const raw = s[keys[id]];
        if (!raw) continue;
        const p = Number(String(raw).replace(",", "."));
        if (p && p <= Number(th)) hits.push(`${s["Rótulo"]}: ${p.toFixed(3).replace(".", ",")} €/l`);
      }
    }
    if (!hits.length || !self.registration.showNotification) return;
    await self.registration.showNotification("Surtidor: precio bajo el umbral", {
      body: hits.slice(0, 3).join(" · "),
      icon: "icons/icon-192.png"
    });
  } catch {}
}
