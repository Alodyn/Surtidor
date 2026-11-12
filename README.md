# Surtidor

App web móvil (PWA) con los precios oficiales de carburantes y los puntos de recarga eléctrica cercanos.

## Fuentes

- **Carburantes**: API REST del Ministerio (MITECO / Minetur), con CORS y actualizada cada media hora:
  https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
  Las coordenadas y los precios usan coma decimal.
- **Cuándo repostar**: histórico oficial `EstacionesTerrestresHist/FiltroMunicipioProducto/{dd-MM-yyyy}/{IDMunicipio}/{IDProducto}`
  (últimos 28 días; algunos días responden 400 y se cuentan como «sin dato»).
- **Puntos de recarga**: registro oficial MITERD publicado por la DGT en el Punto de Acceso Nacional (DATEX II v3, diario):
  https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml
  No tiene CORS (unos 84 MB) ni precios, así que se preprocesa en `ev/` con `tools/build_ev.py` (teselas de 0,5°).
- **Superchargers de Tesla**: https://supercharge.info/service/supercharge/allSites (público, sin clave), fusionado en `ev/`.
- **Tarifa de recarga**: solo si aparece en OpenStreetMap (`charge=*`, vía Overpass) y marcada como dato colaborativo.
  Si no, la app muestra «Precio no disponible».

## Actualizar los puntos de recarga

```
python3 tools/build_ev.py            # descarga ambas fuentes y regenera ev/
```

Conviene ejecutarlo a diario (el registro se publica cada 24 h), por ejemplo con una GitHub Action programada.

Capacidades de depósito y consumos: ver `vehicles.json` (fuentes: km77.com, folletos de fabricante).

Publicada en https://alodyn.github.io/Surtidor/

## Ahorro neto (v4)
Referencia: «Mi casa» + «Mi gasolinera habitual» (localStorage `surtidor.myHome`, `surtidor.habitual`).
Ahorro neto = (precio habitual − precio efectivo X) × litros del depósito − (km ida y vuelta origen→X − origen→habitual) × l/100 km × precio X.
Origen: casa, o la ubicación/punto buscado si está a más de 3 km de casa. Distancias por carretera con la tabla de OSRM (2 peticiones por tanda de 80, máx. 160 estaciones, en caché), con línea recta × 1,3 de respaldo. Sin habitual, se compara con la más cercana con ese carburante.
