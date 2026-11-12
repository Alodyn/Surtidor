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
    maps: { main: null, route: null, mainLayer: null, routeLayer: null }
  };

  const $ = (id) => document.getElementById(id);

  
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
    const sort = { price: "Precio", distance: "Distancia", net: "Ahorro" }[state.sort] || "Precio";
    return `${state.radius} km · ${sort}`;
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
  function enrich(s, origin) {
    const lat = parseCoord(s.Latitud);
    const lon = parseCoord(s["Longitud (WGS84)"]);
    const price = parsePrice(s[fuelOf().key]);
    const dist = origin && lat != null && lon != null ? haversine(origin.lat, origin.lon, lat, lon) : null;
    return { raw: s, id: s.IDEESS, lat, lon, price, dist };
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
    const fuel = fuelOf();
    const origin = state.origin;
    let rows = state.raw.map((s) => enrich(s, origin)).filter((s) => s.price != null && s.lat != null);
    if (state.onlyPublic) rows = rows.filter((s) => (s.raw["Tipo Venta"] || "P") === "P");
    if (state.onlyFavs) rows = rows.filter((s) => state.favs.includes(s.id));
    if (origin && state.radius) rows = rows.filter((s) => s.dist != null && s.dist <= state.radius);

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
  function priceHTML(n) {
    if (n == null) return "—";
    const [i, d] = fmtPrice(n).split(",");
    const wrap = el("span", { class: "amount" }, i, ",", el("small", {}, d || "000"));
    return wrap;
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

    const starOn = state.favs.includes(s.id);
    const star = el("button", {
      class: "star-btn" + (starOn ? " is-on" : ""),
      type: "button",
      "aria-label": starOn ? "Quitar de favoritas" : "Añadir a favoritas",
      onclick: (ev) => { ev.stopPropagation(); toggleFav(s); }
    }, starOn ? "★" : "☆");

    const status = openStatus(raw["Horario"]);
    const bits = [];
    if (opts.along && s.along != null) bits.push(fmtKm(s.along) + " de la ruta");
    else if (s.dist != null) bits.push(fmtKm(s.dist));
    const meta = el("div", { class: "card-meta" });
    if (bits.length) meta.append(bits.join(" · "));
    if (status.label) {
      if (bits.length) meta.append(" · ");
      meta.append(el("span", { class: status.open === true ? "is-open" : (status.open === false ? "is-closed" : "") }, status.label));
    }

    const mid = el("div", { class: "card-main" },
      el("div", { class: "rotulo", text: raw["Rótulo"] || "Gasolinera" }),
      meta
    );
    const price = el("div", { class: "price-block" },
      priceHTML(s.price),
      el("div", { class: "unit", text: "€/l" })
    );
    card.append(el("div", { class: "card-top" }, star, mid, price));

    if (!opts.skipTank && s.fill != null) {
      const net = s.net;
      const line = el("div", { class: "save-line" + (net != null && net < 0 ? " is-neg" : "") });
      line.append(`${fmtEuro(s.fill, 0)} el depósito`);
      if (net != null) {
        line.append("  ·  ");
        line.append(el("em", {}, net >= 0 ? `Ahorras ${fmtEuro(net, 0)}` : `${fmtEuro(net, 0)}`));
      }
      card.append(line);
    }
    return card;
  }

  function openStationSheet(s, opts = {}) {
    const fuel = opts.fuel || fuelOf();
    const raw = s.raw;
    const box = $("station-body");
    if (!box) return;
    box.replaceChildren();
    const status = openStatus(raw["Horario"]);
    box.append(el("h2", { id: "st-title", text: raw["Rótulo"] || "Gasolinera" }));
    box.append(el("p", { class: "detail-addr", text: formatAddress(raw) }));
    const head = el("div", { class: "card-top", style: { marginTop: "16px", alignItems: "center" } },
      el("div", { class: "price-block", style: { textAlign: "left" } },
        el("div", { class: "unit", text: fuel.label }),
        priceHTML(s.price),
        el("div", { class: "unit", text: "€ / litro" })
      )
    );
    box.append(head);
    if (s.dist != null || status.label) {
      const m = el("p", { class: "detail-hours" });
      const parts = [];
      if (s.dist != null) parts.push(fmtKm(s.dist));
      if (opts.along && s.along != null) parts.push(fmtKm(s.along) + " de la ruta");
      if (status.label) parts.push(status.label);
      m.append(parts.join(" · "));
      if (raw["Horario"] && !/24\s*h/i.test(raw["Horario"])) m.append(el("div", { text: raw["Horario"] }));
      box.append(m);
    }
    const others = otherPills(raw, fuel.key);
    if (others) box.append(others);
    if (s.fill != null) {
      const td = el("div", { class: "tank-detail" },
        el("div", {}, "Llenar ", String(state.stats?.tank ?? "").replace(".", ","), " l: ",
          el("span", { class: "fill", text: fmtEuro(s.fill) }))
      );
      if (s.saveAvg != null) {
        td.append(el("div", {}, s.saveAvg >= 0
          ? `Ahorras ${fmtEuro(s.saveAvg)} frente a la media (${fmtPrice(state.stats.avg)} €/l).`
          : `${fmtEuro(-s.saveAvg)} más que la media de la zona.`));
      }
      if (s.saveMax != null && s.saveMax > 0) td.append(el("div", {}, `${fmtEuro(s.saveMax)} menos que la más cara.`));
      if (s.detourCost != null) {
        td.append(el("div", {}, `Desvío ida y vuelta ${fmtKm(s.detourKm)} · ${fmtEuro(s.detourCost)} de combustible.`));
        td.append(el("div", {}, `Ahorro neto: ${fmtEuro(s.net)}.`));
      }
      const sp = sparkline(s.id, fuel.id);
      if (sp) td.append(sp);
      box.append(td);
    }
    if ((raw["Tipo Venta"] || "") === "R") box.append(el("p", { class: "note", text: "Venta restringida" }));
    const lat = s.lat, lon = s.lon;
    const g = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    const a = `https://maps.apple.com/?daddr=${lat},${lon}`;
    box.append(el("div", { class: "card-actions" },
      el("a", { class: "dir-btn", href: g, target: "_blank", rel: "noopener" }, "Google Maps"),
      el("a", { class: "dir-btn secondary", href: a, target: "_blank", rel: "noopener" }, "Apple Maps")
    ));
    const starOn = state.favs.includes(s.id);
    box.append(el("div", { class: "actions-row", style: { marginTop: "12px" } },
      el("button", {
        type: "button",
        class: "btn-ghost",
        onclick: () => { toggleFav(s); openStationSheet(s, opts); }
      }, starOn ? "Quitar de favoritas" : "Añadir a favoritas")
    ));
    openSheet("sheet-station");
  }

  function renderList() {
    const box = $("results");
    box.replaceChildren();
    if (!state.origin) {
      box.append(el("div", { class: "state" },
        el("strong", { text: "¿Dónde miramos?" }),
        "Activa la ubicación o escribe una localidad o un código postal."
      ));
      return;
    }
    if (!state.filtered.length) {
      const fuel = fuelOf();
      box.append(el("div", { class: "state" },
        el("strong", { text: "Sin estaciones con " + fuel.label }),
        `No hay ninguna en ${state.radius} km que venda este carburante. Prueba a ampliar el radio.`
      ));
      return;
    }
    const st = state.stats;
    box.append(el("div", { class: "summary" },
      el("span", {}, el("b", { text: String(st.n) }), ` en ${state.radius} km`),
      el("span", {}, "desde ", el("b", { text: fmtPrice(st.min) }), " €/l")
    ));
    for (const s of state.filtered) box.append(stationCard(s));
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
    const st = state.stats || {};
    const layer = clusterGroup(st);
    state.maps.mainLayer = layer;
    for (const s of state.filtered) layer.addLayer(pricePin(s, st));
    map.addLayer(layer);
    if (state.origin) {
      const icon = L.divIcon({ className: "", html: '<div class="user-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      state.maps.mainUser = L.marker([state.origin.lat, state.origin.lon], { icon, zIndexOffset: 1000, title: "Tu punto de búsqueda" }).addTo(map);
    }
    const pts = state.filtered.map((s) => [s.lat, s.lon]);
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
    state.maps.fitted = false;
    $("place-line").textContent = label;
    $("btn-locate").classList.toggle("is-active", source === "geo");
    if ($("route-origin") && source === "geo" && !$("route-origin").value) {
      $("route-origin").placeholder = "Mi ubicación";
    }
    return loadAround(lat, lon, state.radius);
  }

  function searchPlaces(q, limit = 8) {
    const p = state.places;
    if (!p || !q) return [];
    const nq = norm(q);
    const out = [];
    if (/^\d{5}$/.test(q.trim())) {
      for (const c of p.codigos) if (c.cp === q.trim()) out.push({ kind: "CP", label: `${c.cp} · ${c.n}`, lat: c.lat, lon: c.lon, p: c.p });
    }
    for (const m of p.municipios) {
      if (norm(m.n).includes(nq) || nq.includes(norm(m.n))) out.push({ kind: "Municipio", label: m.n, lat: m.lat, lon: m.lon, p: m.p });
    }
    for (const m of p.localidades) {
      if (norm(m.n).includes(nq)) out.push({ kind: "Localidad", label: m.n, lat: m.lat, lon: m.lon, p: m.p });
    }
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
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=es`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        const extra = (data.features || [])
          .filter((f) => (f.properties?.countrycode || "").toLowerCase() === "es" || !f.properties?.countrycode)
          .map((f) => {
            const pr = f.properties || {};
            const label = [pr.name, pr.street, pr.city || pr.town, pr.postcode].filter(Boolean).join(", ");
            return { kind: "Dirección", label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
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
      (pos) => setOrigin(pos.coords.latitude, pos.coords.longitude, "Tu ubicación", "geo"),
      (err) => {
        const msg = err.code === 1
          ? "No hay permiso de ubicación. Escribe una localidad o un código postal."
          : "No se ha podido obtener la ubicación. Prueba a buscar un pueblo o un CP.";
        $("place-line").textContent = msg;
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  /* ——— favourites, alerts, history ——— */
  function toggleFav(s) {
    const i = state.favs.indexOf(s.id);
    if (i >= 0) state.favs.splice(i, 1);
    else state.favs.push(s.id);
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

  function renderVehicleSheet() {
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
    saveLS("vehicle", state.vehicle);
    closeSheets();
    applyFilters();
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
    closeSheets();
    const s = $(id);
    s.hidden = false;
    $("backdrop").hidden = false;
    $("backdrop").classList.add("is-on");
    requestAnimationFrame(() => s.classList.add("is-on"));
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
  function closeSheets() {
    for (const s of document.querySelectorAll(".sheet")) {
      s.classList.remove("is-on");
      setTimeout(() => { if (!s.classList.contains("is-on")) s.hidden = true; }, 280);
    }
    $("backdrop").classList.remove("is-on");
    $("backdrop").hidden = true;
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
    if (name === "log") renderLog();
    if (name === "route") setTimeout(() => state.maps.route && state.maps.route.invalidateSize(), 150);
    if (name === "nearby") setTimeout(renderMap, 80);
  }

  /* ——— bind UI ——— */
  function buildFuels() {
    const box = $("fuels");
    box.replaceChildren();
    for (const f of FUELS) {
      const b = el("button", {
        type: "button",
        class: "fuel-chip" + (f.id === state.fuelId ? " is-active" : ""),
        role: "option",
        "aria-selected": f.id === state.fuelId,
        onclick: () => {
          state.fuelId = f.id;
          saveLS("fuelId", f.id);
          persistCfg();
          buildFuels();
          applyFilters();
          if (state.view === "route" && state.routeStations.length) runRoute();
        }
      }, el("span", { text: f.short, title: f.label }));
      box.append(b);
    }
  }

  function buildRadii() {
    const box = $("radii");
    box.replaceChildren();
    for (const r of RADII) {
      const b = el("button", {
        type: "button",
        class: "chip" + (r === state.radius ? " is-active" : ""),
        onclick: async () => {
          state.radius = r;
          state.maps.fitted = false;
          saveLS("radius", r);
          box.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
          updateFiltersLabel();
          if (state.origin) {
            await loadAround(state.origin.lat, state.origin.lon, r);
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
    $("backdrop").addEventListener("click", closeSheets);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeSheets));

    let t = 0;
    $("search-input").addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => showSuggest(searchPlaces($("search-input").value), $("suggest"), (it) => {
        $("search-input").value = it.label;
        setOrigin(it.lat, it.lon, it.label, "search");
      }), 160);
    });
    $("search-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = $("search-input").value.trim();
      const found = await geocodeFree(q);
      if (found[0]) setOrigin(found[0].lat, found[0].lon, found[0].label, "search");
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
    if (params.has("lat") && params.has("lon")) {
      await setOrigin(Number(params.get("lat")), Number(params.get("lon")), params.get("label") || "Ubicación de prueba", "query");
    } else {
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
