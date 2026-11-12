#!/usr/bin/env python3
"""Genera ev/ (puntos de recarga) para Surtidor.

Fuentes:
 - Registro oficial MITERD vía Punto de Acceso Nacional (DGT), DATEX II v3, diario:
   https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml
   (no tiene CORS ni precios; por eso se preprocesa aquí en teselas JSON pequeñas)
 - Superchargers de Tesla: https://supercharge.info/service/supercharge/allSites (CORS, sin clave)

Uso: python3 tools/build_ev.py [electrolineras.xml] [allSites.json]
Sin argumentos descarga ambas fuentes.
"""
import json, math, os, re, sys, urllib.request, datetime, collections
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "ev")
NAP = "https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml"
SC = "https://supercharge.info/service/supercharge/allSites"
TILE = 0.5

NS = {
    "com": "http://datex2.eu/schema/3/common",
    "loc": "http://datex2.eu/schema/3/locationReferencing",
    "locx": "http://datex2.eu/schema/3/locationExtension",
    "fac": "http://datex2.eu/schema/3/facilities",
    "egi": "http://datex2.eu/schema/3/energyInfrastructure",
}
CONN = {
    "iec62196T2COMBO": "CCS", "iec62196T1COMBO": "CCS1", "iec62196T2": "T2",
    "chademo": "CHAdeMO", "iec62196T1": "T1", "domesticF": "Schuko", "domesticE": "Schuko",
    "iec60309x2single16": "CEE", "iec60309x2three32": "CEE",
}
DAYS = {"Lunes": 1, "Martes": 2, "Miercoles": 3, "Miércoles": 3, "Jueves": 4, "Viernes": 5, "Sabado": 6, "Sábado": 6, "Domingo": 0}


def fetch(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Surtidor-build/1.0 (github.com/Alodyn/Surtidor)"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def q(tag):
    p, t = tag.split(":")
    return "{%s}%s" % (NS[p], t)


def txt(node, path):
    n = node.find(path, NS)
    return n.text.strip() if n is not None and n.text else ""


def hav(a, b, c, d):
    R = 6371000
    p1, p2 = math.radians(a), math.radians(c)
    x = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2
    return 2 * R * math.asin(min(1, math.sqrt(x)))


def hours(label):
    """'Lunes (00:00 - 23:59) Martes (08:30 - 17:30)...' -> {dow: [[a,b],...]} en minutos, o '24h'."""
    if not label:
        return None
    out = collections.defaultdict(list)
    for d, a1, a2, b1, b2 in re.findall(r"([A-Za-zéá]+)\s*\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)", label):
        if d not in DAYS:
            continue
        a, b = int(a1) * 60 + int(a2), int(b1) * 60 + int(b2)
        if b >= 23 * 60 + 59:
            b = 24 * 60
        out[DAYS[d]].append([a, b])
    if not out:
        return None
    if len(out) == 7 and all(v == [[0, 1440]] for v in out.values()):
        return "24h"
    return {str(k): v for k, v in sorted(out.items())}


def parse_nap(path):
    sites = []
    for ev, el in ET.iterparse(path, events=("end",)):
        if el.tag != q("egi:energyInfrastructureSite"):
            continue
        sid = el.get("id") or ""
        try:
            lat = float(txt(el, "fac:locationReference/loc:coordinatesForDisplay/loc:latitude"))
            lon = float(txt(el, "fac:locationReference/loc:coordinatesForDisplay/loc:longitude"))
        except ValueError:
            el.clear(); continue
        if not (27 < lat < 44.5 and -19 < lon < 5):
            el.clear(); continue
        name = txt(el, "fac:name/com:values/com:value")
        addr, muni, prov = "", "", ""
        for line in el.findall(".//locx:addressLine", NS):
            v = txt(line, "locx:text/com:values/com:value")
            if v.startswith("Dirección:"): addr = v.split(":", 1)[1].strip()
            elif v.startswith("Municipio:"): muni = v.split(":", 1)[1].strip()
            elif v.startswith("Provincia:"): prov = v.split(":", 1)[1].strip()
        cp = txt(el, ".//locx:postcode")
        op = txt(el, "fac:operator/fac:name/com:values/com:value")
        tsite = txt(el, "egi:typeOfSite")
        assoc = [t.text for t in el.findall(".//fac:associatedFacility/fac:type", NS) if t.text]
        serv = sorted({t.text for t in el.findall(".//fac:serviceFacilityType", NS) if t.text})
        hl = txt(el, "fac:operatingHours/fac:label")
        upd = txt(el, "fac:lastUpdated")[:10]
        conns = {}
        points = 0
        kwmax = 0
        auth = set()
        for st in el.findall("egi:energyInfrastructureStation", NS):
            for a in st.findall("egi:authenticationAndIdentificationMethods", NS):
                if a.text: auth.add(a.text)
            for rp in st.findall("egi:refillPoint", NS):
                points += 1
                seen = set()
                for c in rp.findall("egi:connector", NS):
                    ct = CONN.get(txt(c, "egi:connectorType"), "Otro")
                    try: kw = float(txt(c, "egi:maxPowerAtSocket") or 0) / 1000
                    except ValueError: kw = 0
                    if kw > 1000: kw = 0  # valores imposibles
                    kw = round(kw, 1)
                    cur = conns.setdefault(ct, [0, 0])
                    if ct not in seen:
                        cur[0] += 1; seen.add(ct)
                    cur[1] = max(cur[1], kw)
                    kwmax = max(kwmax, kw)
        el.clear()
        nl = name.lower()
        parking = "parkingSite" in assoc or bool(re.search(r"parking|p[aá]rking|aparcamiento|estacionamiento", nl))
        sites.append({
            "i": sid, "n": name, "a": addr, "m": muni, "cp": cp, "p": prov,
            "la": round(lat, 6), "lo": round(lon, 6), "op": op, "t": tsite,
            "pk": 1 if parking else 0, "np": points, "kw": kwmax,
            "c": conns, "h": hours(hl), "hl": hl[:200] if hl and hours(hl) is None else "",
            "au": sorted(auth), "sv": serv, "u": upd, "src": "nap",
        })
    return sites


def parse_sc(path):
    d = json.load(open(path, encoding="utf-8"))
    out = []
    for x in d:
        if (x.get("address") or {}).get("country") != "Spain":
            continue
        if x.get("status") not in ("OPEN", "EXPANDING"):
            continue
        g = x.get("gps") or {}
        out.append({
            "id": x.get("id"), "name": x.get("name"), "lat": g.get("latitude"), "lon": g.get("longitude"),
            "stalls": x.get("stallCount"), "kw": x.get("powerKilowatt"), "plugs": x.get("plugs") or {},
            "opened": x.get("dateOpened"), "status": x.get("status"), "other": x.get("otherEVs"),
            "street": (x.get("address") or {}).get("street"), "city": (x.get("address") or {}).get("city"),
            "facility": x.get("facilityName"), "notes": x.get("addressNotes"),
        })
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    xml = sys.argv[1] if len(sys.argv) > 1 else fetch(NAP, "/tmp/electrolineras.xml")
    scj = sys.argv[2] if len(sys.argv) > 2 else fetch(SC, "/tmp/sc-allsites.json")
    pub = ""
    with open(xml, encoding="utf-8") as f:
        head = f.read(4000)
        m = re.search(r"<com:publicationTime>([^<]+)", head)
        pub = m.group(1) if m else ""
    sites = parse_nap(xml)
    scs = parse_sc(scj)
    # Superchargers: enlaza con el registro oficial si hay un sitio de Tesla a <250 m
    matched = 0
    for s in scs:
        best, bd = None, 1e9
        for x in sites:
            if abs(x["la"] - s["lat"]) > 0.004 or abs(x["lo"] - s["lon"]) > 0.005:
                continue
            d = hav(x["la"], x["lo"], s["lat"], s["lon"])
            if d < bd and "tesla" in x["op"].lower() and not x.get("sc"):
                best, bd = x, d
        sc = {"id": s["id"], "st": s["stalls"], "kw": s["kw"], "pl": s["plugs"], "o": s["opened"],
              "x": 1 if s["other"] else 0, "nm": s["name"]}
        if best is not None and bd < 300:
            best["sc"] = sc
            best["kw"] = max(best["kw"], s["kw"] or 0)
            matched += 1
        else:
            conns = {}
            pl = s["plugs"]
            if pl.get("ccs2"): conns["CCS"] = [pl["ccs2"], s["kw"] or 0]
            if pl.get("type2") and not pl.get("ccs2"): conns["Tesla"] = [pl["type2"], s["kw"] or 0]
            if pl.get("nacs"): conns["NACS"] = [pl["nacs"], s["kw"] or 0]
            sites.append({
                "i": "sc%s" % s["id"], "n": "Tesla Supercharger " + (s["name"] or "").replace(", Spain", ""),
                "a": s["street"] or "", "m": s["city"] or "", "cp": "", "p": "",
                "la": s["lat"], "lo": s["lon"], "op": "Tesla", "t": "", "pk": 0,
                "np": s["stalls"] or 0, "kw": s["kw"] or 0, "c": conns, "h": None, "hl": "",
                "au": [], "sv": [], "u": "", "src": "sc", "sc": sc,
            })
    for x in sites:
        if "tesla" in x["op"].lower() or x.get("sc"):
            x["tesla"] = 1
    tiles = collections.defaultdict(list)
    for x in sites:
        k = "%g_%g" % (math.floor(x["la"] / TILE) * TILE, math.floor(x["lo"] / TILE) * TILE)
        # compacta: quita vacíos
        tiles[k].append({k2: v for k2, v in x.items() if v not in ("", None, [], {}, 0) or k2 in ("la", "lo")})
    tdir = os.path.join(OUT, "t")
    os.makedirs(tdir, exist_ok=True)
    for f in os.listdir(tdir):
        os.remove(os.path.join(tdir, f))
    for k, v in tiles.items():
        with open(os.path.join(tdir, k + ".json"), "w", encoding="utf-8") as f:
            json.dump(v, f, ensure_ascii=False, separators=(",", ":"))
    meta = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "napPublicationTime": pub, "tile": TILE, "tiles": sorted(tiles), "sites": len(sites),
        "points": sum(x["np"] for x in sites), "superchargers": len(scs), "superchargersMatched": matched,
        "sources": [NAP, SC],
        "note": "Registro oficial MITERD (DATEX II, Punto de Acceso Nacional DGT). No incluye precios.",
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: meta[k] for k in ("sites", "points", "superchargers", "superchargersMatched", "napPublicationTime")}, ensure_ascii=False), len(tiles), "teselas")


if __name__ == "__main__":
    main()
