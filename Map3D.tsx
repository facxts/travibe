import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { baseStyle, addBuildings, ensurePmtiles } from "../lib/mapengine";
import { reverseGeocode } from "../lib/api";

export interface Pin3D {
  id: string;
  lat: number;
  lon: number;
  label: string;
  color?: string;
}

interface Props {
  center: { lat: number; lon: number } | null;
  zoom?: number;
  pitch?: number;
  pins: Pin3D[];
  height?: string;
}

function pinEl(color = "#6d1a24") {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39 C15 39 28 24 28 14 A13 13 0 0 0 2 14 C2 24 15 39 15 39 Z" fill="${color}" stroke="#17140f" stroke-width="1.6"/><circle cx="15" cy="14" r="5" fill="#f6f2e8" stroke="#17140f" stroke-width="1.4"/></svg>`;
  return el;
}

export default function Map3D({ center, zoom = 15.6, pitch = 56, pins, height = "100%" }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    ensurePmtiles();
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: baseStyle(),
      center: center ? [center.lon, center.lat] : [12, 24],
      zoom: center ? zoom : 1.6,
      pitch: center ? pitch : 0,
      bearing: center ? -18 : 0,
      attributionControl: { compact: true },
      dragRotate: true,
      touchPitch: true,
      touchZoomRotate: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => addBuildings(map, "day"));

    map.on("click", async (e) => {
      // 1) a real 3d building under the tap?
      const bld = map.getLayer("3d-buildings")
        ? map.queryRenderedFeatures(e.point, { layers: ["3d-buildings"] })[0]
        : undefined;
      if (bld) {
        const h = Math.round(Number(bld.properties?.height) || 0);
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;">${
              bld.properties?.name ? `<b style="font-family:'Playfair Display',serif;font-size:13px;">${bld.properties.name}</b><br/>` : ""
            }real building · ${h > 0 ? `≈${h} m tall` : "OSM footprint"}</div>`
          )
          .addTo(map);
        return;
      }
      // 2) otherwise ask OpenStreetMap what lives at this exact point
      const pop = new maplibregl.Popup({ offset: 8, closeButton: false })
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#756b57;">reading the map…</div>`)
        .addTo(map);
      const hit = await reverseGeocode(e.lngLat.lat, e.lngLat.lng);
      if (hit) {
        pop.setHTML(
          `<div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;">${hit.name}</div>
           <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#7d6c4a;margin-top:2px;">${hit.kind} · ${hit.detail}</div>`
        );
      } else {
        pop.setHTML(`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;">open water or wilderness</div>`);
      }
    });
    map.on("mousemove", (e) => {
      const f = map.getLayer("3d-buildings")
        ? map.queryRenderedFeatures(e.point, { layers: ["3d-buildings"] })
        : [];
      map.getCanvas().style.cursor = f.length ? "pointer" : "";
    });

    mapRef.current = map;
    setTimeout(() => map.resize(), 80);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo({ center: [center.lon, center.lat], zoom, pitch, bearing: -18, duration: 1400 });
    setTimeout(() => map.resize(), 250);
  }, [center?.lat, center?.lon, zoom, pitch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = pins.map(
      (p) =>
        new maplibregl.Marker({ element: pinEl(p.color), anchor: "bottom" })
          .setLngLat([p.lon, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 30 }).setHTML(`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;">${p.label}</div>`))
          .addTo(map)
    );
  }, [pins]);

  return (
    <div className="map-shell" style={{ height }}>
      <div ref={boxRef} style={{ width: "100%", height: "100%" }} />
      <div className="map-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        real 3d · right-drag to orbit · tap anything to read it
      </div>
    </div>
  );
}
