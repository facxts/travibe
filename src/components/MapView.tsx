import { useEffect, useRef } from "react";
import L from "leaflet";

export interface Pin {
  id: string;
  lat: number;
  lon: number;
  label: string;
  color?: string;
}

interface Props {
  center: { lat: number; lon: number } | null;
  zoom: number;
  pins: Pin[];
  height?: string;
}

function pinIcon(color = "#6d1a24") {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 39 C15 39 28 24 28 14 A13 13 0 0 0 2 14 C2 24 15 39 15 39 Z"
        fill="${color}" stroke="#17140f" stroke-width="1.6"/>
      <circle cx="15" cy="14" r="5" fill="#f3ede0" stroke="#17140f" stroke-width="1.4"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

export default function MapView({ center, zoom, pins, height = "100%" }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: center ? [center.lat, center.lon] : [24, 12],
      zoom: center ? zoom : 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo([center.lat, center.lon], zoom, { duration: 1.4 });
    setTimeout(() => map.invalidateSize(), 200);
  }, [center?.lat, center?.lon, zoom]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    pins.forEach((p) => {
      L.marker([p.lat, p.lon], { icon: pinIcon(p.color) })
        .bindPopup(
          `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#17140f;">${p.label}</div>`
        )
        .addTo(layer);
    });
  }, [pins]);

  return (
    <div className="map-shell" style={{ height }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      <div className="map-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        live map · openstreetmap
      </div>
    </div>
  );
}
