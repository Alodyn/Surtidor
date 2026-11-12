/* Surtidor — precios oficiales de carburantes (MITECO) */
(() => {
  const API = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes";
  const LS = "surtidor.";
  const RADII = [2, 5, 10, 25, 50];
  const CORRIDOR_KM = 2;
  const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const FUELS = [
    { id: "goa", key: "Precio Gasoleo A", label: "Gasóleo A", short: "GOA" },
    { id: "gop", key: "Precio Gasoleo Premium", label: "Gasóleo Premium", short: "Premium" },
    { id: "g95", key: "Precio Gasolina 95 E5", label: "Gasolina 95 E5", short: "95" },
    { id: "g98", key: "Precio Gasolina 98 E5", label: "Gasolina 98 E5", short: "98" },
    { id: "glp", key: "Precio Gases licuados del petróleo", label: "GLP", short: "GLP" },
    { id: "adblue", key: "Precio Adblue", label: "AdBlue", short: "AdBlue" },
    { id: "hvo", key: "Precio Diésel Renovable", label: "Diésel renovable", short: "HVO" },
    { id: "gob", key: "Precio Gasoleo B", label: "Gasóleo B", short: "GOB" },
    { id: "g95p", key: "Precio Gasolina 95 E5 Premium", label: "Gasolina 95 Premium", short: "95+" },
    { id: "gnc", key: "Precio Gas Natural Comprimido", label: "GNC", short: "GNC" },
    { id: "gnl", key: "Precio Gas Natural Licuado", label: "GNL", short: "GNL" },
    { id: "g95e10", key: "Precio Gasolina 95 E10", label: "Gasolina 95 E10", short: "E10" },
    { id: "g98e10", key: "Precio Gasolina 98 E10", label: "Gasolina 98 E10", short: "98 E10" },
    { id: "gren", key: "Precio Gasolina Renovable", label: "Gasolina renovable", short: "G-Ren" },
    { id: "biognc", key: "Precio Biogas Natural Comprimido", label: "Bio-GNC", short: "BioGNC" },
    { id: "biognl", key: "Precio Biogas Natural Licuado", label: "Bio-GNL", short: "BioGNL" },
    { id: "biodiesel", key: "Precio Biodiesel", label: "Biodiésel", short: "BioD" },
    { id: "bioetanol", key: "Precio Bioetanol", label: "Bioetanol", short: "EtOH" },
    { id: "g95e85", key: "Precio Gasolina 95 E85", label: "Gasolina 95 E85", short: "E85" },
    { id: "g95e25", key: "Precio Gasolina 95 E25", label: "Gasolina 95 E25", short: "E25" },
    { id: "h2", key: "Precio Hidrogeno", label: "Hidrógeno", short: "H₂" }
  ];
  const FUEL_BY_ID = Object.fromEntries(FUELS.map((f) => [f.id, f]));

  const BRAND_COLORS = [
    ["REPSOL", "#ff6b00"], ["CEPSA", "#e10600"], ["BP", "#009739"],
    ["SHELL", "#dd1d21"], ["GALP", "#0072ce"], ["BALLENOIL", "#00a3e0"],
    ["PETROPRIX", "#e6b800"], ["PLENOIL", "#9ad10a"], ["ALCAMPO", "#0072ce"],
    ["CARREFOUR", "#0a5ca9"], ["EROSKI", "#e30613"], ["AVIA", "#c41230"],
    ["DISA", "#f7a600"], ["BONAREA", "#6cbe45"], ["Q8", "#e30613"],
    ["PETRONOR", "#f39200"], ["MEROIL", "#0055a5"], ["CAMPSA", "#e4002b"],
    ["TU ENERGIA", "#00b5e2"], ["BLANCA", "#c9b18a"], ["COSTCO", "#e31837"]
  ];

  /* IDProducto del Ministerio (Listados/ProductosPetroliferos), para el histórico por municipio y producto */
  const PID = { goa: 4, gop: 5, g95: 1, g98: 3, glp: 17, adblue: 26, hvo: 27, gob: 6, g95p: 20, gnc: 18, gnl: 19,
    g95e10: 23, g98e10: 21, gren: 28, biognc: 31, biognl: 32, biodiesel: 8, bioetanol: 16, g95e85: 25, g95e25: 24, h2: 22 };
  const HIST_DAYS = 28;

  /* Tarjetas y apps de fidelización. Céntimos por litro orientativos: el usuario los ajusta. */
  const LOYALTY = [
    { id: "repsol", label: "Repsol · Waylet", re: /\b(REPSOL|CAMPSA|PETRONOR)\b/, cents: 5 },
    { id: "moeve", label: "Moeve Gow (antes Cepsa)", re: /\b(MOEVE|CEPSA)\b/, cents: 5 },
    { id: "bp", label: "BP · BPme / Miles & More", re: /(^|\s)BP(\s|$)/, cents: 3 },
    { id: "galp", label: "Galp · Mundo Galp", re: /\bGALP\b/, cents: 5 },
    { id: "shell", label: "Shell ClubSmart", re: /\bSHELL\b/, cents: 3 },
    { id: "carrefour", label: "Club Carrefour", re: /CARREFOUR/, cents: 8 },
    { id: "alcampo", label: "Alcampo · Club Alcampo", re: /ALCAMPO/, cents: 5 }
  ];

  /* Recarga eléctrica: teselas generadas por tools/build_ev.py desde el registro oficial (DGT NAP / MITERD)
     y supercharge.info. El registro no publica precios. */
  const EV_BASE = "ev/";
  const EV_MINKW = [0, 22, 50, 150];
  const EV_CONNS = [
    { id: "CCS", label: "CCS" }, { id: "T2", label: "Tipo 2" },
    { id: "CHAdeMO", label: "CHAdeMO" }, { id: "Tesla", label: "Tesla" }
  ];
  const CONN_LABEL = { CCS: "CCS (Combo 2)", CCS1: "CCS1", T2: "Tipo 2", T1: "Tipo 1", CHAdeMO: "CHAdeMO",
    Schuko: "Schuko", CEE: "CEE industrial", Tesla: "Tesla", NACS: "NACS", Otro: "Otro" };
  const SITE_TYPE = { onstreet: "En la calle", openSpace: "Al aire libre", inBuilding: "En edificio o subterráneo", other: "" };
  const AUTH_LABEL = { apps: "App", rfid: "Tarjeta RFID", nfc: "NFC", creditCard: "Tarjeta bancaria", debitCard: "Tarjeta bancaria",
    cashPayment: "Efectivo", pinpad: "Datáfono", mobilePayment: "Pago móvil", plugAndCharge: "Plug & Charge", qrCode: "Código QR", website: "Web", phone: "Teléfono" };
  const SERVICE_LABEL = { foodShopping: "Supermercado", restaurant: "Restaurante", cafe: "Cafetería", leisureActivities: "Ocio",
    petrolStation: "Gasolinera", shop: "Tienda", hotel: "Hotel", bikeSharing: "Bici compartida" };
  const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

  const DEFAULT_VEHICLE = {
    make: "Volvo",
    model: "S60",
    engine: "2.4D 130-163 CV",
    yearFrom: 2001,
    yearTo: 2009,
    tank: 70,
    cons: 6.7,
    fuel: "goa",
    note: "Ficha km77 y datos técnicos Volvo 2004: depósito 70 l, consumo mixto 6,7 l/100 km (NEDC)."
  };

  const state = {
    places: null,
    vehicles: null,
    origin: null,
    radius: 5,
    fuelId: "goa",
    sort: "price",
    onlyPublic: true,
    onlyFavs: false,
    view: "nearby",
    mapOpen: false,
    raw: [],
    fecha: null,
    nota: "",
    filtered: [],
    stats: null,
    vehicle: { ...DEFAULT_VEHICLE },
    favs: [],
    alerts: {},
    history: {},
    log: [],
    routeStations: [],
    cache: new Map(),
    mode: "fuel",
    openF: "any",
    cards: {},
    home: null,
    histCache: new Map(),
    ev: { minKw: 0, conns: [], parking: false, sort: "distance", raw: [], filtered: [], meta: null, tiles: new Map(), stats: null },
    maps: { main: null, route: null, mainLayer: null, routeLayer: null }
  };

  const $ = (id) => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";

  /* Iconos de trazo fino (1,7), mismo lenguaje que la barra de pestañas */
  const ICONS = {
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
    share: '<path d="M12 14.5v-11"/><path d="M8.2 7.2 12 3.5l3.8 3.7"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16"/>',
    nav: '<path d="M4.5 11.2 19.5 4.5l-6.7 15-1.9-6.4z"/>',
    bolt: '<path d="M13.2 3 5.8 13.1h5.5L10.8 21l7.4-10.2h-5.5z"/>',
    plug: '<path d="M9 3.5V8M15 3.5V8"/><path d="M6.5 8h11v3.2a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.7v3.8"/>',
    parking: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M10 16.5v-9h2.8a2.6 2.6 0 0 1 0 5.2H10"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s7-5.6 7-11.2A7 7 0 0 0 5 9.8C5 15.4 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.2"/>',
    locate: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"/><circle cx="12" cy="12" r="7.5"/>',
    close: '<path d="M7 7l10 10M17 7 7 17"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8.2v.01"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    chat: '<path d="M5 19.5 6.2 16A7.5 7.5 0 1 1 9 18.6z"/>',
    trend: '<path d="M4 16.5 9 11l3.5 3.5L20 7"/><path d="M15 7h5v5"/>',
    card: '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M7 14.5h3"/>',
    fuel: '<path d="M5.5 20V5.5A1.5 1.5 0 0 1 7 4h6a1.5 1.5 0 0 1 1.5 1.5V20"/><path d="M4 20h12"/><path d="M8 8h4"/><path d="M14.5 10h1.6a1.4 1.4 0 0 1 1.4 1.4v4.3a1.25 1.25 0 0 0 2.5 0V8.6L18 6.5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    route: '<circle cx="6.5" cy="6.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/><path d="M8.4 7.8C12 8 14 10.5 14 13.5V15c0 1.2.8 2.5 3.3 2.5"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>'
  };
  function icon(name, size = 18, cls = "") {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("class", ("ic " + cls).trim());
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || "";
    return svg;
  }
  function iconHTML(name, size = 12, cls = "") {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ic ${cls}" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }
  function haptic(pattern = 8) {
    // Solo tras un toque del usuario (Chrome bloquea la vibración antes); iOS Safari la ignora
    try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pattern); } catch {}
  }
  let toastTimer = 0;
  function toast(msg) {
    let t = $("toast");
    if (!t) { t = el("div", { id: "toast", class: "toast", role: "status" }); document.body.append(t); }
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
  }

  
  const THEMES = {
    claro: { label: "Claro", color: "#e4e8f2", scheme: "light" },
    grafito: { label: "Grafito", color: "#303136", scheme: "dark" },
    "grafito-oscuro": { label: "Grafito oscuro", color: "#1a1b1d", scheme: "dark" },
    medianoche: { label: "Medianoche", color: "#070b14", scheme: "dark" }
  };

  function applyTheme(name) {
    if (!THEMES[name]) name = "claro";
    state.theme = name;
    document.documentElement.setAttribute("data-theme", name);
    const t = THEMES[name];
    const metaC = document.querySelector('meta[name="theme-color"]');
    const metaS = document.querySelector('meta[name="color-scheme"]');
    if (metaC) metaC.setAttribute("content", t.color);
    if (metaS) metaS.setAttribute("content", t.scheme);
    document.documentElement.style.colorScheme = t.scheme;
    saveLS("theme", name);
    document.querySelectorAll("[data-theme-pick]").forEach((b) => {
      const on = b.dataset.themePick === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (apple) apple.setAttribute("content", t.scheme === "light" ? "default" : "black-translucent");
    refreshMapTiles();
    if (state.view === "log") renderLog();
  }

function loadLS(key, fallback) {
    try {
      const v = localStorage.getItem(LS + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  }
  function saveLS(key, val) {
    try { localStorage.setItem(LS + key, JSON.stringify(val)); } catch {}
  }

  function parsePrice(s) {
    if (s == null) return null;
    const t = String(s).trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  function parseCoord(s) {
    if (s == null) return null;
    const n = Number(String(s).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dph = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dph / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function fmtPrice(n) {
    if (n == null) return "—";
    return n.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  function fmtEuro(n, d = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }) + " €";
  }
  function fmtKm(n) {
    if (n == null) return "—";
    return (n < 10 ? n.toFixed(2) : n.toFixed(1)).replace(".", ",") + " km";
  }
  function madridParts(d = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
    return Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  }
  function todayISO() {
    const p = madridParts();
    return `${p.year}-${p.month}-${p.day}`;
  }
  function histDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }
  function brandColor(name) {
    const u = (name || "").toUpperCase();
    for (const [k, c] of BRAND_COLORS) if (u.includes(k)) return c;
    return "#c47a12";
  }

  function formatAddress(raw) {
    const parts = [raw["Dirección"], raw["C.P."], raw["Localidad"] || raw["Municipio"]]
      .map((x) => String(x || "").replace(/[·,.\s]+$/g, "").replace(/^[·,\s]+/g, "").replace(/\s+/g, " ").trim())
      .filter((x) => x && !/^[·.,/-]+$/.test(x));
    const uniq = [];
    for (const p of parts) {
      if (uniq.some((u) => u.toLowerCase().includes(p.toLowerCase()))) continue;
      uniq.push(p);
    }
    return uniq.join(" · ");
  }

  function expandDays(token) {
    const numOf = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const out = [];
    for (const part of String(token).toUpperCase().replace(/\s/g, "").split(",")) {
      if (part.includes("-")) {
        const [a, b] = part.split("-");
        let i = numOf[a], end = numOf[b];
        if (i == null || end == null) continue;
        for (let n = 0; n < 7; n++) {
          out.push(i);
          if (i === end) break;
          i = (i + 1) % 7;
        }
      } else if (numOf[part] != null) out.push(numOf[part]);
    }
    return out;
  }

  function intervalOpen(spec, minutes) {
    const parts = String(spec).split(/\s*(?:y|\/)\s*/i);
    for (const p of parts) {
      if (/24\s*h/i.test(p)) return true;
      const m = p.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (!m) continue;
      const a = Number(m[1]) * 60 + Number(m[2]);
      let b = Number(m[3]) * 60 + Number(m[4]);
      if (b === 0) b = 24 * 60;
      if (b > a) { if (minutes >= a && minutes < b) return true; }
      else if (minutes >= a || minutes < b) return true;
    }
    return false;
  }

  function openStatus(hours) {
    if (!hours) return { open: null, label: "" };
    if (/24\s*h/i.test(hours)) return { open: true, label: "Abierto 24 h" };
    const now = new Date();
    const dow = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    let today = false;
    for (const seg of String(hours).split(";").map((s) => s.trim()).filter(Boolean)) {
      const m = seg.match(/^([LMXJVSD](?:\s*-\s*[LMXJVSD])?(?:\s*,\s*[LMXJVSD])*)\s*:\s*(.+)$/i);
      if (!m) continue;
      if (!expandDays(m[1]).includes(dow)) continue;
      today = true;
      if (intervalOpen(m[2], minutes)) return { open: true, label: "Abierto" };
    }
    if (today) return { open: false, label: "Cerrado" };
    return { open: null, label: "" };
  }

  function filtersLabel() {
    const open = { now: " · Abiertas", "24h": " · 24 h" }[state.openF] || "";
    if (state.mode === "ev") {
      const kw = state.ev.minKw ? ` · ≥${state.ev.minKw} kW` : "";
      return `${state.radius} km${kw}${open}`;
    }
    const sort = { price: "Precio", distance: "Distancia", net: "Ahorro" }[state.sort] || "Precio";
    const cards = Object.values(state.cards || {}).filter((c) => c.on).length;
    return `${state.radius} km · ${sort}${open}${cards ? " · " + cards + (cards > 1 ? " tarjetas" : " tarjeta") : ""}`;
  }

  /* 24 h real: todos los días, sin cortes. «L-D: 24H» o «L-D: 00:00-23:59». */
  function is24h(hours) {
    const h = String(hours || "").trim();
    return /^L\s*-\s*D\s*:\s*(24\s*H|00:00\s*-\s*(23:59|24:00|00:00))\s*$/i.test(h);
  }

  /* Horario del registro de recarga: "24h" o {dow: [[min, min], …]} */
  function evOpenStatus(h) {
    if (!h) return { open: null, label: "" };
    if (h === "24h") return { open: true, label: "Abierto 24 h" };
    const now = new Date();
    const ints = h[String(now.getDay())];
    if (!ints) return { open: false, label: "Cerrado hoy" };
    const m = now.getHours() * 60 + now.getMinutes();
    return ints.some(([a, b]) => m >= a && m < b) ? { open: true, label: "Abierto" } : { open: false, label: "Cerrado" };
  }

  function discountFor(rotulo) {
    const u = String(rotulo || "").toUpperCase().trim();
    for (const c of LOYALTY) {
      const cfg = state.cards?.[c.id];
      if (cfg?.on && c.re.test(u)) {
        const cents = Number(cfg.cents);
        if (cents > 0) return { id: c.id, label: c.label, cents };
      }
    }
    return null;
  }

  function updateFiltersLabel() {
    const elbl = $("filters-label");
    if (elbl) elbl.textContent = filtersLabel();
  }

  function fuelOf() { return FUEL_BY_ID[state.fuelId] || FUELS[0]; }


  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, "");
      else n.setAttribute(k, String(v));
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return n;
  }

  function persistCfg() {
    const cfg = {
      favs: state.favs,
      alerts: state.alerts,
      fuelId: state.fuelId
    };
    if (!window.caches) return;
    caches.open("surtidor-cfg").then((c) =>
      c.put(new Request(new URL("./__alerts", location.href)), new Response(JSON.stringify(cfg), { headers: { "Content-Type": "application/json" } }))
    ).catch(() => {});
  }

  /* ——— data load ——— */
  function enrich(s, origin, fuel = fuelOf()) {
    const lat = parseCoord(s.Latitud);
    const lon = parseCoord(s["Longitud (WGS84)"]);
    const official = parsePrice(s[fuel.key]);
    const disc = official != null ? discountFor(s["Rótulo"]) : null;
    const price = official != null && disc ? Math.round((official - disc.cents / 100) * 1000) / 1000 : official;
    const dist = origin && lat != null && lon != null ? haversine(origin.lat, origin.lon, lat, lon) : null;
    return { raw: s, id: s.IDEESS, lat, lon, price, official, disc, dist };
  }

  function provincesFor(lat, lon, radiusKm) {
    const list = state.places?.provincias || [];
    const pad = radiusKm + 8;
    const hit = list.filter((p) => {
      const [a, b, c, d] = p.b;
      const clat = Math.max(a, Math.min(c, lat));
      const clon = Math.max(b, Math.min(d, lon));
      return haversine(lat, lon, clat, clon) <= pad;
    });
    if (hit.length) return hit.map((p) => p.id);
    let best = list[0], bestD = Infinity;
    for (const p of list) {
      const d = haversine(lat, lon, p.lat, p.lon);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best ? [best.id] : ["28"];
  }

  async function fetchProvince(id) {
    if (state.cache.has(id)) return state.cache.get(id);
    const url = `${API}/EstacionesTerrestres/FiltroProvincia/${id}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("No se han podido cargar los precios oficiales.");
    const data = await r.json();
    const pack = { fecha: data.Fecha, nota: data.Nota, lista: data.ListaEESSPrecio || [] };
    state.cache.set(id, pack);
    return pack;
  }

  async function loadAround(lat, lon, radiusKm) {
    const resBox = $("results");
    if (resBox) {
      resBox.replaceChildren(el("div", { class: "state loading" },
        el("strong", { text: "Cargando precios oficiales" }),
        "Datos del Ministerio, un momento."
      ));
    }
    try {
    const ids = provincesFor(lat, lon, radiusKm);
    const packs = await Promise.all(ids.map(fetchProvince));
    const map = new Map();
    let fecha = null, nota = "";
    for (const p of packs) {
      fecha = p.fecha || fecha;
      nota = p.nota || nota;
      for (const s of p.lista) if (s.IDEESS && !map.has(s.IDEESS)) map.set(s.IDEESS, s);
    }
    state.raw = [...map.values()];
    state.fecha = fecha;
    state.nota = nota;
    updateFecha();
    rememberVisit();
    seedOfficialHistory(ids[0]);
    applyFilters();
    checkAlerts();
    } catch (err) {
      if (resBox) resBox.replaceChildren(el("div", { class: "state error" },
        el("strong", { text: "No se han podido cargar los precios" }),
        String(err.message || err)
      ));
    }
  }

  function updateFecha() {
    const box = $("updated");
    if (!box) return;
    if (!state.fecha) {
      box.textContent = "Precios oficiales del Ministerio";
      return;
    }
    const m = String(state.fecha).match(/(\d{1,2}:\d{2})/);
    box.hidden = false;
    box.textContent = m ? `Actualizado a las ${m[1]}` : `Actualizado · ${state.fecha}`;
    box.title = [state.fecha, "Europe/Madrid", state.nota].filter(Boolean).join(" · ");
  }

  function applyFilters() {
    updateModeUI();
    if (state.mode === "ev") { applyEvFilters(); return; }
    const fuel = fuelOf();
    const origin = state.origin;
    let rows = state.raw.map((s) => enrich(s, origin)).filter((s) => s.price != null && s.lat != null);
    if (state.onlyPublic) rows = rows.filter((s) => (s.raw["Tipo Venta"] || "P") === "P");
    if (state.onlyFavs) rows = rows.filter((s) => state.favs.includes(s.id));
    if (origin && state.radius) rows = rows.filter((s) => s.dist != null && s.dist <= state.radius);
    if (state.openF === "now") rows = rows.filter((s) => openStatus(s.raw["Horario"]).open === true);
    else if (state.openF === "24h") rows = rows.filter((s) => is24h(s.raw["Horario"]));

    const prices = rows.map((s) => s.price);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const tank = Number(state.vehicle.tank) || 70;
    const cons = Number(state.vehicle.cons) || 6.7;

    for (const s of rows) {
      s.fill = s.price * tank;
      s.saveAvg = avg != null ? avg * tank - s.fill : null;
      s.saveMax = max != null ? max * tank - s.fill : null;
      s.detourKm = s.dist != null ? s.dist * 2 : null;
      s.detourCost = s.detourKm != null ? (s.detourKm * cons / 100) * s.price : null;
      s.net = s.saveAvg != null && s.detourCost != null ? s.saveAvg - s.detourCost : s.saveAvg;
      s.isBest = min != null && s.price === min;
      s.tag = null;
    }
    // Etiquetas: una por tarjeta como mucho
    if (rows.length > 1) {
      const cheapest = rows.filter((s) => s.isBest).sort((a, b) => (a.dist ?? 9e9) - (b.dist ?? 9e9))[0];
      if (cheapest) cheapest.tag = { cls: "cheap", text: "Más barata" };
      const nearest = rows.filter((s) => s.dist != null).sort((a, b) => a.dist - b.dist)[0];
      if (nearest && !nearest.tag) nearest.tag = { cls: "near", text: "Más cercana" };
      const bestNet = rows.filter((s) => s.net != null && s.net > 0.5).sort((a, b) => b.net - a.net)[0];
      if (bestNet && !bestNet.tag) bestNet.tag = { cls: "save", text: "Mejor ahorro" };
    }

    if (state.sort === "distance") rows.sort((a, b) => (a.dist ?? 9e9) - (b.dist ?? 9e9) || a.price - b.price);
    else if (state.sort === "net") rows.sort((a, b) => (b.net ?? -9e9) - (a.net ?? -9e9) || a.price - b.price);
    else rows.sort((a, b) => a.price - b.price || (a.dist ?? 9e9) - (b.dist ?? 9e9));

    state.filtered = rows;
    state.stats = { min, max, avg, tank, cons, fuel, n: rows.length };
    updateFiltersLabel();
    renderList();
    renderMap();
  }

  /* ——— render list ——— */
  function priceHTML(n, unit = "€/l") {
    if (n == null) return el("span", { class: "amount", text: "—" });
    return el("span", { class: "amount" }, fmtPrice(n), unit ? el("small", { text: unit }) : null);
  }

  function updatedHHMM() {
    const m = String(state.fecha || "").match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : "";
  }
  function sourceNote(text) {
    return el("p", { class: "source-note" }, icon("info", 13), el("span", { text }));
  }
  function brandMark(name) {
    const col = brandColor(name);
    const letter = (String(name || "?").trim().match(/[A-Za-zÀ-ÿ0-9]/) || ["?"])[0].toUpperCase();
    return el("div", { class: "brand", style: { "--brand": col }, "aria-hidden": "true" }, letter);
  }
  function starButton(on, onToggle, size = 18) {
    const b = el("button", {
      class: "star-btn" + (on ? " is-on" : ""), type: "button",
      "aria-label": on ? "Quitar de favoritas" : "Añadir a favoritas", "aria-pressed": on ? "true" : "false",
      onclick: (ev) => { ev.stopPropagation(); haptic(10); onToggle(); }
    }, icon("star", size, on ? "is-fill" : ""));
    return b;
  }
  function costCell(label, value, cls = "") {
    return el("div", {}, el("span", { text: label }), el("b", { class: cls, text: value }));
  }

  function otherPills(raw, currentKey) {
    const wrap = el("div", { class: "other-prices" });
    for (const f of FUELS) {
      if (f.key === currentKey) continue;
      const p = parsePrice(raw[f.key]);
      if (p == null) continue;
      wrap.append(el("span", { class: "pill" }, `${f.short} `, el("b", {}, fmtPrice(p))));
    }
    return wrap.childElementCount ? wrap : null;
  }

  function sparkline(id, fuelId) {
    const pts = [];
    for (const [day, rec] of Object.entries(state.history).sort()) {
      const v = rec.favs?.[id]?.[fuelId] ?? rec.avg?.[fuelId];
      if (v != null) pts.push(v);
    }
    if (pts.length < 2) return null;
    const min = Math.min(...pts), max = Math.max(...pts);
    const w = 88, h = 28, p = 2;
    const rng = max - min || 0.01;
    const d = pts.map((v, i) => {
      const x = p + (w - 2 * p) * (i / (pts.length - 1));
      const y = h - p - ((v - min) / rng) * (h - 2 * p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "spark");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("aria-hidden", "true");
    const poly = document.createElementNS(ns, "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "currentColor");
    poly.setAttribute("stroke-width", "1.6");
    poly.setAttribute("points", d);
    svg.appendChild(poly);
    return svg;
  }

  function stationCard(s, opts = {}) {
    const raw = s.raw;
    const card = el("article", {
      class: "card" + (s.isBest ? " is-best" : ""),
      role: "button",
      tabindex: "0"
    });
    card.addEventListener("click", (ev) => {
      if (ev.target.closest(".star-btn")) return;
      openStationSheet(s, opts);
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openStationSheet(s, opts); }
    });
    if (s.tag && !opts.along) card.append(el("span", { class: "badge tag " + s.tag.cls, text: s.tag.text }));

    const starOn = state.favs.includes(s.id);
    const status = openStatus(raw["Horario"]);
    const bits = [];
    if (opts.along && s.along != null) bits.push(fmtKm(s.along) + " de la ruta");
    else if (s.dist != null) bits.push(fmtKm(s.dist));
    const meta = el("div", { class: "card-meta" });
    if (bits.length) meta.append(bits.join(" · "));
    if (status.label) {
      if (bits.length) meta.append(" · ");
      meta.append(el("span", { class: status.open === true ? "is-open" : (status.open === false ? "is-closed" : "") }, is24h(raw["Horario"]) ? "24 h" : status.label));
    }

    const mid = el("div", { class: "card-main" },
      el("div", { class: "rotulo-row" },
        el("div", { class: "rotulo", text: raw["Rótulo"] || "Gasolinera" }),
        starButton(starOn, () => toggleFav(s), 16)
      ),
      meta
    );
    const price = el("div", { class: "price-block" },
      priceHTML(s.price),
      s.disc
        ? el("div", { class: "unit disc", text: `−${String(s.disc.cents).replace(".", ",")} cts · oficial ${fmtPrice(s.official)}` })
        : el("div", { class: "unit", text: fuelOf().short })
    );
    card.append(el("div", { class: "card-top" }, brandMark(raw["Rótulo"]), mid, price));

    if (!opts.skipTank && s.fill != null) {
      const net = s.net;
      card.append(el("div", { class: "card-costs" },
        costCell("Depósito", fmtEuro(s.fill, 0), "amb"),
        costCell("Ahorro neto", net == null ? "—" : (net >= 0.5 ? "+" + fmtEuro(net, 0) : net <= -0.5 ? fmtEuro(net, 0) : "0 €"), net == null ? "neutral" : net >= 0.5 ? "good" : net <= -0.5 ? "bad" : "neutral"),
        costCell("Desvío", s.detourKm != null ? fmtKm(s.detourKm) : "—", "neutral")
      ));
    }
    return card;
  }

  function directionsRow(lat, lon) {
    const g = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    const a = `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
    return el("div", { class: "detail-block" },
      el("h3", { class: "block-h", text: "Cómo llegar" }),
      el("div", { class: "card-actions" },
        el("a", { class: "dir-btn", href: g, target: "_blank", rel: "noopener", onclick: () => haptic() }, icon("nav", 16), "Google Maps"),
        el("a", { class: "dir-btn secondary", href: a, target: "_blank", rel: "noopener", onclick: () => haptic() }, icon("nav", 16), "Apple Maps")
      )
    );
  }

  function appLink(params) {
    const u = new URL(location.href);
    u.search = ""; u.hash = "";
    for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.searchParams.set(k, String(v));
    return u.toString();
  }

  async function doShare(title, text, url, fallbackBox) {
    haptic(10);
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (!fallbackBox) return;
    const full = text + "\n" + url;
    fallbackBox.hidden = false;
    fallbackBox.replaceChildren(
      el("button", { type: "button", class: "btn-ghost", onclick: async () => {
        try { await navigator.clipboard.writeText(full); toast("Enlace copiado"); }
        catch { window.prompt("Copia el enlace:", url); }
        haptic();
      } }, icon("copy", 16), "Copiar enlace"),
      el("a", { class: "btn-ghost", href: "https://wa.me/?text=" + encodeURIComponent(full), target: "_blank", rel: "noopener" }, icon("chat", 16), "WhatsApp")
    );
  }

  function shareRow(title, text, url) {
    const fb = el("div", { class: "actions-row share-fallback", hidden: true });
    const btn = el("button", { type: "button", class: "btn-ghost", onclick: () => doShare(title, text, url, fb) }, icon("share", 16), "Compartir");
    return { btn, fb };
  }

  function openStationSheet(s, opts = {}) {
    const fuel = opts.fuel || fuelOf();
    const raw = s.raw;
    const box = $("station-body");
    if (!box) return;
    box.replaceChildren();
    const status = openStatus(raw["Horario"]);
    box.append(el("div", { class: "detail-head" },
      brandMark(raw["Rótulo"]),
      el("div", {},
        el("h2", { id: "st-title", text: raw["Rótulo"] || "Gasolinera" }),
        el("p", { class: "detail-addr", text: formatAddress(raw) })
      )
    ));

    const chips = el("div", { class: "info-chips" });
    if (s.dist != null) chips.append(el("span", { class: "info-chip" }, icon("pin", 13), fmtKm(s.dist)));
    if (opts.along && s.along != null) chips.append(el("span", { class: "info-chip" }, icon("route", 13), fmtKm(s.along) + " de la ruta"));
    if (status.label) chips.append(el("span", { class: "info-chip" + (status.open ? " good" : "") }, icon("clock", 13), is24h(raw["Horario"]) ? "Abierto 24 h" : status.label));
    if ((raw["Tipo Venta"] || "") === "R") chips.append(el("span", { class: "info-chip" }, "Venta restringida"));

    const hero = el("div", { class: "hero card" },
      el("div", {},
        el("div", { class: "hero-k", text: fuel.label }),
        el("div", { class: "hero-big" }, fmtPrice(s.price), el("small", { text: "€/l" })),
        s.disc ? el("div", { class: "hero-sub", text: `Oficial ${fmtPrice(s.official)} · −${String(s.disc.cents).replace(".", ",")} cts ${s.disc.label}` }) : null
      ),
      s.fill != null ? el("div", { class: "hero-r" },
        el("strong", { text: fmtEuro(s.fill) }),
        el("span", { text: `Llenar ${String(state.stats?.tank ?? "").replace(".", ",")} l` })
      ) : null
    );
    box.append(hero, chips);

    // Cuándo repostar
    const adv = el("div", { class: "card advice", id: "advice-box" },
      el("div", { class: "block-top" }, el("h3", { class: "block-h", text: "Cuándo repostar" })),
      el("p", { class: "advice-text muted", text: "Consultando el histórico oficial de las últimas semanas…" })
    );
    box.append(adv);
    loadAdvice(s, fuel, adv);

    if (s.fill != null) {
      const t = el("div", { class: "card cost-card" }, el("h3", { class: "block-h", text: "Coste del depósito" }));
      const row = (k, sub, v, cls = "") => el("div", { class: "cl " + cls }, el("span", {}, k, sub ? el("small", { text: sub }) : null), el("b", { text: v }));
      t.append(row(`Llenar ${String(state.stats.tank).replace(".", ",")} l`, `${fmtPrice(s.price)} €/l`, fmtEuro(s.fill)));
      if (s.disc) t.append(row("Descuento tarjeta", `${s.disc.label} · aprox.`, "−" + fmtEuro((s.official - s.price) * state.stats.tank)));
      if (s.saveAvg != null) t.append(row("Frente a la media de la zona", `media ${fmtPrice(state.stats.avg)} €/l`, (s.saveAvg >= 0 ? "+" : "−") + fmtEuro(Math.abs(s.saveAvg))));
      if (s.detourCost != null) t.append(row("Desvío ida y vuelta", `${fmtKm(s.detourKm)} · ${String(state.stats.cons).replace(".", ",")} l/100 km`, "−" + fmtEuro(s.detourCost)));
      if (s.net != null) t.append(row("Ahorro neto", "", (s.net >= 0 ? "+" : "−") + fmtEuro(Math.abs(s.net)), "total" + (s.net < 0 ? " neg" : "")));
      box.append(t);
    }

    const others = otherPills(raw, fuel.key);
    if (others) box.append(el("div", { class: "detail-block" }, el("h3", { class: "block-h", text: "Otros carburantes" }), others));
    if (raw["Horario"] && !is24h(raw["Horario"])) box.append(el("div", { class: "detail-block" }, el("h3", { class: "block-h", text: "Horario" }), el("p", { class: "detail-hours", text: raw["Horario"] })));

    box.append(directionsRow(s.lat, s.lon));

    const priceTxt = s.official != null ? `${fuel.label} a ${fmtPrice(s.official)} €/l` : "";
    const text = [`${raw["Rótulo"] || "Gasolinera"} · ${priceTxt}`, formatAddress(raw)].filter(Boolean).join("\n");
    const url = appLink({ st: s.id, f: fuel.id, lat: s.lat?.toFixed(5), lon: s.lon?.toFixed(5) });
    const sh = shareRow(raw["Rótulo"] || "Gasolinera", text, url);
    const starOn = state.favs.includes(s.id);
    box.append(el("div", { class: "actions-row" },
      sh.btn,
      el("button", {
        type: "button",
        class: "btn-ghost" + (starOn ? " is-on" : ""),
        onclick: () => { haptic(10); toggleFav(s); openStationSheet(s, opts); }
      }, icon("star", 16, starOn ? "is-fill" : ""), starOn ? "En favoritas" : "Favorita")
    ), sh.fb);
    box.append(sourceNote(`Fuente: MITECO${updatedHHMM() ? " · actualizado " + updatedHHMM() : ""}. Precio comunicado por la estación.`));
    if (!$("sheet-station").classList.contains("is-on")) openSheet("sheet-station");
  }

  /* ——— Cuándo repostar: histórico oficial por municipio y producto ——— */
  function isoDaysAgo(i) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const p = madridParts(dt);
    return `${p.year}-${p.month}-${p.day}`;
  }
  async function pool(items, n, fn) {
    const q = [...items];
    await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => {
      while (q.length) await fn(q.shift());
    }));
  }
  async function histMuniDay(muni, pid, iso) {
    const ck = `${muni}|${pid}|${iso}`;
    if (state.histCache.has(ck)) return state.histCache.get(ck);
    const job = (async () => {
      try {
        const r = await fetch(`${API}/EstacionesTerrestresHist/FiltroMunicipioProducto/${histDate(iso)}/${muni}/${pid}`);
        if (!r.ok) return null; // algunos días el Ministerio responde 400: se cuentan como sin dato
        const data = await r.json();
        const m = new Map();
        for (const x of data.ListaEESSPrecio || []) {
          const p = parsePrice(x.PrecioProducto);
          if (p != null) m.set(x.IDEESS, p);
        }
        return m;
      } catch { return null; }
    })();
    state.histCache.set(ck, job);
    const res = await job;
    if (res == null) state.histCache.delete(ck);
    return res;
  }

  async function stationSeries(s, fuel) {
    const muni = s.raw.IDMunicipio, pid = PID[fuel.id];
    if (!muni || !pid) return null;
    const key = `${s.id}|${fuel.id}`;
    const store = loadLS("sth", {});
    const rec = store[key] || { d: {} };
    const want = [];
    for (let i = 1; i <= HIST_DAYS; i++) {
      const iso = isoDaysAgo(i);
      if (!(iso in rec.d)) want.push([iso, i]);
    }
    let failed = 0;
    await pool(want, 5, async ([iso, i]) => {
      const m = await histMuniDay(muni, pid, iso);
      if (m == null) { failed++; if (i > 3) rec.d[iso] = -1; return; }
      rec.d[iso] = m.has(s.id) ? m.get(s.id) : -1;
    });
    // Poda: solo la ventana y como mucho 40 series guardadas
    const keep = new Set(Array.from({ length: HIST_DAYS }, (_, i) => isoDaysAgo(i + 1)));
    for (const d of Object.keys(rec.d)) if (!keep.has(d)) delete rec.d[d];
    rec.t = Date.now();
    store[key] = rec;
    const keys = Object.keys(store).sort((a, b) => (store[b].t || 0) - (store[a].t || 0));
    for (const k of keys.slice(40)) delete store[k];
    saveLS("sth", store);
    const series = Object.entries(rec.d).filter(([, p]) => p > 0).map(([iso, p]) => ({ iso, p })).sort((a, b) => a.iso.localeCompare(b.iso));
    return { series, failed, asked: HIST_DAYS };
  }

  const DOW = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
  function dowOf(iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); }
  function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }

  function adviseFrom(series, today) {
    const pts = [...series];
    if (today != null) pts.push({ iso: todayISO(), p: today, today: true });
    const n = pts.length;
    const out = { n, past: series.length };
    if (series.length < 7 || today == null) { out.level = "few"; return out; }
    const past = series.map((x) => x.p);
    out.min = Math.min(...past, today);
    out.max = Math.max(...past, today);
    out.avg = mean(past);
    out.today = today;
    const below = past.filter((p) => p < today - 0.0005).length;
    const eq = past.filter((p) => Math.abs(p - today) <= 0.0005).length;
    out.pct = (below + eq / 2) / past.length;
    if (out.max - out.min < 0.006) out.level = "stable";
    else if (out.pct <= 0.3) out.level = "cheap";
    else if (out.pct >= 0.7) out.level = "expensive";
    else out.level = "normal";
    // Día de la semana: desviación frente a la media móvil de ±3 días (quita la tendencia)
    if (n >= 21) {
      const byDow = {};
      for (let i = 0; i < n; i++) {
        const w = pts.slice(Math.max(0, i - 3), Math.min(n, i + 4));
        if (w.length < 5) continue;
        const d = pts[i].p - mean(w.map((x) => x.p));
        (byDow[dowOf(pts[i].iso)] ||= []).push(d);
      }
      const ds = Object.entries(byDow).filter(([, v]) => v.length >= 3).map(([k, v]) => ({ dow: Number(k), m: mean(v), k: v.length, neg: v.filter((d) => d < -0.0005).length }));
      if (ds.length >= 5) {
        ds.sort((a, b) => a.m - b.m);
        const best = ds[0], worst = ds[ds.length - 1];
        out.wdChecked = true;
        // Solo lo afirmamos si la diferencia es apreciable y se repite casi todas las semanas
        if (worst.m - best.m >= 0.008 && best.m <= -0.004 && best.neg >= Math.ceil(best.k * 0.75)) out.wd = { dow: best.dow, cents: -best.m * 100, weeks: best.k, hits: best.neg };
      }
    }
    return out;
  }

  function seriesSpark(series, today) {
    const pts = series.map((x) => x.p);
    if (today != null) pts.push(today);
    if (pts.length < 2) return null;
    const min = Math.min(...pts), max = Math.max(...pts);
    const w = 300, h = 54, p = 4;
    const rng = max - min || 0.01;
    const xy = pts.map((v, i) => [p + (w - 2 * p) * (i / (pts.length - 1)), h - p - ((v - min) / rng) * (h - 2 * p)]);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "spark-wide");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    const area = document.createElementNS(SVGNS, "path");
    area.setAttribute("d", `M${xy[0][0]},${h} ` + xy.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${xy[xy.length - 1][0]},${h} Z`);
    area.setAttribute("class", "spark-area");
    const line = document.createElementNS(SVGNS, "polyline");
    line.setAttribute("points", xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    line.setAttribute("class", "spark-line");
    const dot = document.createElementNS(SVGNS, "circle");
    const last = xy[xy.length - 1];
    dot.setAttribute("cx", String(last[0])); dot.setAttribute("cy", String(last[1])); dot.setAttribute("r", "3.2");
    dot.setAttribute("class", "spark-dot");
    svg.append(area, line, dot);
    return svg;
  }

  async function loadAdvice(s, fuel, box) {
    const res = await stationSeries(s, fuel);
    if (!box.isConnected) return;
    const top = el("div", { class: "block-top" }, el("h3", { class: "block-h", text: "Cuándo repostar" }));
    box.replaceChildren(top);
    if (!res) {
      box.append(el("p", { class: "advice-text muted", text: "No hay histórico oficial para este carburante." }));
      return;
    }
    const today = s.official ?? s.price;
    const a = adviseFrom(res.series, today);
    const badges = { cheap: ["good", "Buen momento"], normal: ["neutral", "Precio normal"], expensive: ["bad", "Caro hoy"], stable: ["neutral", "Precio estable"] };
    if (badges[a.level]) top.append(el("span", { class: "badge " + badges[a.level][0], text: badges[a.level][1] }));
    let txt;
    if (a.level === "few") {
      txt = res.series.length
        ? `Aún hay poco histórico de esta estación (${res.series.length} ${res.series.length === 1 ? "día" : "días"} con precio). Hacen falta al menos 7 para valorarlo.`
        : "El Ministerio no tiene histórico de esta estación para estas fechas, así que no podemos valorar el precio de hoy.";
    } else {
      const rango = `${fmtPrice(a.min)}–${fmtPrice(a.max)} €/l`;
      txt = {
        cheap: `Hoy está en la parte baja de lo que ha cobrado en los últimos ${HIST_DAYS} días (${rango}).`,
        normal: `Hoy está dentro de lo habitual de los últimos ${HIST_DAYS} días (${rango}).`,
        expensive: `Hoy está en la parte alta de los últimos ${HIST_DAYS} días (${rango}). Si puedes, espera o mira otra cercana.`,
        stable: `Apenas cambia: ${rango} en los últimos ${HIST_DAYS} días. Da igual qué día repostes aquí.`
      }[a.level];
    }
    box.append(el("p", { class: "advice-text", text: txt }));
    if (a.level !== "few") {
      const sp = seriesSpark(res.series, today);
      if (sp) box.append(el("div", { class: "spark-wrap" }, sp, el("div", { class: "spark-axis" }, el("span", { text: `hace ${HIST_DAYS} días` }), el("span", { text: "hoy" }))));
      box.append(el("div", { class: "mini-stats" },
        costCell("Hoy", fmtPrice(a.today), "amb"),
        costCell("Media", fmtPrice(a.avg)),
        costCell("Mín. – máx.", `${fmtPrice(a.min)} – ${fmtPrice(a.max)}`)
      ));
      let wd;
      if (a.wd) wd = `Suele estar más barata los ${DOW[a.wd.dow]}: unos ${a.wd.cents.toFixed(1).replace(".", ",")} cts/l por debajo de su media semanal (${a.wd.hits} de ${a.wd.weeks} semanas).`;
      else if (a.wdChecked) wd = "No hay un día de la semana claramente más barato en esta estación.";
      else wd = "Para saber qué día suele ser más barata hacen falta al menos tres semanas de datos.";
      box.append(el("p", { class: "advice-wd" }, icon("calendar", 14), el("span", { text: wd })));
    }
    const got = res.series.length;
    box.append(sourceNote(`Histórico oficial del Ministerio · ${got} de ${HIST_DAYS} días con precio${res.failed ? ` · ${res.failed} sin respuesta` : ""}.`));
  }

  function favStrip() {
    if (!state.favs.length) return null;
    const meta = loadLS("favMeta", {});
    const fuel = fuelOf();
    const strip = el("div", { class: "fav-strip", role: "list", "aria-label": "Favoritas" });
    for (const id of state.favs.slice(0, 6)) {
      const raw = state.raw.find((x) => x.IDEESS === id);
      const m = meta[id] || {};
      const name = raw?.["Rótulo"] || m.rotulo || "Favorita";
      const p = raw ? enrich(raw, state.origin).price : null;
      strip.append(el("button", { type: "button", class: "fav-chip", role: "listitem", onclick: () => { haptic(); openFavorite(id); } },
        icon("star", 14, "is-fill"),
        el("span", { class: "fav-name", text: name }),
        p != null ? el("b", { text: fmtPrice(p) }) : el("small", { text: m.loc ? String(m.loc).trim().toLowerCase() : fuel.short })
      ));
    }
    return strip;
  }

  function renderList() {
    if (state.mode === "ev") { renderEvList(); return; }
    const box = $("results");
    box.replaceChildren();
    if (!state.origin) {
      box.append(el("div", { class: "state" },
        el("strong", { text: "¿Dónde miramos?" }),
        "Activa la ubicación o escribe una localidad, una dirección o un código postal."
      ));
      return;
    }
    const fs = favStrip();
    if (fs) box.append(fs);
    if (!state.filtered.length) {
      const fuel = fuelOf();
      const extra = state.openF !== "any" ? " o quita el filtro de horario" : "";
      box.append(el("div", { class: "state" },
        el("strong", { text: "Sin estaciones con " + fuel.label }),
        `No hay ninguna en ${state.radius} km con estos filtros. Prueba a ampliar el radio${extra}.`
      ));
      return;
    }
    const st = state.stats;
    box.append(el("div", { class: "summary" },
      el("span", {}, el("b", { text: String(st.n) }), ` en ${state.radius} km`),
      el("span", {}, "desde ", el("b", { text: fmtPrice(st.min) }), " €/l")
    ));
    for (const s of state.filtered) box.append(stationCard(s));
    const cards = Object.values(state.cards).some((c) => c.on);
    box.append(sourceNote(`Fuente: MITECO${updatedHHMM() ? " · actualizado " + updatedHHMM() : ""}${cards ? " · con tus descuentos aproximados" : ""}`));
  }

  async function openFavorite(id) {
    const meta = loadLS("favMeta", {})[id] || {};
    let raw = state.raw.find((x) => x.IDEESS === id);
    if (!raw && meta.lat != null) {
      try {
        const packs = await Promise.all(provincesFor(meta.lat, meta.lon, 1).map(fetchProvince));
        for (const p of packs) { raw = p.lista.find((x) => x.IDEESS === id); if (raw) break; }
      } catch {}
    }
    if (!raw) { toast("No se ha podido cargar esa favorita"); return; }
    if (state.mode === "ev") setMode("fuel");
    const s = state.filtered.find((x) => x.id === id) || withCosts(enrich(raw, state.origin));
    openStationSheet(s);
  }

  /* Costes de una estación suelta (favorita fuera del radio o enlace compartido) */
  function withCosts(s) {
    const tank = Number(state.vehicle.tank) || 70;
    const cons = Number(state.vehicle.cons) || 6.7;
    state.stats = state.stats || { tank, cons };
    if (s.price == null) return s;
    s.fill = s.price * tank;
    s.detourKm = s.dist != null ? s.dist * 2 : null;
    s.detourCost = s.detourKm != null ? (s.detourKm * cons / 100) * s.price : null;
    const avg = state.stats?.avg;
    s.saveAvg = avg != null ? avg * tank - s.fill : null;
    s.net = s.saveAvg != null && s.detourCost != null ? s.saveAvg - s.detourCost : s.saveAvg;
    return s;
  }

  /* ——— map ——— */
  function priceColor(price, min, max) {
    if (price == null || min == null) return "#f5b942";
    if (max <= min) return "#5ee0a0";
    const t = (price - min) / (max - min);
    const stops = t < 0.5
      ? lerp3([94, 224, 160], [245, 185, 66], t * 2)
      : lerp3([245, 185, 66], [255, 107, 107], (t - 0.5) * 2);
    return `rgb(${stops.join(",")})`;
  }
  function lerp3(a, b, t) {
    return a.map((x, i) => Math.round(x + (b[i] - x) * t));
  }


  function attachTiles(map, which) {
    if (state._tileLayers && state._tileLayers[which]) {
      map.removeLayer(state._tileLayers[which]);
    }
    const layer = L.tileLayer(TILES, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    state._tileLayers = state._tileLayers || {};
    state._tileLayers[which] = layer;
  }
  function refreshMapTiles() {
    // CSS --map-filter already switches with the theme (OSM inverted in dark, uninverted in Claro).
    // Re-invalidate so tiles repaint after the filter change.
    for (const which of Object.keys(state.maps || {})) {
      try { state.maps[which].invalidateSize(); } catch {}
    }
  }

  function ensureMap(which) {
    const id = which === "route" ? "route-map" : "map";
    if (state.maps[which]) {
      setTimeout(() => state.maps[which].invalidateSize(), 80);
      return state.maps[which];
    }
    const map = L.map(id, { zoomControl: true, attributionControl: true });
    attachTiles(map, which);
    if (which === "main") {
      const legend = L.control({ position: "bottomright" });
      legend.onAdd = () => {
        const d = L.DomUtil.create("div", "legend");
        d.id = "map-legend";
        d.innerHTML = "Barato <div class='legend-scale'></div> Caro";
        return d;
      };
      legend.addTo(map);
    }
    state.maps[which] = map;
    return map;
  }

  function pricePin(s, st, opts = {}) {
    const col = s.isBest ? "#ffe08a" : priceColor(s.price, st.min, st.max);
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin${s.isBest ? " is-best" : ""}" style="border-color:${col};color:${s.isBest ? "#1a1408" : col}">${fmtPrice(s.price)}</div>`,
      iconSize: [46, 18],
      iconAnchor: [23, 18]
    });
    const m = L.marker([s.lat, s.lon], { icon, title: s.raw["Rótulo"], price: s.price, riseOnHover: true });
    m.on("click", () => openStationSheet(s, opts));
    return m;
  }

  function clusterGroup(st) {
    return L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 68,
      iconCreateFunction(cl) {
        const prices = cl.getAllChildMarkers().map((m) => m.options.price).filter((n) => n != null);
        const minP = prices.length ? Math.min(...prices) : null;
        const col = priceColor(minP, st.min, st.max);
        return L.divIcon({
          className: "cluster-icon",
          html: `<div class="cluster-bubble" style="--c:${col}"><b>${fmtPrice(minP)}</b><small>${cl.getChildCount()}</small></div>`,
          iconSize: [56, 40],
          iconAnchor: [28, 20]
        });
      }
    });
  }

  function renderMap() {
    const pane = $("map-pane");
    const show = state.mapOpen || window.matchMedia("(min-width: 900px)").matches;
    if (state.view === "nearby") pane.hidden = !show;
    $("workspace").classList.toggle("map-open", state.mapOpen);
    if (state.view !== "nearby") return;
    if (!show) return;
    const map = ensureMap("main");
    if (state.maps.mainLayer) {
      try { map.removeLayer(state.maps.mainLayer); } catch {}
    }
    if (state.maps.mainUser) {
      try { map.removeLayer(state.maps.mainUser); } catch {}
    }
    const ev = state.mode === "ev";
    const st = state.stats || {};
    const layer = ev ? evClusterGroup() : clusterGroup(st);
    state.maps.mainLayer = layer;
    const list = ev ? state.ev.filtered : state.filtered;
    if (ev) for (const x of list) layer.addLayer(evPin(x));
    else for (const s of list) layer.addLayer(pricePin(s, st));
    map.addLayer(layer);
    setLegend(ev);
    if (state.origin) {
      const icon = L.divIcon({ className: "", html: '<div class="user-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      state.maps.mainUser = L.marker([state.origin.lat, state.origin.lon], { icon, zIndexOffset: 1000, title: "Tu punto de búsqueda" }).addTo(map);
    }
    const pts = ev ? list.map((x) => [x.la, x.lo]) : list.map((s) => [s.lat, s.lon]);
    if (state.origin) pts.push([state.origin.lat, state.origin.lon]);
    if (pts.length && !state.maps.fitted) {
      map.fitBounds(pts, { padding: [32, 32], maxZoom: 13 });
      state.maps.fitted = true;
    } else if (!pts.length && state.origin) {
      map.setView([state.origin.lat, state.origin.lon], 12);
    }
    setTimeout(() => map.invalidateSize(), 120);
  }

  /* ——— search / location ——— */
  function setOrigin(lat, lon, label, source) {
    state.origin = { lat, lon, label, source };
    if (source === "geo") state.home = { lat, lon };
    state.maps.fitted = false;
    renderPlaceLine();
    $("btn-locate").classList.toggle("is-active", source === "geo");
    if ($("route-origin") && source === "geo" && !$("route-origin").value) {
      $("route-origin").placeholder = "Mi ubicación";
    }
    if (state.mode === "ev") return loadEvAround(lat, lon, state.radius);
    return loadAround(lat, lon, state.radius);
  }

  function renderPlaceLine() {
    const line = $("place-line");
    const o = state.origin;
    if (!o) return;
    line.replaceChildren();
    if (o.source === "geo") {
      line.append(icon("locate", 13), el("span", { text: "Cerca de ti" }));
      return;
    }
    line.append(icon("pin", 13), el("span", { class: "place-label", text: o.label }));
    line.append(el("button", { type: "button", class: "text-link back-home", onclick: () => { haptic(); $("search-input").value = ""; requestGeo(); } },
      icon("locate", 13), "Mi ubicación"));
  }

  function searchPlaces(q, limit = 8) {
    const p = state.places;
    if (!p || !q) return [];
    const nq = norm(q);
    const out = [];
    if (/^\d{5}$/.test(q.trim())) {
      for (const c of p.codigos) if (c.cp === q.trim()) out.push({ kind: "CP", label: `${c.cp} · ${c.n}`, lat: c.lat, lon: c.lon, p: c.p });
    }
    // Orden: coincidencia exacta, empieza por, contiene; dentro de cada grupo, el nombre más corto primero
    const rank = (name) => {
      const n = norm(name);
      if (n === nq) return 0;
      if (n.startsWith(nq + " ") || n.startsWith(nq)) return 1;
      if (n.includes(nq)) return 2;
      if (n.length >= 4 && (" " + nq + " ").includes(" " + n + " ")) return 3; // el municipio aparece como palabra en la búsqueda
      return -1;
    };
    const cand = [];
    for (const m of p.municipios) { const r = rank(m.n); if (r >= 0) cand.push({ r, k: 0, kind: "Municipio", label: m.n, lat: m.lat, lon: m.lon, p: m.p }); }
    for (const m of p.localidades) { const r = rank(m.n); if (r >= 0 && r < 3) cand.push({ r, k: 1, kind: "Localidad", label: m.n, lat: m.lat, lon: m.lon, p: m.p }); }
    cand.sort((x, y) => x.r - y.r || x.k - y.k || x.label.length - y.label.length);
    out.push(...cand);
    const seen = new Set();
    const uniq = [];
    for (const x of out) {
      const k = x.label + x.lat;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(x);
      if (uniq.length >= limit) break;
    }
    return uniq;
  }

  async function geocodeFree(q) {
    const local = searchPlaces(q, 5);
    if (local.length && (norm(local[0].label) === norm(q) || /^\d{5}$/.test(q.trim()))) return local;
    try {
      // Photon no acepta lang=es (responde 400); sin lang devuelve los nombres locales. Sesgo hacia la zona actual.
      const bias = state.origin ? `&lat=${state.origin.lat.toFixed(3)}&lon=${state.origin.lon.toFixed(3)}` : "&lat=40.4&lon=-3.7";
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${bias}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        const extra = (data.features || [])
          .filter((f) => (f.properties?.countrycode || "").toLowerCase() === "es")
          .map((f) => {
            const pr = f.properties || {};
            const street = pr.street ? pr.street + (pr.housenumber ? " " + pr.housenumber : "") : "";
            const place = pr.city || pr.town || pr.village || pr.county || "";
            const parts = [pr.name && pr.name !== place ? pr.name : "", street, place].filter(Boolean);
            const label = (parts.length ? parts : [pr.state || ""]).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
            const kind = pr.osm_key === "place" ? "Lugar" : street ? "Dirección" : "Sitio";
            return { kind, label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
          });
        return [...local, ...extra].slice(0, 8);
      }
    } catch {}
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=es&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const data = await r.json();
        return data.map((d) => ({ kind: "Dirección", label: d.display_name, lat: Number(d.lat), lon: Number(d.lon) }));
      }
    } catch {}
    return local;
  }

  function showSuggest(items, box, onPick) {
    box.replaceChildren();
    if (!items.length) { box.hidden = true; return; }
    for (const it of items) {
      const b = el("button", { type: "button", onclick: () => { onPick(it); box.hidden = true; } },
        el("span", { text: it.label }),
        el("span", { class: "tag", text: it.kind })
      );
      box.append(el("li", {}, b));
    }
    box.hidden = false;
  }

  function requestGeo() {
    if (!navigator.geolocation) {
      $("place-line").textContent = "Este navegador no ofrece ubicación. Escribe una localidad o un código postal.";
      return;
    }
    $("place-line").textContent = "Obteniendo ubicación…";
    navigator.geolocation.getCurrentPosition(
      (pos) => { const r = setOrigin(pos.coords.latitude, pos.coords.longitude, "Tu ubicación", "geo"); if (state.onGeo) { const f = state.onGeo; state.onGeo = null; Promise.resolve(r).then(f); } },
      (err) => {
        const msg = err.code === 1
          ? "No hay permiso de ubicación. Escribe una localidad o un código postal."
          : "No se ha podido obtener la ubicación. Prueba a buscar un pueblo o un CP.";
        $("place-line").textContent = msg;
        if (state.onGeo) { const f = state.onGeo; state.onGeo = null; f(); }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  /* ——— favourites, alerts, history ——— */
  function toggleFav(s) {
    const i = state.favs.indexOf(s.id);
    if (i >= 0) state.favs.splice(i, 1);
    else state.favs.push(s.id);
    haptic(10);
    saveLS("favs", state.favs);
    saveLS("favMeta", {
      ...(loadLS("favMeta", {})),
      [s.id]: { rotulo: s.raw["Rótulo"], dir: s.raw["Dirección"], loc: s.raw["Localidad"], lat: s.lat, lon: s.lon }
    });
    persistCfg();
    applyFilters();
    renderFavList();
  }

  function rememberVisit() {
    if (!state.raw.length) return;
    const day = todayISO();
    const rec = state.history[day] || { avg: {}, favs: {}, area: state.origin?.label || "", official: false };
    const origin = state.origin;
    for (const f of FUELS) {
      const prices = state.raw.map((s) => {
        const en = enrich(s, origin);
        if (state.onlyPublic && (s["Tipo Venta"] || "P") !== "P") return null;
        if (origin && en.dist != null && en.dist > state.radius) return null;
        return parsePrice(s[f.key]);
      }).filter((n) => n != null);
      if (prices.length) rec.avg[f.id] = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 1000) / 1000;
    }
    rec.favs = rec.favs || {};
    for (const id of state.favs) {
      const s = state.raw.find((x) => x.IDEESS === id);
      if (!s) continue;
      rec.favs[id] = rec.favs[id] || { name: s["Rótulo"] };
      for (const f of FUELS) {
        const p = parsePrice(s[f.key]);
        if (p != null) rec.favs[id][f.id] = p;
      }
    }
    rec.area = state.origin?.label || rec.area;
    state.history[day] = rec;
    const days = Object.keys(state.history).sort();
    if (days.length > 60) for (const d of days.slice(0, days.length - 60)) delete state.history[d];
    saveLS("history", state.history);
  }

  async function seedOfficialHistory(provId) {
    if (!provId) return;
    const today = todayISO();
    const missing = [];
    for (let i = 1; i <= 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const p = madridParts(dt);
      const iso = `${p.year}-${p.month}-${p.day}`;
      if (!state.history[iso]?.official) missing.push(iso);
    }
    for (const iso of missing) {
      try {
        const url = `${API}/EstacionesTerrestresHist/FiltroProvincia/${histDate(iso)}/${provId}`;
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        const lista = data.ListaEESSPrecio || [];
        const rec = state.history[iso] || { avg: {}, favs: {}, area: "", official: true };
        rec.official = true;
        for (const f of [FUEL_BY_ID.goa, FUEL_BY_ID.g95, FUEL_BY_ID.g98, FUEL_BY_ID.gop, FUEL_BY_ID.glp]) {
          const prices = lista.map((s) => parsePrice(s[f.key])).filter((n) => n != null);
          if (prices.length) rec.avg[f.id] = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 1000) / 1000;
        }
        rec.favs = rec.favs || {};
        for (const id of state.favs) {
          const s = lista.find((x) => x.IDEESS === id);
          if (!s) continue;
          rec.favs[id] = rec.favs[id] || { name: s["Rótulo"] };
          for (const f of FUELS) {
            const p = parsePrice(s[f.key]);
            if (p != null) rec.favs[id][f.id] = p;
          }
        }
        rec.area = rec.area || `Provincia (oficial ${iso})`;
        state.history[iso] = rec;
        saveLS("history", state.history);
      } catch {}
    }
    if (state.view === "nearby") renderList();
    renderHistoryBox();
  }

  function checkAlerts() {
    const banner = $("alert-banner");
    const hits = [];
    for (const id of state.favs) {
      const s = state.raw.find((x) => x.IDEESS === id);
      if (!s) continue;
      for (const [fid, th] of Object.entries(state.alerts)) {
        const t = Number(th);
        if (!t) continue;
        const f = FUEL_BY_ID[fid];
        if (!f) continue;
        const p = parsePrice(s[f.key]);
        if (p != null && p <= t) hits.push({ name: s["Rótulo"], fuel: f.label, price: p, th: t });
      }
    }
    if (!hits.length) { banner.classList.remove("is-on"); banner.replaceChildren(); return; }
    const first = hits[0];
    banner.classList.add("is-on");
    banner.replaceChildren(
      `${hits.length} alerta${hits.length > 1 ? "s" : ""}: ${first.name} tiene ${first.fuel} a ${fmtPrice(first.price)} €/l (umbral ${fmtPrice(first.th)}). `,
      el("button", { type: "button", onclick: () => openSheet("sheet-alerts") }, "Ver")
    );
    if (window.Notification && Notification.permission === "granted" && !sessionStorage.getItem(LS + "notif-shown")) {
      try {
        new Notification("Surtidor: precio por debajo del umbral", {
          body: `${first.name}: ${first.fuel} a ${fmtPrice(first.price)} €/l`,
          icon: "icons/icon-192.png"
        });
        sessionStorage.setItem(LS + "notif-shown", "1");
      } catch {}
    }
  }

  function renderFavList() {
    const box = $("fav-list");
    if (!box) return;
    box.replaceChildren(el("h2", { text: "Favoritas" }));
    const meta = loadLS("favMeta", {});
    if (!state.favs.length) {
      box.append(el("p", { class: "lead", text: "Toca la estrella de una estación para guardarla en este dispositivo." }));
      return;
    }
    for (const id of state.favs) {
      const s = state.raw.find((x) => x.IDEESS === id);
      const m = meta[id] || {};
      const name = s?.["Rótulo"] || m.rotulo || id;
      const prices = FUELS.map((f) => {
        const p = s ? parsePrice(s[f.key]) : state.history[todayISO()]?.favs?.[id]?.[f.id];
        return p != null ? `${f.short} ${fmtPrice(p)}` : null;
      }).filter(Boolean).slice(0, 5).join(" · ");
      box.append(el("div", { class: "log-item" }, el("b", { text: name }), el("div", { text: prices || "Sin precio cargado aún" })));
    }
  }

  function renderHistoryBox() {
    const box = $("history-box");
    if (!box) return;
    box.replaceChildren(el("h2", { text: "Tendencia" }));
    const days = Object.keys(state.history).sort();
    if (days.length < 1) {
      box.append(el("p", { class: "lead", text: "Iremos guardando los precios que veas. También pedimos al Ministerio los de la última semana en tu provincia." }));
      return;
    }
    const fuel = fuelOf();
    const lines = days.map((d) => {
      const av = state.history[d].avg?.[fuel.id];
      return av != null ? `${d}: media ${fmtPrice(av)} €/l` : null;
    }).filter(Boolean);
    box.append(el("p", { class: "note", text: lines.slice(-8).join("  ·  ") + (lines.length ? "" : " Aún no hay media de " + fuel.label) }));
  }

  function renderAlertFields() {
    const box = $("alert-fields");
    box.replaceChildren();
    const mains = ["goa", "gop", "g95", "g98", "glp"];
    for (const id of mains) {
      const f = FUEL_BY_ID[id];
      const wrap = el("div", {},
        el("label", { for: "al-" + id, text: f.label + " · umbral €/l" }),
        el("input", { id: "al-" + id, type: "number", step: "0.001", min: "0", inputmode: "decimal", value: state.alerts[id] || "" })
      );
      box.append(wrap);
    }
  }

  /* ——— vehicle ——— */
  let pickMake = DEFAULT_VEHICLE.make, pickModel = DEFAULT_VEHICLE.model;

  function renderVehicleKind() {
    const evOn = !!state.vehicle.ev?.on;
    document.querySelectorAll("[data-vkind]").forEach((b) => b.classList.toggle("is-active", (b.dataset.vkind === "ev") === evOn));
    $("veh-ice").hidden = evOn;
    $("veh-ev").hidden = !evOn;
    const e = state.vehicle.ev || {};
    $("veh-kwh").value = e.kwh ?? 60;
    $("veh-kwhcons").value = e.cons ?? 16;
    $("veh-dc").value = e.dc ?? 100;
    $("veh-ac").value = e.ac ?? 11;
  }

  function renderVehicleSheet() {
    renderVehicleKind();
    const data = state.vehicles;
    $("veh-tank").value = state.vehicle.tank;
    $("veh-cons").value = state.vehicle.cons;
    $("veh-note").textContent = (state.vehicle.note || "") + " " + (data?.meta?.note || "");
    const q = norm($("veh-make-filter").value);
    const makes = (data?.makes || []).filter((m) => !q || norm(m.name).includes(q));
    const mkBox = $("veh-makes");
    mkBox.replaceChildren();
    for (const m of makes) {
      mkBox.append(el("button", {
        type: "button",
        class: m.name === pickMake ? "is-active" : "",
        onclick: () => { pickMake = m.name; pickModel = m.models[0]?.name; renderVehicleSheet(); }
      }, m.name));
    }
    const make = (data?.makes || []).find((m) => m.name === pickMake) || makes[0];
    const mdBox = $("veh-models");
    mdBox.replaceChildren();
    if (!make) return;
    for (const md of make.models) {
      mdBox.append(el("button", {
        type: "button",
        class: md.name === pickModel ? "is-active" : "",
        onclick: () => { pickModel = md.name; renderVehicleSheet(); }
      }, md.name));
    }
    const model = make.models.find((m) => m.name === pickModel) || make.models[0];
    const vb = $("veh-variants");
    vb.replaceChildren();
    if (!model) return;
    for (const v of model.variants) {
      const label = `${v.yearFrom}–${v.yearTo} · ${v.engine} · ${v.tank} l · ${String(v.cons).replace(".", ",")} l/100 km`;
      const active = state.vehicle.make === make.name && state.vehicle.model === model.name && state.vehicle.engine === v.engine && state.vehicle.yearFrom === v.yearFrom;
      vb.append(el("button", {
        type: "button",
        class: active ? "is-active" : "",
        onclick: () => {
          state.vehicle = { make: make.name, model: model.name, ...v };
          $("veh-tank").value = v.tank;
          $("veh-cons").value = v.cons;
          $("veh-note").textContent = (v.note || "") + " " + (data.meta?.note || "");
          renderVehicleSheet();
        }
      }, label));
    }
  }

  function saveVehicle() {
    state.vehicle.tank = Number($("veh-tank").value) || state.vehicle.tank;
    state.vehicle.cons = Number($("veh-cons").value) || state.vehicle.cons;
    const evOn = document.querySelector('[data-vkind="ev"]').classList.contains("is-active");
    state.vehicle.ev = {
      on: evOn,
      kwh: Number($("veh-kwh").value) || 60,
      cons: Number($("veh-kwhcons").value) || 16,
      dc: Number($("veh-dc").value) || 100,
      ac: Number($("veh-ac").value) || 11
    };
    saveLS("vehicle", state.vehicle);
    haptic(10);
    closeSheets();
    if (evOn && state.mode !== "ev") setMode("ev");
    else if (!evOn && state.mode === "ev") setMode("fuel");
    else applyFilters();
    updateFiltersLabel();
  }

  /* ——— route ——— */
  let routeOrigin = null, routeDest = null, routeTimer = 0;

  function distToRouteKm(lat, lon, coords) {
    let min = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i], b = coords[i + 1];
      const d = distPointToSegKm(lat, lon, a[1], a[0], b[1], b[0]);
      if (d < min) min = d;
    }
    return min;
  }
  function distPointToSegKm(lat, lon, aLat, aLon, bLat, bLon) {
    const k = Math.cos(lat * Math.PI / 180);
    const ax = aLon * k, ay = aLat, bx = bLon * k, by = bLat, px = lon * k, py = lat;
    const dx = bx - ax, dy = by - ay;
    const den = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / den));
    return Math.hypot((px - (ax + t * dx)) * 111.32, (py - (ay + t * dy)) * 110.57);
  }

  async function runRoute() {
    const status = $("route-status");
    let o = routeOrigin;
    if (!o && state.origin) o = { lat: state.origin.lat, lon: state.origin.lon, label: "Mi ubicación" };
    const destQ = $("route-dest").value.trim();
    let d = routeDest;
    if (!d && destQ) {
      const found = await geocodeFree(destQ);
      if (found[0]) d = found[0];
    }
    if (!o || !d) {
      status.textContent = "Indica origen y destino. El origen puede ser tu ubicación.";
      return;
    }
    $("route-suggest").hidden = true;
    status.textContent = "Calculando ruta…";
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=geojson`;
      const r = await fetch(url);
      const data = await r.json();
      if (!data.routes?.length) throw new Error("no route");
      const coords = data.routes[0].geometry.coordinates;
      const km = (data.routes[0].distance || 0) / 1000;
      let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
      for (const [lon, lat] of coords) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }
      const pad = 0.03;
      const ids = (state.places?.provincias || []).filter((p) => {
        const [a, b, c, d2] = p.b;
        return !(c < minLat - pad || a > maxLat + pad || d2 < minLon - pad || b > maxLon + pad);
      }).map((p) => p.id);
      const packs = await Promise.all((ids.length ? ids : provincesFor(o.lat, o.lon, 50)).map(fetchProvince));
      const mapS = new Map();
      for (const p of packs) for (const s of p.lista) if (s.IDEESS) mapS.set(s.IDEESS, s);
      const fuel = fuelOf();
      let rows = [...mapS.values()].map((s) => {
        const en = enrich(s, o);
        en.along = (en.lat != null) ? distToRouteKm(en.lat, en.lon, coords) : 99;
        return en;
      }).filter((s) => s.price != null && s.along <= CORRIDOR_KM);
      if (state.onlyPublic) rows = rows.filter((s) => (s.raw["Tipo Venta"] || "P") === "P");
      const prices = rows.map((x) => x.price);
      const min = prices.length ? Math.min(...prices) : null;
      const max = prices.length ? Math.max(...prices) : null;
      const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      const tank = Number(state.vehicle.tank) || 70;
      const cons = Number(state.vehicle.cons) || 6.7;
      for (const s of rows) {
        s.fill = s.price * tank;
        s.saveAvg = avg != null ? avg * tank - s.fill : null;
        s.saveMax = max != null ? max * tank - s.fill : null;
        s.isBest = min != null && s.price === min;
        s.detourKm = s.along != null ? s.along * 2 : null;
        s.detourCost = s.detourKm != null ? (s.detourKm * cons / 100) * s.price : null;
        s.net = s.saveAvg != null && s.detourCost != null ? s.saveAvg - s.detourCost : s.saveAvg;
      }
      rows.sort((a, b) => a.price - b.price || a.along - b.along);
      state.routeStations = rows;
      state.stats = { ...(state.stats || {}), min, max, avg, tank, cons, fuel, n: rows.length };
      status.textContent = `${rows.length} estaciones · ${fmtKm(km)}`;
      const box = $("route-results");
      box.replaceChildren();
      if (!rows.length) box.append(el("div", { class: "state" }, el("strong", { text: "Nada en el pasillo de la ruta" }), "Prueba otro carburante o un destino más largo."));
      else rows.forEach((s) => box.append(stationCard(s, { along: true })));
      const map = ensureMap("route");
      if (state.maps.routeLayer) {
        try { map.removeLayer(state.maps.routeLayer); } catch {}
      }
      const stR = { min, max };
      const layer = L.layerGroup();
      const clusters = clusterGroup(stR);
      state.maps.routeLayer = layer;
      const latlngs = coords.map((c) => [c[1], c[0]]);
      L.polyline(latlngs, { color: (getComputedStyle(document.documentElement).getPropertyValue("--route-line").trim() || "#2ec9b3"), weight: 4, opacity: 0.85 }).addTo(layer);
      L.marker([o.lat, o.lon], { title: "Origen" }).addTo(layer);
      L.marker([d.lat, d.lon], { title: "Destino" }).addTo(layer);
      for (const s of rows) clusters.addLayer(pricePin(s, stR, { along: true }));
      layer.addLayer(clusters);
      layer.addTo(map);
      map.fitBounds(latlngs, { padding: [24, 24] });
      setTimeout(() => map.invalidateSize(), 150);
    } catch (e) {
      status.textContent = "No se ha podido calcular la ruta (servicio OSRM). Inténtalo de nuevo en un momento.";
    }
  }

  /* ——— log / monthly ——— */
  function enrichLog() {
    const items = [...state.log].sort((a, b) => String(a.date).localeCompare(b.date) || (a.odo || 0) - (b.odo || 0));
    let prev = null;
    for (const it of items) {
      it.consReal = null;
      it.costKm = null;
      it.km = null;
      if (it.odo && prev?.odo && it.odo > prev.odo && it.litres) {
        it.km = it.odo - prev.odo;
        it.consReal = it.litres / it.km * 100;
        it.costKm = it.total / it.km;
      }
      if (it.odo) prev = it;
    }
    return items.reverse();
  }

  function renderLog() {
    const items = enrichLog();
    const box = $("log-list");
    box.replaceChildren();
    if (!items.length) {
      box.append(el("div", { class: "state" }, el("strong", { text: "Aún no hay repostajes" }), "Guarda el primero para ver consumo real y el gasto del mes."));
    } else {
      for (const it of items) {
        const div = el("div", { class: "log-item" },
          el("b", { text: `${it.date} · ${it.station || "Estación"}` }),
          el("div", { text: `${it.fuelLabel || it.fuel} · ${String(it.litres).replace(".", ",")} l · ${fmtPrice(it.price)} €/l · ${fmtEuro(it.total)}` })
        );
        if (it.consReal != null) {
          div.append(el("div", { text: `Consumo real ${fmtPrice(it.consReal).replace(/0+$/, "0")} l/100 km · ${fmtEuro(it.costKm, 3)}/km · ${it.km} km` }));
        }
        const del = el("button", { type: "button", class: "btn-ghost", style: { marginTop: "8px", height: "34px" }, onclick: () => {
          state.log = state.log.filter((x) => x.id !== it.id);
          saveLS("log", state.log);
          renderLog();
        } }, "Borrar");
        div.append(del);
        box.append(div);
      }
    }
    renderMonthly(items);
    const dl = $("log-station-list");
    dl.replaceChildren();
    const names = new Set(state.filtered.map((s) => s.raw["Rótulo"]).filter(Boolean));
    for (const n of names) dl.append(el("option", { value: n }));
    const sel = $("log-fuel");
    if (!sel.options.length) {
      for (const f of FUELS) sel.append(el("option", { value: f.id, text: f.label }));
      sel.value = state.fuelId;
    }
  }

  function renderMonthly(items) {
    const by = {};
    for (const it of items) {
      const m = String(it.date || "").slice(0, 7);
      if (!m) continue;
      if (!by[m]) by[m] = { litres: 0, euros: 0, n: 0 };
      by[m].litres += Number(it.litres) || 0;
      by[m].euros += Number(it.total) || 0;
      by[m].n += 1;
    }
    const months = Object.keys(by).sort();
    const cur = todayISO().slice(0, 7);
    const now = by[cur] || { litres: 0, euros: 0, n: 0 };
    const prevKey = months.filter((m) => m < cur).pop();
    const prev = prevKey ? by[prevKey] : null;
    $("month-stats").replaceChildren(
      el("div", { class: "stat" }, el("span", { text: "Este mes" }), el("strong", { text: fmtEuro(now.euros) })),
      el("div", { class: "stat" }, el("span", { text: "Litros" }), el("strong", { text: (Math.round(now.litres * 10) / 10).toLocaleString("es-ES") })),
      el("div", { class: "stat" }, el("span", { text: "Repostajes" }), el("strong", { text: String(now.n) }))
    );
    const cmp = $("month-compare");
    if (prev) {
      const d = now.euros - prev.euros;
      cmp.textContent = d >= 0
        ? `Este mes llevas ${fmtEuro(d)} más que en ${prevKey} (entonces ${fmtEuro(prev.euros)}).`
        : `Este mes llevas ${fmtEuro(-d)} menos que en ${prevKey} (entonces ${fmtEuro(prev.euros)}).`;
    } else cmp.textContent = "Cuando haya un mes anterior, aquí verás la comparativa.";

    const cv = $("month-chart");
    const ctx = cv.getContext("2d");
    const w = cv.width, h = cv.height;
    const cs = getComputedStyle(document.documentElement);
    const chartBg = cs.getPropertyValue("--chart-bg").trim() || "transparent";
    const chartLabel = cs.getPropertyValue("--chart-label").trim() || "#5a6270";
    const gold = cs.getPropertyValue("--gold").trim() || "#c48920";
    const teal = cs.getPropertyValue("--teal").trim() || "#1f7f78";
    ctx.clearRect(0, 0, w, h);
    if (chartBg && chartBg !== "transparent") {
      ctx.fillStyle = chartBg;
      ctx.fillRect(0, 0, w, h);
    }
    const last = months.slice(-8);
    if (!last.length) {
      ctx.fillStyle = chartLabel;
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText("El gráfico aparecerá con tus repostajes.", 16, h / 2);
      return;
    }
    const max = Math.max(...last.map((m) => by[m].euros), 1);
    const bw = (w - 32) / last.length - 8;
    last.forEach((m, i) => {
      const val = by[m].euros;
      const bh = (h - 36) * (val / max);
      const x = 16 + i * ((w - 32) / last.length);
      const y = h - 20 - bh;
      const g = ctx.createLinearGradient(0, y, 0, h - 20);
      g.addColorStop(0, gold);
      g.addColorStop(1, teal);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect?.(x, y, bw, bh, 6);
      if (!ctx.roundRect) ctx.fillRect(x, y, bw, bh);
      else ctx.fill();
      ctx.fillStyle = chartLabel;
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillText(m.slice(5), x, h - 6);
    });
  }

  function saveLogEntry() {
    const litres = Number($("log-litres").value);
    let price = Number($("log-price").value);
    let total = Number($("log-total").value);
    if (litres && price && !total) total = Math.round(litres * price * 100) / 100;
    if (litres && total && !price) price = total / litres;
    if (!litres || !price) return;
    const fuel = FUEL_BY_ID[$("log-fuel").value] || fuelOf();
    state.log.push({
      id: "l" + Date.now(),
      date: $("log-date").value || todayISO(),
      station: $("log-station").value.trim(),
      fuel: fuel.id,
      fuelLabel: fuel.label,
      litres, price, total,
      odo: $("log-odo").value ? Number($("log-odo").value) : null
    });
    saveLS("log", state.log);
    closeSheets();
    renderLog();
  }

  function exportCSV() {
    const items = enrichLog();
    const head = "fecha,estacion,carburante,litros,precio_l,total_eur,km,consumo_l100,coste_km";
    const lines = items.map((it) => [it.date, csv(it.station), csv(it.fuelLabel || it.fuel),
      num(it.litres), num(it.price), num(it.total), it.km ?? "", num(it.consReal), num(it.costKm)].join(","));
    const blob = new Blob(["\ufeff" + head + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `surtidor-repostajes-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function csv(s) { return `"${String(s || "").replace(/"/g, '""')}"`; }
  function num(n) { return n == null || Number.isNaN(n) ? "" : String(n).replace(".", ","); }

  /* ——— sheets / views ——— */
  function openSheet(id) {
    closeSheets(true);
    const s = $(id);
    s.hidden = false;
    s.style.transform = "";
    s.scrollTop = 0;
    $("backdrop").hidden = false;
    $("backdrop").classList.add("is-on");
    requestAnimationFrame(() => s.classList.add("is-on"));
    haptic(6);
    if (id === "sheet-filters") renderFilterSheet();
    if (id === "sheet-vehicle") renderVehicleSheet();
    if (id === "sheet-alerts") { renderAlertFields(); renderFavList(); renderHistoryBox(); }
    if (id === "sheet-log") {
      $("log-date").value = todayISO();
      $("log-fuel").value = state.fuelId;
      if (state.filtered[0]) {
        $("log-station").value = state.filtered[0].raw["Rótulo"] || "";
        $("log-price").value = state.filtered[0].price ?? "";
      }
    }
  }

  function closeSheets(silent) {
    for (const s of document.querySelectorAll(".sheet")) {
      s.classList.remove("is-on");
      setTimeout(() => { if (!s.classList.contains("is-on")) { s.hidden = true; s.style.transform = ""; s.style.transition = ""; } }, 280);
    }
    $("backdrop").classList.remove("is-on");
    $("backdrop").hidden = true;
  }

  /* Deslizar hacia abajo para cerrar (desde el asa o con la hoja arriba del todo) */
  function enableSwipe(sheet) {
    let y0 = null, dy = 0, t0 = 0, drag = false;
    const desk = () => window.matchMedia("(min-width: 900px)").matches;
    const tf = (px) => desk() ? `translate(-50%, ${px}px)` : `translateY(${px}px)`;
    sheet.addEventListener("touchstart", (e) => {
      const onHandle = e.target.closest(".sheet-handle, .sheet-grab");
      if (!onHandle && sheet.scrollTop > 0) { y0 = null; return; }
      if (e.target.closest("input, select, textarea, .fuel-scroller, .leaflet-container")) { y0 = null; return; }
      y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); drag = false;
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (!drag && dy < -4) { y0 = null; return; }
      if (dy > 6) {
        drag = true;
        sheet.style.transition = "none";
        sheet.style.transform = tf(Math.max(0, dy - 6));
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      const v = dy / Math.max(1, Date.now() - t0);
      sheet.style.transition = "";
      if (drag && (dy > 110 || v > 0.55)) {
        sheet.style.transform = desk() ? "translate(-50%, 110%)" : "translateY(110%)";
        haptic(6);
        closeSheets();
      } else sheet.style.transform = "";
      drag = false;
    };
    sheet.addEventListener("touchend", end);
    sheet.addEventListener("touchcancel", end);
  }

  function setView(name) {
    state.view = name;
    for (const v of ["nearby", "route", "log"]) {
      $("view-" + v).classList.toggle("is-active", v === name);
    }
    for (const b of document.querySelectorAll(".tabbar [data-view]")) {
      b.classList.toggle("is-active", b.dataset.view === name);
    }
    const car = $("btn-vehicle");
    if (car) car.classList.toggle("is-active", name === "vehicle");
    const fb = $("fuel-bar");
    if (fb) fb.hidden = name === "log";
    haptic(6);
    if (name === "log") renderLog();
    if (name === "route") setTimeout(() => state.maps.route && state.maps.route.invalidateSize(), 150);
    if (name === "nearby") setTimeout(renderMap, 80);
  }

  /* ——— recarga eléctrica ——— */
  async function evMeta() {
    if (!state.ev.meta) state.ev.meta = await fetch(EV_BASE + "meta.json").then((r) => { if (!r.ok) throw new Error("meta"); return r.json(); });
    return state.ev.meta;
  }
  async function evTile(key) {
    if (state.ev.tiles.has(key)) return state.ev.tiles.get(key);
    const job = fetch(`${EV_BASE}t/${key}.json`).then((r) => r.ok ? r.json() : []).catch(() => []);
    state.ev.tiles.set(key, job);
    return job;
  }
  async function loadEvAround(lat, lon, radiusKm) {
    const resBox = $("results");
    resBox.replaceChildren(el("div", { class: "state loading" }, el("strong", { text: "Cargando puntos de recarga" }), "Registro oficial de puntos de recarga, un momento."));
    try {
      const meta = await evMeta();
      const T = meta.tile;
      const dLat = (radiusKm + 1) / 111, dLon = (radiusKm + 1) / (111 * Math.cos(lat * Math.PI / 180));
      const have = new Set(meta.tiles);
      const keys = [];
      for (let a = Math.floor((lat - dLat) / T) * T; a <= lat + dLat; a += T) {
        for (let b = Math.floor((lon - dLon) / T) * T; b <= lon + dLon; b += T) {
          const k = `${Number(a.toFixed(4))}_${Number(b.toFixed(4))}`;
          if (have.has(k)) keys.push(k);
        }
      }
      const lists = await Promise.all(keys.map(evTile));
      state.ev.raw = lists.flat();
      updateEvFecha();
      applyFilters();
    } catch (e) {
      resBox.replaceChildren(el("div", { class: "state error" }, el("strong", { text: "No se han podido cargar los puntos de recarga" }), "Inténtalo de nuevo en un momento."));
    }
  }
  function evDate() {
    const m = state.ev.meta?.napPublicationTime?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }
  function updateEvFecha() {
    const box = $("updated");
    if (box && state.mode === "ev") box.textContent = evDate() ? `Puntos de recarga · ${evDate().slice(0, 5)}` : "Registro oficial de recarga";
  }

  function prettyOperator(op) {
    let t = String(op || "").replace(/\b(S\.?\s?A\.?\s?U\.?|S\.?\s?L\.?\s?U\.?|S\.?\s?L\.?|S\.?\s?A\.?|SLU|SAU)\s*$/i, "").replace(/[,.\s]+$/, "").trim();
    if (!t) return "";
    if (t === t.toUpperCase()) t = t.toLowerCase().replace(/(^|[\s\-/(])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());
    return t.replace(/\bX Way\b/i, "X Way");
  }
  function evTitle(x) {
    if (x.tesla) return "Tesla Supercharger";
    return prettyOperator(x.op) || "Punto de recarga";
  }
  function evSubtitle(x) {
    const n = String(x.n || "").trim();
    const codeLike = !n || /^[\w*\-_.]+$/.test(n) && !/\s/.test(n) && /\d/.test(n);
    if (x.tesla && x.sc?.nm) return x.sc.nm.replace(/, Spain/i, "").replace(/^Madrid, Spain - /, "");
    return codeLike ? "" : n;
  }
  function evAddress(x) {
    return [x.a, x.cp, x.m].filter(Boolean).map((v) => String(v).trim()).filter((v, i, arr) => arr.indexOf(v) === i).join(" · ");
  }
  function evConnList(x) {
    const order = ["CCS", "T2", "CHAdeMO", "Tesla", "NACS", "CCS1", "T1", "Schuko", "CEE", "Otro"];
    return Object.entries(x.c || {}).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }
  function evShortConns(x) {
    return evConnList(x).map(([k]) => ({ CCS: "CCS", T2: "Tipo 2", CHAdeMO: "CHAdeMO", Tesla: "Tesla", NACS: "NACS", CCS1: "CCS1", T1: "Tipo 1", Schuko: "Schuko", CEE: "CEE" }[k] || "Otro"))
      .filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(" · ") || "—";
  }
  function powerClass(kw) { return kw >= 150 ? "k4" : kw >= 50 ? "k3" : kw >= 22 ? "k2" : "k1"; }
  function fmtKw(kw) { return kw ? (kw >= 100 ? Math.round(kw) : Math.round(kw * 10) / 10).toLocaleString("es-ES") : "—"; }

  function applyEvFilters() {
    const o = state.origin;
    const E = state.ev;
    let rows = E.raw.map((x) => ({ ...x, dist: o ? haversine(o.lat, o.lon, x.la, x.lo) : null }));
    if (o && state.radius) rows = rows.filter((x) => x.dist <= state.radius);
    if (E.minKw) rows = rows.filter((x) => (x.kw || 0) >= E.minKw);
    if (E.conns.length) rows = rows.filter((x) => E.conns.some((c) => c === "Tesla" ? x.tesla : !!(x.c && x.c[c])));
    if (E.parking) rows = rows.filter((x) => x.pk);
    if (state.openF === "now") rows = rows.filter((x) => evOpenStatus(x.h).open === true);
    else if (state.openF === "24h") rows = rows.filter((x) => x.h === "24h");
    for (const x of rows) x.tag = null;
    if (rows.length > 1) {
      const near = [...rows].sort((a, b) => a.dist - b.dist)[0];
      near.tag = { cls: "near", text: "Más cercano" };
      const fast = [...rows].sort((a, b) => (b.kw || 0) - (a.kw || 0) || a.dist - b.dist)[0];
      if (!fast.tag && fast.kw >= 50) fast.tag = { cls: "fast", text: "Más potente" };
    }
    if (E.sort === "power") rows.sort((a, b) => (b.kw || 0) - (a.kw || 0) || a.dist - b.dist);
    else rows.sort((a, b) => a.dist - b.dist);
    E.filtered = rows;
    E.stats = { n: rows.length, points: rows.reduce((a, x) => a + (x.np || 0), 0), maxKw: rows.reduce((a, x) => Math.max(a, x.kw || 0), 0), sc: rows.filter((x) => x.tesla).length };
    updateFiltersLabel();
    renderList();
    renderMap();
  }

  function evCard(x) {
    const card = el("article", { class: "card ev-card" + (x.tesla ? " is-tesla" : ""), role: "button", tabindex: "0" });
    card.addEventListener("click", () => openEvSheet(x));
    card.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openEvSheet(x); } });
    if (x.tag) card.append(el("span", { class: "badge tag " + x.tag.cls, text: x.tag.text }));
    const st = evOpenStatus(x.h);
    const meta = el("div", { class: "card-meta" }, fmtKm(x.dist));
    if (st.label) meta.append(" · ", el("span", { class: st.open ? "is-open" : "is-closed" }, x.h === "24h" ? "24 h" : st.label));
    if (x.pk) meta.append(" · ", el("span", { class: "pk-inline" }, icon("parking", 12), "Parking"));
    const sub = evSubtitle(x);
    card.append(el("div", { class: "card-top" },
      el("div", { class: "brand ev " + powerClass(x.kw || 0) + (x.tesla ? " tesla" : ""), "aria-hidden": "true" }, icon(x.tesla ? "bolt" : "plug", 18)),
      el("div", { class: "card-main" },
        el("div", { class: "rotulo", text: evTitle(x) }),
        sub ? el("div", { class: "card-sub", text: sub }) : null,
        meta
      ),
      el("div", { class: "price-block" },
        el("span", { class: "amount power " + powerClass(x.kw || 0) }, fmtKw(x.kw), el("small", { text: "kW" })),
        el("div", { class: "unit", text: x.kw >= 50 ? "carga rápida" : "máxima" })
      )
    ));
    card.append(el("div", { class: "card-costs" },
      costCell("Puntos", String(x.sc?.st && x.sc.st > (x.np || 0) ? x.sc.st : (x.np || "—"))),
      costCell("Conectores", evShortConns(x), "small"),
      costCell("Precio", "No publicado", "neutral")
    ));
    return card;
  }

  function renderEvList() {
    const box = $("results");
    box.replaceChildren();
    if (!state.origin) {
      box.append(el("div", { class: "state" }, el("strong", { text: "¿Dónde miramos?" }), "Activa la ubicación o escribe una localidad, una dirección o un código postal."));
      return;
    }
    const E = state.ev;
    if (!E.filtered.length) {
      box.append(el("div", { class: "state" }, el("strong", { text: "Sin puntos de recarga" }),
        `No hay ninguno en ${state.radius} km con estos filtros. Prueba a ampliar el radio o bajar la potencia mínima.`));
      return;
    }
    const st = E.stats;
    box.append(el("div", { class: "summary" },
      el("span", {}, el("b", { text: String(st.n) }), ` ${st.n === 1 ? "punto" : "puntos"} en ${state.radius} km`),
      el("span", {}, st.sc ? el("b", { text: `${st.sc} Supercharger${st.sc > 1 ? "s" : ""}` }) : null, st.sc ? " · " : "", "hasta ", el("b", { text: fmtKw(st.maxKw) }), " kW")
    ));
    const max = 80;
    for (const x of E.filtered.slice(0, max)) box.append(evCard(x));
    if (E.filtered.length > max) box.append(el("p", { class: "list-more", text: `Mostrando los ${max} primeros de ${E.filtered.length}. Afina con la potencia o el conector.` }));
    box.append(sourceNote(`Fuente: registro oficial MITERD (Punto de Acceso Nacional, DGT)${evDate() ? " · " + evDate() : ""} · Superchargers: supercharge.info. El registro no publica precios.`));
  }

  function evPin(x) {
    const k = powerClass(x.kw || 0);
    const icon_ = L.divIcon({
      className: "",
      html: `<div class="ev-pin ${k}${x.tesla ? " tesla" : ""}">${iconHTML("bolt", 10)}${x.kw ? fmtKw(x.kw) : "—"}</div>`,
      iconSize: [48, 20], iconAnchor: [24, 20]
    });
    const m = L.marker([x.la, x.lo], { icon: icon_, title: evTitle(x), kw: x.kw || 0, riseOnHover: true });
    m.on("click", () => openEvSheet(x));
    return m;
  }
  function evClusterGroup() {
    return L.markerClusterGroup({
      showCoverageOnHover: false, zoomToBoundsOnClick: true, spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16, maxClusterRadius: 60,
      iconCreateFunction(cl) {
        const kws = cl.getAllChildMarkers().map((m) => m.options.kw || 0);
        const mx = Math.max(0, ...kws);
        return L.divIcon({
          className: "cluster-icon",
          html: `<div class="cluster-bubble ev ${powerClass(mx)}"><b>${iconHTML("bolt", 9)}${fmtKw(mx)}</b><small>${cl.getChildCount()}</small></div>`,
          iconSize: [56, 40], iconAnchor: [28, 20]
        });
      }
    });
  }
  function setLegend(ev) {
    const d = $("map-legend");
    if (!d) return;
    d.innerHTML = ev
      ? `<span class="lg-dot k1"></span>&lt;22 <span class="lg-dot k2"></span>22 <span class="lg-dot k3"></span>50 <span class="lg-dot k4"></span>150+ kW`
      : "Barato <div class='legend-scale'></div> Caro";
  }

  function openEvSheet(x) {
    const box = $("station-body");
    box.replaceChildren();
    const st = evOpenStatus(x.h);
    box.append(el("div", { class: "detail-head" },
      el("div", { class: "brand ev " + powerClass(x.kw || 0) + (x.tesla ? " tesla" : ""), "aria-hidden": "true" }, icon(x.tesla ? "bolt" : "plug", 20)),
      el("div", {},
        el("h2", { id: "st-title", text: evTitle(x) }),
        el("p", { class: "detail-addr", text: [evSubtitle(x), evAddress(x)].filter(Boolean).join(" · ") })
      )
    ));
    const pts = x.np || 0;
    box.append(el("div", { class: "hero card" },
      el("div", {},
        el("div", { class: "hero-k", text: "Potencia máxima" }),
        el("div", { class: "hero-big" }, fmtKw(x.kw), el("small", { text: "kW" }))
      ),
      el("div", { class: "hero-r" },
        el("strong", { class: "neutral", text: String(x.sc?.st && x.sc.st > pts ? x.sc.st : pts || "—") }),
        el("span", { text: (x.sc?.st && x.sc.st > pts) ? "postes (Tesla)" : "puntos de carga" })
      )
    ));
    const chips = el("div", { class: "info-chips" });
    if (x.dist != null) chips.append(el("span", { class: "info-chip" }, icon("pin", 13), fmtKm(x.dist)));
    if (st.label) chips.append(el("span", { class: "info-chip" + (st.open ? " good" : "") }, icon("clock", 13), st.label));
    if (x.pk) chips.append(el("span", { class: "info-chip" }, icon("parking", 13), "Aparcamiento"));
    if (SITE_TYPE[x.t]) chips.append(el("span", { class: "info-chip", text: SITE_TYPE[x.t] }));
    box.append(chips);

    // Conectores
    const t = el("div", { class: "card cost-card" }, el("h3", { class: "block-h", text: "Conectores" }));
    t.append(el("div", { class: "ct head" }, el("span", { text: "Tipo" }), el("span", { text: "Tomas" }), el("span", { text: "Potencia" })));
    for (const [k, [n, kw]] of evConnList(x)) {
      t.append(el("div", { class: "ct" }, el("span", { text: CONN_LABEL[k] || k }), el("b", { text: String(n) }), el("b", { text: kw ? fmtKw(kw) + " kW" : "—" })));
    }
    if (!evConnList(x).length) t.append(el("p", { class: "note", text: "El operador no ha comunicado los conectores." }));
    box.append(t);

    if (x.sc) {
      const sc = el("div", { class: "card cost-card" }, el("h3", { class: "block-h", text: "Supercharger" }));
      const row = (k, v) => el("div", { class: "cl" }, el("span", { text: k }), el("b", { text: v }));
      if (x.sc.st) sc.append(row("Postes", String(x.sc.st)));
      if (x.sc.kw) sc.append(row("Potencia por poste", `hasta ${x.sc.kw} kW`));
      if (x.sc.o) sc.append(row("Abierto desde", x.sc.o.split("-").reverse().join("/")));
      sc.append(row("Otros eléctricos", x.sc.x ? "Sí, con la app de Tesla" : "Solo Tesla"));
      sc.append(sourceNote("Datos de supercharge.info (comunidad)."));
      box.append(sc);
    }

    // Precio: solo si una fuente lo da
    const pr = el("div", { class: "card cost-card" },
      el("h3", { class: "block-h", text: "Precio" }),
      el("p", { class: "advice-text muted", text: "Buscando tarifa publicada…" }));
    box.append(pr);
    osmCharge(x).then((o) => {
      if (!pr.isConnected) return;
      pr.replaceChildren(el("h3", { class: "block-h", text: "Precio" }));
      if (o && (o.charge || o.fee === "no")) {
        pr.append(el("div", { class: "cl" }, el("span", {}, "Tarifa", el("small", { text: "OpenStreetMap · dato colaborativo, sin verificar" })), el("b", { text: o.charge || "Gratuita" })));
        pr.append(sourceNote("Confírmalo en la app del operador antes de cargar."));
      } else {
        pr.append(el("p", { class: "advice-text", text: "Precio no disponible. El registro oficial aún no publica tarifas; consúltalo en la app del operador." }));
      }
    });

    // Estimación de carga con tu coche
    const v = state.vehicle;
    if (v.ev?.on && x.kw) {
      const kwh = Number(v.ev.kwh) || 60;
      const dcMax = Number(v.ev.dc) || 100;
      const acMax = Number(v.ev.ac) || 11;
      const dc = x.kw >= 40 && evConnList(x).some(([k]) => ["CCS", "CHAdeMO", "Tesla", "NACS", "CCS1"].includes(k));
      const p = Math.min(x.kw, dc ? dcMax : acMax);
      const energy = kwh * 0.7;
      const mins = energy / (p * (dc ? 0.75 : 0.9)) * 60;
      const c = el("div", { class: "card cost-card" }, el("h3", { class: "block-h", text: "Con tu coche" }));
      c.append(el("div", { class: "cl" }, el("span", {}, "Del 10 al 80 %", el("small", { text: `${String(kwh).replace(".", ",")} kWh de batería · ${dc ? "carga rápida" : "corriente alterna"} hasta ${fmtKw(p)} kW` })),
        el("b", { text: mins >= 90 ? `${(mins / 60).toFixed(1).replace(".", ",")} h` : `${Math.round(mins)} min` })));
      c.append(el("div", { class: "cl" }, el("span", {}, "Energía", el("small", { text: "aprox." })), el("b", { text: `${Math.round(energy)} kWh` })));
      c.append(sourceNote("Estimación orientativa: la curva real depende del coche, la batería y la temperatura."));
      box.append(c);
    }

    const extra = [];
    if (x.au?.length) extra.push(["Acceso", [...new Set(x.au.map((a) => AUTH_LABEL[a] || a))].join(", ")]);
    if (x.sv?.length) extra.push(["Servicios", x.sv.map((a) => SERVICE_LABEL[a] || a).join(", ")]);
    if (x.hl) extra.push(["Horario", x.hl]);
    if (x.op) extra.push(["Operador", prettyOperator(x.op)]);
    if (extra.length) {
      const c = el("div", { class: "card cost-card" }, el("h3", { class: "block-h", text: "Detalles" }));
      for (const [k, val] of extra) c.append(el("div", { class: "cl wrap" }, el("span", { text: k }), el("b", { text: val })));
      box.append(c);
    }

    box.append(directionsRow(x.la, x.lo));
    const text = [`${evTitle(x)} · ${fmtKw(x.kw)} kW · ${pts} ${pts === 1 ? "punto" : "puntos"}`, evAddress(x)].filter(Boolean).join("\n");
    const sh = shareRow(evTitle(x), text, appLink({ ev: x.i, lat: x.la.toFixed(5), lon: x.lo.toFixed(5) }));
    box.append(el("div", { class: "actions-row" }, sh.btn), sh.fb);
    box.append(sourceNote(`Fuente: registro MITERD vía DGT${evDate() ? " · " + evDate() : ""}${x.u ? " · dato del operador de " + x.u.split("-").reverse().join("/") : ""}.`));
    if (!$("sheet-station").classList.contains("is-on")) openSheet("sheet-station");
  }

  /* Tarifa en OpenStreetMap (tag charge=*), si alguien la ha cartografiado. Sin ella: «no disponible». */
  const osmMemo = new Map();
  async function osmCharge(x) {
    const k = `${x.la},${x.lo}`;
    if (osmMemo.has(k)) return osmMemo.get(k);
    const q = `[out:json][timeout:8];nwr["amenity"="charging_station"](around:70,${x.la},${x.lo});out tags center 6;`;
    let found = null;
    for (const ep of OVERPASS) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 9000);
      try {
        const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
        clearTimeout(timer);
        if (!r.ok) continue;
        const d = await r.json();
        for (const e of d.elements || []) {
          const tg = e.tags || {};
          const charge = tg.charge || tg["charge:conditional"] || Object.entries(tg).find(([kk]) => /^charge:/.test(kk))?.[1] || "";
          if (charge || tg.fee === "no") { found = { charge: String(charge).slice(0, 120), fee: tg.fee || "", id: e.type + "/" + e.id }; break; }
        }
        break;
      } catch { clearTimeout(timer); }
    }
    osmMemo.set(k, found);
    return found;
  }

  /* ——— hoja de filtros ——— */
  function renderFilterSheet() {
    const ev = state.mode === "ev";
    updateModeUI();
    document.querySelectorAll("[data-sort]").forEach((b) => b.classList.toggle("is-active", b.dataset.sort === state.sort));
    document.querySelectorAll("[data-evsort]").forEach((b) => b.classList.toggle("is-active", b.dataset.evsort === state.ev.sort));
    document.querySelectorAll("[data-open]").forEach((b) => b.classList.toggle("is-active", b.dataset.open === state.openF));
    $("filt-lead").textContent = ev ? "Radio, potencia, conector y horario." : "Radio, orden, horario y tus tarjetas de descuento.";
    const kwBox = $("ev-kw");
    kwBox.replaceChildren();
    for (const kw of EV_MINKW) {
      kwBox.append(el("button", { type: "button", class: "chip" + (state.ev.minKw === kw ? " is-active" : ""), onclick: () => {
        haptic(); state.ev.minKw = kw; saveLS("evMinKw", kw); renderFilterSheet(); applyFilters();
      } }, kw ? `≥ ${kw} kW` : "Todas"));
    }
    const cBox = $("ev-conn");
    cBox.replaceChildren();
    for (const c of EV_CONNS) {
      const on = state.ev.conns.includes(c.id);
      cBox.append(el("button", { type: "button", class: "chip" + (on ? " is-active" : ""), "aria-pressed": on ? "true" : "false", onclick: () => {
        haptic();
        state.ev.conns = on ? state.ev.conns.filter((x) => x !== c.id) : [...state.ev.conns, c.id];
        saveLS("evConns", state.ev.conns); renderFilterSheet(); applyFilters();
      } }, c.label));
    }
    $("ev-parking").checked = !!state.ev.parking;
    const lb = $("loyalty");
    lb.replaceChildren();
    for (const c of LOYALTY) {
      const cfg = state.cards[c.id] || { on: false, cents: c.cents };
      const id = "card-" + c.id;
      const inp = el("input", { type: "number", inputmode: "decimal", min: "0", max: "50", step: "0.5", value: String(cfg.cents), "aria-label": `Céntimos por litro de ${c.label}` });
      inp.addEventListener("change", () => {
        const v = Math.max(0, Math.min(50, Number(String(inp.value).replace(",", ".")) || 0));
        state.cards[c.id] = { ...(state.cards[c.id] || { on: true }), cents: v };
        saveLS("cards", state.cards); applyFilters();
      });
      const cb = el("input", { type: "checkbox", id, checked: cfg.on ? true : null });
      cb.addEventListener("change", () => {
        haptic();
        state.cards[c.id] = { cents: Number(inp.value) || c.cents, on: cb.checked };
        saveLS("cards", state.cards); applyFilters();
      });
      lb.append(el("div", { class: "set" },
        el("label", { class: "set-k", for: id }, cb, el("span", { text: c.label })),
        el("div", { class: "set-v" }, inp, el("small", { text: "cts/l" }))
      ));
    }
  }

  /* ——— bind UI ——— */
  function buildFuels() {
    const box = $("fuels");
    box.replaceChildren();
    const evOn = state.mode === "ev";
    box.append(el("button", {
      type: "button", class: "fuel-chip ev-chip" + (evOn ? " is-active" : ""), role: "option", "aria-selected": evOn,
      onclick: () => { haptic(); setMode("ev"); }
    }, icon("bolt", 14), el("span", { text: "Eléctrico" })));
    for (const f of FUELS) {
      const on = !evOn && f.id === state.fuelId;
      const b = el("button", {
        type: "button",
        class: "fuel-chip" + (on ? " is-active" : ""),
        role: "option",
        "aria-selected": on,
        onclick: () => {
          haptic();
          state.fuelId = f.id;
          saveLS("fuelId", f.id);
          persistCfg();
          if (state.mode === "ev") { setMode("fuel"); return; }
          buildFuels();
          applyFilters();
          if (state.view === "route" && state.routeStations.length) runRoute();
        }
      }, el("span", { text: f.short, title: f.label }));
      box.append(b);
    }
  }

  function setMode(mode) {
    if (state.mode === mode) { buildFuels(); return; }
    state.mode = mode;
    saveLS("mode", mode);
    if (mode === "fuel") updateFecha(); else updateEvFecha();
    state.maps.fitted = false;
    buildFuels();
    updateModeUI();
    updateFiltersLabel();
    if (state.origin) {
      if (mode === "ev") loadEvAround(state.origin.lat, state.origin.lon, state.radius);
      else if (state.raw.length) applyFilters();
      else loadAround(state.origin.lat, state.origin.lon, state.radius);
    } else renderList();
  }

  function updateModeUI() {
    const ev = state.mode === "ev";
    document.documentElement.classList.toggle("mode-ev", ev);
    for (const n of document.querySelectorAll("[data-mode-only]")) n.hidden = n.dataset.modeOnly !== state.mode;
  }

  function buildRadii() {
    const box = $("radii");
    box.replaceChildren();
    for (const r of RADII) {
      const b = el("button", {
        type: "button",
        class: "chip" + (r === state.radius ? " is-active" : ""),
        onclick: async () => {
          haptic();
          state.radius = r;
          state.maps.fitted = false;
          saveLS("radius", r);
          box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
          updateFiltersLabel();
          if (state.origin) {
            if (state.mode === "ev") await loadEvAround(state.origin.lat, state.origin.lon, r);
            else await loadAround(state.origin.lat, state.origin.lon, r);
          } else applyFilters();
        }
      }, r + " km");
      box.append(b);
    }
  }

  function bind() {
    $("btn-locate").addEventListener("click", requestGeo);
    $("btn-refresh").addEventListener("click", async () => {
      $("btn-refresh").classList.add("is-busy");
      state.cache.clear();
      try { if (state.origin) await loadAround(state.origin.lat, state.origin.lon, state.radius); }
      finally { $("btn-refresh").classList.remove("is-busy"); }
    });
    const syncViewToggle = () => {
      $("btn-map").classList.toggle("is-active", state.mapOpen);
      $("btn-map").setAttribute("aria-pressed", String(state.mapOpen));
      if ($("btn-list")) $("btn-list").classList.toggle("is-active", !state.mapOpen);
    };
    $("btn-map").addEventListener("click", () => {
      state.mapOpen = true;
      syncViewToggle();
      renderMap();
    });
    if ($("btn-list")) $("btn-list").addEventListener("click", () => {
      state.mapOpen = false;
      syncViewToggle();
      renderMap();
    });
    if ($("btn-filters")) $("btn-filters").addEventListener("click", () => openSheet("sheet-filters"));
    $("only-public").addEventListener("change", () => {
      state.onlyPublic = $("only-public").checked;
      saveLS("onlyPublic", state.onlyPublic);
      applyFilters();
    });
    $("only-favs").addEventListener("change", () => {
      state.onlyFavs = $("only-favs").checked;
      applyFilters();
    });
    document.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", () => {
      haptic();
      state.sort = b.dataset.sort;
      saveLS("sort", state.sort);
      document.querySelectorAll("[data-sort]").forEach((x) => x.classList.toggle("is-active", x === b));
      updateFiltersLabel();
      applyFilters();
    }));
    document.querySelectorAll(".tabbar [data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    document.querySelectorAll("[data-theme-pick]").forEach((b) => {
      b.addEventListener("click", () => applyTheme(b.dataset.themePick));
    });
    $("btn-vehicle").addEventListener("click", () => openSheet("sheet-vehicle"));
    $("btn-alerts").addEventListener("click", () => openSheet("sheet-alerts"));
    $("btn-veh-save").addEventListener("click", saveVehicle);
    $("veh-make-filter").addEventListener("input", renderVehicleSheet);
    $("btn-alerts-save").addEventListener("click", () => {
      const next = {};
      for (const id of ["goa", "gop", "g95", "g98", "glp"]) {
        const v = Number($("al-" + id).value);
        if (v) next[id] = v;
      }
      state.alerts = next;
      saveLS("alerts", next);
      persistCfg();
      closeSheets();
      checkAlerts();
    });
    $("btn-notif-perm").addEventListener("click", async () => {
      if (!window.Notification) { $("btn-notif-perm").textContent = "No disponible aquí"; return; }
      const p = await Notification.requestPermission();
      $("btn-notif-perm").textContent = p === "granted" ? "Notificación permitida" : "Permiso denegado";
    });
    $("btn-log-add").addEventListener("click", () => openSheet("sheet-log"));
    $("btn-log-save").addEventListener("click", saveLogEntry);
    $("btn-export-csv").addEventListener("click", exportCSV);
    $("log-litres").addEventListener("input", syncTotal);
    $("log-price").addEventListener("input", syncTotal);
    function syncTotal() {
      const l = Number($("log-litres").value), p = Number($("log-price").value);
      if (l && p) $("log-total").value = (Math.round(l * p * 100) / 100).toFixed(2);
    }
    $("backdrop").addEventListener("click", () => closeSheets());
    document.querySelectorAll(".sheet").forEach(enableSwipe);
    document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => {
      haptic(); state.openF = b.dataset.open; saveLS("openF", state.openF); renderFilterSheet(); applyFilters();
    }));
    document.querySelectorAll("[data-evsort]").forEach((b) => b.addEventListener("click", () => {
      haptic(); state.ev.sort = b.dataset.evsort; saveLS("evSort", state.ev.sort); renderFilterSheet(); applyFilters();
    }));
    $("ev-parking").addEventListener("change", () => { haptic(); state.ev.parking = $("ev-parking").checked; saveLS("evParking", state.ev.parking); applyFilters(); });
    document.querySelectorAll("[data-vkind]").forEach((b) => b.addEventListener("click", () => {
      haptic();
      document.querySelectorAll("[data-vkind]").forEach((x) => x.classList.toggle("is-active", x === b));
      const evOn = b.dataset.vkind === "ev";
      $("veh-ice").hidden = evOn; $("veh-ev").hidden = !evOn;
    }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheets(); });
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeSheets()));

    let t = 0, seq = 0;
    const pick = (it) => {
      haptic();
      $("search-input").value = it.label;
      $("search-input").blur();
      setOrigin(it.lat, it.lon, it.label, "search");
    };
    $("search-input").addEventListener("input", () => {
      clearTimeout(t);
      const q = $("search-input").value.trim();
      const my = ++seq;
      const local = searchPlaces(q, 6);
      showSuggest(local, $("suggest"), pick);
      if (q.length < 3 || /^\d{1,5}$/.test(q)) return;
      t = setTimeout(async () => {
        const items = await geocodeFree(q);
        if (my !== seq) return;
        const seen = new Set();
        const merged = [...local, ...items].filter((x) => { const k = norm(x.label); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
        showSuggest(merged, $("suggest"), pick);
      }, 320);
    });
    $("search-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = $("search-input").value.trim();
      if (!q) { requestGeo(); return; }
      const found = await geocodeFree(q);
      if (found[0]) { $("search-input").blur(); setOrigin(found[0].lat, found[0].lon, found[0].label, "search"); }
      else toast("No encuentro ese lugar en España");
      $("suggest").hidden = true;
    });
    document.addEventListener("click", (e) => {
      if (!$("search-form").contains(e.target)) $("suggest").hidden = true;
    });

    $("btn-route-here").addEventListener("click", () => {
      if (state.origin) {
        routeOrigin = { lat: state.origin.lat, lon: state.origin.lon, label: "Mi ubicación" };
        $("route-origin").value = "Mi ubicación";
      } else requestGeo();
    });
    $("btn-route-go").addEventListener("click", runRoute);
    $("route-dest").addEventListener("input", () => {
      clearTimeout(routeTimer);
      routeTimer = setTimeout(async () => {
        const q = $("route-dest").value.trim();
        if (q.length < 2) return;
        const items = await geocodeFree(q);
        showSuggest(items, $("route-suggest"), (it) => {
          routeDest = it;
          $("route-dest").value = it.label;
        });
      }, 200);
    });
    $("route-origin").addEventListener("change", async () => {
      const q = $("route-origin").value.trim();
      if (!q || /^mi ubic/i.test(q)) {
        if (state.origin) routeOrigin = { lat: state.origin.lat, lon: state.origin.lon, label: "Mi ubicación" };
        return;
      }
      const found = await geocodeFree(q);
      if (found[0]) routeOrigin = found[0];
    });

    window.addEventListener("resize", () => {
      if (state.view === "nearby") renderMap();
    });
  }

  async function boot() {
    const qTheme = new URLSearchParams(location.search).get("theme");
    applyTheme(qTheme || loadLS("theme", "claro") || "claro");
    state.fuelId = loadLS("fuelId", "goa") || "goa";
    if (!FUEL_BY_ID[state.fuelId]) state.fuelId = "goa";
    state.radius = Number(loadLS("radius", 5)) || 5;
    state.sort = loadLS("sort", "price") || "price";
    state.onlyPublic = loadLS("onlyPublic", true) !== false;
    $("only-public").checked = state.onlyPublic;
    state.vehicle = { ...DEFAULT_VEHICLE, ...loadLS("vehicle", {}) };
    state.favs = loadLS("favs", []) || [];
    state.alerts = loadLS("alerts", {}) || {};
    state.history = loadLS("history", {}) || {};
    state.log = loadLS("log", []) || [];
    state.cards = loadLS("cards", {}) || {};
    state.openF = loadLS("openF", "any") || "any";
    state.mode = loadLS("mode", "fuel") === "ev" ? "ev" : "fuel";
    state.ev.minKw = Number(loadLS("evMinKw", 0)) || 0;
    state.ev.conns = loadLS("evConns", []) || [];
    state.ev.parking = !!loadLS("evParking", false);
    state.ev.sort = loadLS("evSort", "distance") || "distance";
    document.querySelectorAll("[data-sort]").forEach((b) => b.classList.toggle("is-active", b.dataset.sort === state.sort));
    updateFiltersLabel();

    bind();
    buildFuels();
    buildRadii();

    const [places, vehicles] = await Promise.all([
      fetch("places.json").then((r) => r.json()),
      fetch("vehicles.json").then((r) => r.json()).catch(() => null)
    ]);
    state.places = places;
    state.vehicles = vehicles;

    persistCfg();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(new URL("sw.js", location.href), { scope: "./" }).then(async (reg) => {
        try {
          if (reg.periodicSync) await reg.periodicSync.register("precios", { minInterval: 60 * 60 * 1000 });
        } catch {}
      }).catch(() => {});
    }

    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "ev" || params.has("ev")) state.mode = "ev";
    else if (params.get("mode") === "fuel" || params.has("st")) state.mode = "fuel";
    if (params.has("f") && FUEL_BY_ID[params.get("f")]) state.fuelId = params.get("f");
    buildFuels();
    updateModeUI();
    updateFiltersLabel();
    if (["route", "log"].includes(params.get("view"))) setView(params.get("view"));
    const lat = Number(params.get("lat")), lon = Number(params.get("lon"));
    const hasLL = params.has("lat") && params.has("lon") && Number.isFinite(lat) && Number.isFinite(lon);
    if (params.has("st") && hasLL) {
      await setOrigin(lat, lon, "Gasolinera compartida", "link");
      const id = params.get("st");
      const s = state.filtered.find((x) => x.id === id);
      const raw = s ? null : state.raw.find((x) => x.IDEESS === id);
      if (s) openStationSheet(s);
      else if (raw) openStationSheet(withCosts(enrich(raw, state.origin)));
      else toast("Esa gasolinera ya no aparece en los datos del Ministerio");
    } else if (params.has("ev") && hasLL) {
      await setOrigin(lat, lon, "Punto de recarga compartido", "link");
      const x = state.ev.filtered.find((y) => y.i === params.get("ev")) || state.ev.raw.find((y) => y.i === params.get("ev"));
      if (x) openEvSheet({ ...x, dist: 0 });
      else toast("Ese punto de recarga ya no aparece en el registro");
    } else if (hasLL) {
      await setOrigin(lat, lon, params.get("label") || "Ubicación de prueba", "query");
    } else {
      if (params.has("fav") && state.favs.length) state.onGeo = () => openFavorite(params.get("fav") !== "1" && state.favs.includes(params.get("fav")) ? params.get("fav") : state.favs[0]);
      requestGeo();
    }
  }

  boot().catch((e) => {
    $("results").replaceChildren(el("div", { class: "state error" },
      el("strong", { text: "No se ha podido iniciar" }),
      String(e.message || e)
    ));
  });
})();
