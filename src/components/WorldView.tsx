import { useState } from "react";
import MapView, { Pin } from "./MapView";
import { carTypes, CarType } from "../lib/cars";
import { SparkleRow } from "./bits";

interface Props {
  destination: string | null;
  gate: string;
  coords: { lat: number; lon: number } | null;
  pins: Pin[];
  selectedCar: CarType;
  onSelectCar: (c: CarType) => void;
  onSearchPlace: (q: string) => void;
  searching: boolean;
  onDive: () => void;
}

function Barcode({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 997;
  const bars = [];
  for (let i = 0; i < 34; i++) {
    h = (h * 137 + 71) % 997;
    bars.push(<rect key={i} x={i * 4} y="0" width={h % 3 === 0 ? 2.6 : 1.3} height="26" fill="#17140f" />);
  }
  return (
    <svg viewBox="0 0 136 26" className="h-6 w-full" preserveAspectRatio="none">
      {bars}
    </svg>
  );
}

export default function WorldView(p: Props) {
  const [q, setQ] = useState("");

  return (
    <div className="grid gap-4 reveal" style={{ gridTemplateColumns: "1fr 290px" }}>
      {/* center: search + world map */}
      <div className="flex flex-col gap-3 min-w-0">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              p.onSearchPlace(q.trim());
              setQ("");
            }
          }}
        >
          <input
            className="input-paper !py-2.5 !text-[16px]"
            placeholder="search anything — a city, a country, a dream…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn-solid" type="submit" disabled={p.searching}>
            {p.searching ? "…" : "let's go"}
          </button>
        </form>

        <div className="relative flex-1" style={{ minHeight: 420 }}>
          <MapView center={p.coords} zoom={p.coords ? 5 : 2} pins={p.pins} height="100%" />
          <svg className="compass-wm" style={{ right: 18, top: 16, width: 90, height: 90 }} viewBox="0 0 100 100" fill="none" stroke="#17140f" strokeWidth="1.4">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="34" />
            <path d="M50 6 L56 44 L94 50 L56 56 L50 94 L44 56 L6 50 L44 44 Z" fill="#17140f" stroke="none" />
            <text x="50" y="16" textAnchor="middle" fontSize="9" fill="#17140f" fontFamily="JetBrains Mono">N</text>
          </svg>
        </div>
        <p className="mono text-[10px] tracking-wide" style={{ color: "var(--muted)" }}>
          a real, draggable map — spin it, zoom it, then type where you're headed.
        </p>
      </div>

      {/* right: ride + ticket + guide */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="panel p-3.5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">choose ur ride</span>
            <SparkleRow />
          </div>
          <h3 className="serif text-[17px] font-bold leading-tight mt-0.5 mb-2.5">
            before you land in{p.destination ? ` ${p.destination}` : "…"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {carTypes.map((c) => (
              <div
                key={c.id}
                className={"car-card" + (p.selectedCar.id === c.id ? " selected" : "")}
                onClick={() => p.onSelectCar(c)}
              >
                {c.svg(p.selectedCar.id === c.id ? c.color : "#6b6353")}
                <div className="name">{c.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ticket">
          {p.destination && <div className="stamp">BOARDING</div>}
          <div className="flex justify-between items-start">
            <div>
              <div className="label">Passenger</div>
              <div className="value">You</div>
            </div>
            <div className="text-right">
              <div className="label">Gate</div>
              <div className="value">{p.gate}</div>
            </div>
          </div>
          <div className="border-t border-dashed my-2.5" style={{ borderColor: "var(--line)" }} />
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <div className="label">Destination</div>
              <div className="value truncate">{p.destination || "type a place →"}</div>
            </div>
            <div className="w-[74px] shrink-0">{p.selectedCar.svg()}</div>
          </div>
          <div className="mt-3">
            <Barcode seed={p.destination || "travibe"} />
          </div>
          <button className="btn-solid w-full mt-3" onClick={p.onDive} disabled={!p.destination}>
            dive in
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="guide-bubble text-center">
          <svg className="mx-auto mb-1" width="52" height="30" viewBox="0 0 52 30" fill="none" stroke="#17140f" strokeWidth="2" strokeLinecap="round">
            <path d="M8 14 q5 -7 10 0" />
            <path d="M34 14 q5 -7 10 0" />
            <path d="M20 20 q6 7 12 0" />
          </svg>
          <div className="body-serif text-[14px] leading-snug">
            {p.destination ? (
              <>your local AI guide is warmed up for <b>{p.destination}</b>. dive in to meet them.</>
            ) : (
              <>ur local AI guide is napping — pick a place and they'll wake up full of stories.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
