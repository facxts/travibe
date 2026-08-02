import { useEffect, useRef, useState } from "react";
import Map3D, { Pin3D } from "./Map3D";
import { CarType } from "../lib/cars";
import { Landmark, ViralSpot } from "../lib/api";
import { Sparkle } from "./bits";
import GuideAvatar from "./GuideAvatar";

const KIND_ICON: Record<string, React.ReactNode> = {
  cafe: <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM16 9h2a3 3 0 0 1 0 6h-2M7 3c0 1.2-.8 1.6-.8 2.8M11 3c0 1.2-.8 1.6-.8 2.8" />,
  park: <path d="M12 3v18M12 8a4.5 4.5 0 1 0 0 9M12 8a4.5 4.5 0 1 1 0 9M5 21h14" />,
  photo: <path d="M4 8h3l2-2.5h6L17 8h3v11H4zM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />,
  food: <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 0-3 2.2-3 5 0 2.2 1 3.6 2 4v9" />,
  spot: <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
};

export interface ChatMsg {
  who: "you" | "guide";
  text: string;
}

interface Props {
  city: string;
  car: CarType;
  coords: { lat: number; lon: number } | null;
  pins: Pin3D[];
  landmarks: Landmark[];
  loadingLandmarks: boolean;
  visited: Set<string>;
  onLandmarkClick: (l: Landmark) => void;
  viral: ViralSpot[];
  viralSeen: Set<string>;
  onViralClick: (v: ViralSpot) => void;
  messages: ChatMsg[];
  asking: boolean;
  onAsk: (q: string) => void;
  onOpenQuiz: () => void;
  onDrive: () => void;
}

export default function PlaceView(p: Props) {
  const [topQ, setTopQ] = useState("");
  const [chatQ, setChatQ] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [p.messages, p.asking]);

  return (
    <div className="flex flex-col gap-4 reveal min-w-0">
      {/* top: ask anything bar */}
      <form
        className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (topQ.trim()) {
              p.onAsk(topQ.trim());
              setTopQ("");
            }
          }}
        >
          <input
            className="input-paper !py-2.5 !text-[16px]"
            placeholder={`ask your ${p.city} guide anything…`}
            value={topQ}
            onChange={(e) => setTopQ(e.target.value)}
          />
        <button className="btn-solid" type="submit" disabled={p.asking}>
          {p.asking ? "…" : "ask"}
        </button>
      </form>

      {/* arrival hero */}
      <div className="relative panel overflow-hidden px-6 pt-7 pb-5" style={{ background: "var(--cream-3)" }}>
        <div className="stack-card" style={{ inset: "14px 18px auto 14px", height: "72%", transform: "rotate(-1.6deg)", opacity: 0.5 }} />
        <div className="stack-card" style={{ inset: "10px 12px auto 10px", height: "76%", transform: "rotate(1.1deg)", opacity: 0.75 }} />
        <span className="absolute" style={{ top: 22, left: 20, color: "var(--olive)" }}>
          <Sparkle size={14} />
        </span>
        <span className="absolute" style={{ top: 18, right: 26, color: "var(--olive)" }}>
          <Sparkle size={22} className="s2" />
        </span>
        <span className="absolute" style={{ bottom: 74, right: 64, color: "var(--cocoa)" }}>
          <Sparkle size={12} className="s3" />
        </span>
        <div className="relative">
          <div className="arrival-kicker">now arriving in</div>
          <h1 className="arrival-title halftone">{p.city.split(",")[0].toLowerCase()}</h1>
          <div className="mono text-[10px] uppercase tracking-[0.18em] mt-2" style={{ color: "var(--muted)" }}>
            exploring in a <span style={{ color: "var(--cocoa)" }}>{p.car.name.toLowerCase()}</span> · windows down
          </div>
        </div>
        <div className="relative mt-5 flex items-end gap-4">
          <div className="drive-in w-[120px] shrink-0">{p.car.svg()}</div>
          <div className="flex-1 pb-3">
            <div className="road-line" />
          </div>
        </div>
      </div>

      {/* map + landmarks | guide */}
      <div className="grid gap-4 min-w-0" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <span className="eyebrow">the streets, in 3d</span>
            <button className="btn-solid !py-1.5 !px-3" onClick={p.onDrive}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M12 3v6.5M4.2 16.5l5.6-3.2M19.8 16.5l-5.6-3.2" />
              </svg>
              take the wheel
            </button>
          </div>
          <div style={{ height: 340 }}>
            <Map3D center={p.coords} zoom={15.6} pitch={56} pins={p.pins} height="100%" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">worth the stop</span>
              <span className="mono text-[9px]" style={{ color: "var(--muted)" }}>
                tap one to pin it
              </span>
            </div>
            {p.loadingLandmarks ? (
              <div className="mono text-[11px] py-4 text-center" style={{ color: "var(--muted)" }}>
                walking ahead to scout real spots in {p.city}…
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {p.landmarks.map((l) => (
                  <div
                    key={l.name}
                    className={"landmark-card" + (p.visited.has(l.name) ? " visited" : "")}
                    onClick={() => p.onLandmarkClick(l)}
                  >
                    <div className="pin-dot">
                      {p.visited.has(l.name) ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--burgundy)" strokeWidth="2">
                          <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="serif text-[15px] font-semibold leading-tight">{l.name}</div>
                      <div className="body-serif text-[13.5px] leading-snug mt-0.5" style={{ color: "#4c4636" }}>
                        {l.fact}
                      </div>
                    </div>
                  </div>
                ))}
                {!p.landmarks.length && (
                  <div className="body-serif italic text-[14px]" style={{ color: "var(--muted)" }}>
                    no spots yet — ask the guide on the right for recommendations.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* viral right now */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow flex items-center gap-1.5">
                <Sparkle size={10} className="s2" /> viral right now
              </span>
              <span className="mono text-[9px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
                social buzz · verified on the map
              </span>
            </div>
            {p.viral.length ? (
              <div className="grid grid-cols-2 gap-2">
                {p.viral.map((v) => (
                  <div
                    key={v.name}
                    className={"viral-card" + (p.viralSeen.has(v.name) ? " seen" : "")}
                    onClick={() => p.onViralClick(v)}
                  >
                    <div className="viral-top">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {KIND_ICON[v.kind] || KIND_ICON.spot}
                      </svg>
                      <span className="mono text-[8px] uppercase tracking-[0.1em]" style={{ color: "var(--olive)" }}>
                        {v.kind}
                      </span>
                      {p.viralSeen.has(v.name) && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.6" className="ml-auto">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="serif text-[13.5px] font-bold leading-tight mt-1">{v.name}</div>
                    <div className="body-serif text-[12px] leading-snug mt-0.5" style={{ color: "#5c5443" }}>
                      {v.blurb}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="viral-card" style={{ gridColumn: "1 / -1", cursor: "default" }}>
                <div className="body-serif italic text-[13px]" style={{ color: "var(--muted)" }}>
                  scanning the feed for what's trending in {p.city.split(",")[0]}…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* guide column */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="panel p-3.5 flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="shrink-0" style={{ marginTop: 6 }}>
                <GuideAvatar city={p.city} size={58} />
              </div>
              <div>
                <div className="mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--cocoa)" }}>
                  ur local ai guide
                </div>
                <div className="guide-ground mt-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M12 2l7 3v6c0 5-3.5 8.5-7 11-3.5-2.5-7-6-7-11V5z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  sources: wikipedia · wikivoyage · openstreetmap
                </div>
                <div className="body-serif text-[12.5px] italic" style={{ color: "var(--muted)" }}>
                  remembers the whole chat · unlimited
                </div>
              </div>
            </div>
            <div ref={chatRef} className="scroll-thin flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 300, minHeight: 180 }}>
              {p.messages.map((m, i) => (
                <div key={i} className={m.who === "you" ? "msg-you" : "msg-guide"}>
                  {m.text}
                </div>
              ))}
              {p.asking && (
                <div className="msg-guide mono text-[10px] flex items-center gap-1.5">
                  <Sparkle size={9} className="s2" /> re-checking trusted sources…
                </div>
              )}
            </div>
            <form
              className="flex gap-1.5 mt-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                const v = chatQ.trim();
                if (v) {
                  p.onAsk(v);
                  setChatQ("");
                }
              }}
            >
              <input className="input-paper !text-[14px]" placeholder="ask anything…" value={chatQ} onChange={(e) => setChatQ(e.target.value)} />
              <button className="btn-solid !px-3" type="submit" disabled={p.asking} aria-label="send">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16M14 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </div>

          {/* star minigame */}
          <button className="star-btn mx-auto" onClick={p.onOpenQuiz}>
            <svg width="170" height="160" viewBox="0 0 100 95" fill="none">
              <path
                d="M50 2 L61 34 L95 35 L68 56 L78 90 L50 70 L22 90 L32 56 L5 35 L39 34 Z"
                fill="var(--cream-3)"
                stroke="var(--ink)"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span className="star-text">
              play {p.city.split(",")[0]} as a minigame — questions from ur guide
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
