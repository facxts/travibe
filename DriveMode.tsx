import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { CarType } from "../lib/cars";
import { Sparkle } from "./bits";
import { baseStyle, addBuildings, setBuildingsMode, dayFilter, ensurePmtiles, DayMode } from "../lib/mapengine";
import { reverseGeocode } from "../lib/api";

interface Props {
  city: string;
  center: { lat: number; lon: number };
  car: CarType;
  onExit: () => void;
}

const MAX = 0.000085;

export default function DriveMode({ city, center, car, onExit }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [kmh, setKmh] = useState(0);
  const [heading, setHeading] = useState(0);
  const [mode, setMode] = useState<DayMode>("day");
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!boxRef.current) return;
    rootRef.current?.focus();
    ensurePmtiles();

    const map = new maplibregl.Map({
      container: boxRef.current,
      style: baseStyle(),
      center: [center.lon, center.lat],
      zoom: 17.2,
      pitch: 62,
      bearing: 0,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on("load", () => addBuildings(map, "day"));

    // tap buildings & places while driving
    map.on("click", async (e) => {
      const bld = map.getLayer("3d-buildings")
        ? map.queryRenderedFeatures(e.point, { layers: ["3d-buildings"] })[0]
        : undefined;
      if (bld) {
        const h = Math.round(Number(bld.properties?.height) || 0);
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;">building · ${h > 0 ? `≈${h} m tall` : "real OSM footprint"}</div>`)
          .addTo(map);
        return;
      }
      const pop = new maplibregl.Popup({ offset: 8, closeButton: false })
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#756b57;">reading the map…</div>`)
        .addTo(map);
      const hit = await reverseGeocode(e.lngLat.lat, e.lngLat.lng);
      pop.setHTML(
        hit
          ? `<div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;">${hit.name}</div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#7d6c4a;margin-top:2px;">${hit.kind} · ${hit.detail}</div>`
          : `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;">open road</div>`
      );
    });

    // the car — big, halo-plated, impossible to miss
    const el = document.createElement("div");
    el.className = "car-marker";
    el.innerHTML = `<div class="car-plate">${car.svg(car.color)}</div>`;
    const marker = new maplibregl.Marker({ element: el, rotationAlignment: "map", pitchAlignment: "map", anchor: "center" })
      .setLngLat([center.lon, center.lat])
      .addTo(map);

    const st = { speed: 0, heading: 0, camBearing: 0, lat: center.lat, lon: center.lon };
    let raf = 0;
    let hudTick = 0;

    const step = () => {
      const k = keys.current;
      st.speed += (k.up ? 0.0000055 : 0) - (k.down ? 0.000005 : 0);
      st.speed *= 0.965;
      st.speed = Math.max(-MAX * 0.5, Math.min(MAX, st.speed));
      if (Math.abs(st.speed) < 0.0000004) st.speed = 0;

      const steer = (k.left ? -1 : 0) + (k.right ? 1 : 0);
      const grip = Math.min(1, Math.abs(st.speed) / (MAX * 0.2) + 0.15);
      st.heading += steer * 2.8 * grip * (st.speed >= 0 ? 1 : -1);

      const rad = (st.heading * Math.PI) / 180;
      st.lat += Math.cos(rad) * st.speed;
      st.lon += (Math.sin(rad) * st.speed) / Math.cos((st.lat * Math.PI) / 180);

      marker.setLngLat([st.lon, st.lat]).setRotation(st.heading);

      let diff = st.heading - st.camBearing;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      st.camBearing += diff * 0.12;
      map.jumpTo({ center: [st.lon, st.lat], bearing: st.camBearing, zoom: 17.2, pitch: 62 });

      if (++hudTick % 5 === 0) {
        setKmh(Math.round((Math.abs(st.speed) / MAX) * 140));
        setHeading(Math.round(((st.heading % 360) + 360) % 360));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const setKey = (code: string, v: boolean) => {
      if (code === "ArrowUp" || code === "KeyW") keys.current.up = v;
      if (code === "ArrowDown" || code === "KeyS") keys.current.down = v;
      if (code === "ArrowLeft" || code === "KeyA") keys.current.left = v;
      if (code === "ArrowRight" || code === "KeyD") keys.current.right = v;
    };
    const kd = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      setKey(e.code, true);
    };
    const ku = (e: KeyboardEvent) => setKey(e.code, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      marker.remove();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // atmosphere: day / dusk / night
  useEffect(() => {
    const map = mapRef.current;
    if (map && boxRef.current) {
      boxRef.current.style.filter = dayFilter[mode];
      if (map.getLayer("3d-buildings")) setBuildingsMode(map, mode);
    }
  }, [mode]);

  const hold = (key: "up" | "down" | "left" | "right") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      keys.current[key] = true;
      e.currentTarget.classList.add("held");
    },
    onPointerUp: (e: React.PointerEvent) => {
      keys.current[key] = false;
      e.currentTarget.classList.remove("held");
    },
    onPointerCancel: (e: React.PointerEvent) => {
      keys.current[key] = false;
      e.currentTarget.classList.remove("held");
    },
  });

  const arrow = (d: number) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ transform: `rotate(${d}deg)` }}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );

  return (
    <div className="drive-overlay" ref={rootRef} tabIndex={0}>
      <div ref={boxRef} className="drive-map" />

      <div className="drive-hud" style={{ top: 14, left: 14 }}>
        <div className="hud-panel flex items-center gap-2.5">
          <Sparkle size={13} className="s2" />
          <div>
            <div className="mono text-[8.5px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              now driving · 3d streets
            </div>
            <div className="serif text-[16px] font-bold leading-tight">{city}</div>
          </div>
        </div>
        <div className="hud-panel mt-2 mono text-[9px] leading-relaxed" style={{ maxWidth: 220 }}>
          <b>W A S D</b> / arrows, or the pad →.<br />
          tap any building or place to<br />
          read what it is. drag to look around.
        </div>
      </div>

      <div className="drive-hud" style={{ top: 14, right: 14 }}>
        <div className="hud-panel mb-2 flex items-center gap-1.5">
          <span className="mono text-[8.5px] uppercase tracking-[0.12em] mr-1" style={{ color: "var(--muted)" }}>sky</span>
          {(
            [
              ["day", "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "day"],
              ["dusk", "M12 10a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5zM3 18h18M5 21h14", "dusk"],
              ["night", "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z", "night"],
            ] as [DayMode, string, string][]
          ).map(([m, d, label]) => (
            <button
              key={m}
              className="ctrl-btn"
              style={{ width: 32, height: 30, ...(mode === m ? { background: "var(--cocoa)", color: "var(--cream)" } : {}) }}
              onClick={() => setMode(m)}
              aria-label={label}
              title={label}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
        <button className="icon-btn !bg-[var(--cream)]" onClick={onExit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          park the car
        </button>
      </div>

      <div className="drive-hud" style={{ bottom: 16, left: 14 }}>
        <div className="hud-panel flex items-center gap-3">
          <div>
            <div className="speed-num">{kmh}</div>
            <div className="mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>km/h</div>
          </div>
          <svg width="46" height="46" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="var(--cream-3)" stroke="var(--ink)" strokeWidth="1.5" />
            <g className="compass-needle" style={{ transform: `rotate(${-heading}deg)` }}>
              <path d="M22 6 L26 24 L22 21 L18 24 Z" fill="var(--burgundy)" />
              <path d="M22 38 L26 24 L22 27 L18 24 Z" fill="var(--ink)" opacity="0.35" />
            </g>
            <text x="22" y="12" textAnchor="middle" fontSize="6.5" fontFamily="JetBrains Mono" fill="var(--ink)">N</text>
          </svg>
        </div>
      </div>

      <div className="drive-hud" style={{ bottom: 16, right: 14 }}>
        <div className="ctrl-pad">
          <div />
          <button className="ctrl-btn" {...hold("up")} aria-label="accelerate">{arrow(0)}</button>
          <div />
          <button className="ctrl-btn" {...hold("left")} aria-label="steer left">{arrow(-90)}</button>
          <div className="ctrl-btn" style={{ cursor: "default", opacity: 0.3 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>
          </div>
          <button className="ctrl-btn" {...hold("right")} aria-label="steer right">{arrow(90)}</button>
          <div />
          <button className="ctrl-btn" {...hold("down")} aria-label="brake / reverse">{arrow(180)}</button>
          <div />
        </div>
      </div>
    </div>
  );
}
