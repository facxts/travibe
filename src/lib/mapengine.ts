import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

/* ------------------------------------------------------------------
   Travibe world engine
   - CARTO voyager raster base  → real streets, labels, coastlines,
     forests & rivers that ALWAYS render (no blank maps)
   - Protomaps planet buildings → real extruded 3D footprints with
     heights for every city on Earth
   ------------------------------------------------------------------ */

let protoAdded = false;
export function ensurePmtiles() {
  if (protoAdded) return;
  try {
    const p = new Protocol();
    (maplibregl as any).addProtocol("pmtiles", (p as any).tile.bind(p));
    protoAdded = true;
  } catch {
    /* pmtiles unavailable — buildings silently skipped */
  }
}

export function baseStyle(): any {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto: {
        type: "raster",
        tiles: ["a", "b", "c", "d"].map(
          (s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`
        ),
        tileSize: 256,
        attribution: "© OpenStreetMap © CARTO",
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  };
}

export type DayMode = "day" | "dusk" | "night";

export function buildingPaint(mode: DayMode): Record<string, any> {
  if (mode === "night") {
    return {
      "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#2a3140", 40, "#39415a", 150, "#515d80"],
      "fill-extrusion-opacity": 0.95,
    };
  }
  if (mode === "dusk") {
    return {
      "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#e7c9a1", 40, "#cf9d6e", 150, "#a06b48"],
      "fill-extrusion-opacity": 0.93,
    };
  }
  return {
    "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#ece4d0", 40, "#d4c6a8", 150, "#a8977a"],
    "fill-extrusion-opacity": 0.9,
  };
}

export function addBuildings(map: maplibregl.Map, mode: DayMode = "day") {
  try {
    ensurePmtiles();
    if (!map.getSource("pm-buildings")) {
      map.addSource("pm-buildings", {
        type: "vector",
        url: "pmtiles://https://tiles.protomaps.com/buildings.pmtiles",
        attribution: "© OpenStreetMap buildings",
      });
    }
    if (map.getLayer("3d-buildings")) return;
    const layer = (sourceLayer: string) =>
      map.addLayer({
        id: "3d-buildings",
        source: "pm-buildings",
        "source-layer": sourceLayer,
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-height": ["interpolate", ["linear"], ["coalesce", ["get", "height"], 0], 0, 3, 400, 400],
          "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
          ...buildingPaint(mode),
        },
      } as any);
    try {
      layer("buildings");
    } catch {
      try {
        layer("building");
      } catch {}
    }
  } catch {
    /* no buildings — base map still fully usable */
  }
}

export function setBuildingsMode(map: maplibregl.Map, mode: DayMode) {
  if (!map.getLayer("3d-buildings")) return;
  const p = buildingPaint(mode);
  map.setPaintProperty("3d-buildings", "fill-extrusion-color", p["fill-extrusion-color"]);
  map.setPaintProperty("3d-buildings", "fill-extrusion-opacity", p["fill-extrusion-opacity"]);
}

export const dayFilter: Record<DayMode, string> = {
  day: "none",
  dusk: "sepia(0.28) saturate(1.25) hue-rotate(-12deg) brightness(0.92) contrast(1.02)",
  night: "brightness(0.52) saturate(0.65) hue-rotate(195deg) contrast(1.05)",
};
