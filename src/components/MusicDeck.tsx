import { useEffect, useRef, useState } from "react";
import type { Track, Lyrics, YtTrack } from "../lib/api";
import { Sparkle, SparkleRow } from "./bits";

interface Props {
  track: { name: string; artist: string; art: string } | null;
  isPlaying: boolean;
  isLoading: boolean;
  mode: "yt" | "preview" | null;
  progress: number;
  timeLabel: string;
  durLabel: string;
  lyrics: Lyrics | null;
  currentLine: number;
  queueLen: number;
  isFav: boolean;
  inPlaylist: boolean;
  playlistCount: number;
  suggestions: Track[];
  results: YtTrack[];
  currentYtId: string | null;
  onPlayFull: () => void;
  onAddPlaylist: () => void;
  onPickResult: (t: YtTrack) => void;
  onType: (q: string) => void;
  onSearch: (q: string) => void;
  onPick: (t: Track) => void;
  onToggle: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onSeekLine: (t: number) => void;
  onSeekRatio: (r: number) => void;
  onToggleFav: () => void;
  onOpenPlaylist: () => void;
}

export default function MusicDeck(p: Props) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (p.currentLine >= 0 && lineRefs.current[p.currentLine]) {
      lineRefs.current[p.currentLine]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [p.currentLine]);

  const showSugg = focused && q.trim().length > 1 && p.suggestions.length > 0;
  const hasSynced = !!p.lyrics?.synced.length;
  const hasPlain = !!p.lyrics?.plain;

  const seekClick = (e: React.MouseEvent) => {
    const el = progRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    p.onSeekRatio(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  return (
    <aside className="panel relative flex flex-col gap-3 p-4 reveal">
      {/* hidden full-length playback engine */}
      <div className="yt-hidden">
        <div id="yt-mount" />
      </div>

      {/* search + suggestions */}
      <div className="suggest-wrap">
        <div className="flex items-center justify-between">
          <span className="eyebrow">search song / playlist</span>
          <SparkleRow />
        </div>
        <form
          className="mt-1.5 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              p.onSearch(q.trim());
              setQ("");
              setFocused(false);
            }
          }}
        >
          <input
            className="input-paper"
            placeholder="any song or artist…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              p.onType(e.target.value);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 160)}
          />
          <button className="btn-solid !px-3" type="submit" aria-label="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>

        {showSugg && (
          <div className="suggest-list scroll-thin" style={{ maxHeight: 260, overflowY: "auto" }}>
            {p.suggestions.map((s) => (
              <div
                key={s.id}
                className="suggest-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  p.onPick(s);
                  setQ("");
                  setFocused(false);
                }}
              >
                <img src={s.art} alt="" />
                <div className="min-w-0 flex-1">
                  <div className="st truncate">{s.name}</div>
                  <div className="sa truncate">{s.artist}</div>
                </div>
                <Sparkle size={10} className="s2" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* turntable */}
      <div className="turntable">
        <div className={"vinyl" + (p.isPlaying ? " spinning" : "")}>
          <div
            className={"vinyl-label" + (p.track?.art ? "" : " empty")}
            style={p.track?.art ? { backgroundImage: `url(${p.track.art})` } : undefined}
          >
            {!p.track?.art && <span>side a</span>}
          </div>
        </div>
        <div className={"tonearm" + (p.isPlaying ? " on" : "")}>
          <svg viewBox="0 0 120 120">
            <circle cx="98" cy="17" r="13" fill="#cfc6b3" stroke="#17140f" strokeWidth="2" />
            <circle cx="98" cy="17" r="5" fill="#17140f" />
            <path d="M98 17 L46 88" stroke="#8d8471" strokeWidth="5" strokeLinecap="round" />
            <path d="M98 17 L46 88" stroke="#17140f" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="36" y="84" width="16" height="12" rx="2" fill="#17140f" transform="rotate(35 44 90)" />
          </svg>
        </div>
      </div>

      {/* top matches — pick the exact version */}
      {p.results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="eyebrow">top matches · pick yours</span>
            <span className="mono text-[9px]" style={{ color: "var(--muted)" }}>{p.results.length} versions</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {p.results.map((r, i) => (
              <div
                key={r.id}
                className={"result-item" + (p.currentYtId === r.id ? " active" : "")}
                onClick={() => p.onPickResult(r)}
              >
                <img src={r.art} alt="" />
                <div className="min-w-0 flex-1">
                  <div className="serif truncate text-[13px] font-semibold leading-tight">{r.title}</div>
                  <div className="mono truncate text-[8.5px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    {r.artist || "youtube"} · {r.duration ? `${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, "0")}` : "full"}
                  </div>
                </div>
                {p.currentYtId === r.id ? (
                  <Sparkle size={12} className="s2" />
                ) : (
                  <span className="mono text-[10px]" style={{ color: "var(--muted)" }}>{i + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* meta + source badge */}
      <div className="min-h-[54px]">
        {p.track ? (
          <>
            <div className="serif text-[17px] font-semibold leading-tight">{p.track.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="mono text-[10px] uppercase tracking-wider" style={{ color: "var(--olive)" }}>
                {p.track.artist}
              </span>
              <span className="source-badge" style={{ background: p.mode === "yt" ? "var(--green)" : "var(--brass)", color: "var(--cream)", borderColor: "var(--ink)" }}>
                {p.isLoading ? "tuning…" : p.mode === "yt" ? "full track" : "30s preview"}
              </span>
            </div>
          </>
        ) : (
          <div className="body-serif italic" style={{ color: "var(--muted)" }}>
            Nothing on the platter yet — type anything above and the whole song plays.
          </div>
        )}
      </div>

      {/* progress */}
      <div>
        <div className="prog" ref={progRef} onClick={seekClick}>
          <div className="prog-fill" style={{ width: `${Math.round(p.progress * 100)}%` }} />
        </div>
        <div className="mono flex justify-between text-[9px] mt-1" style={{ color: "var(--muted)" }}>
          <span>{p.timeLabel}</span>
          <span>{p.durLabel}</span>
        </div>
      </div>

      {/* lyrics */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="eyebrow">lyrics</span>
          {hasSynced && (
            <span className="mono text-[9px] flex items-center gap-1" style={{ color: "var(--green)" }}>
              <Sparkle size={9} /> synced
            </span>
          )}
        </div>
        <div className="lyrics-box scroll-thin rounded-md border border-[var(--line)] bg-[var(--cream-2)] px-3 py-2">
          {p.track ? (
            hasSynced ? (
              p.lyrics!.synced.map((l, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={"lyric-line" + (i === p.currentLine ? " current" : i < p.currentLine ? " past" : "")}
                  onClick={() => p.onSeekLine(l.time)}
                >
                  {l.text}
                </div>
              ))
            ) : hasPlain ? (
              <div className="body-serif text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "#6f6754" }}>
                {p.lyrics!.plain}
              </div>
            ) : (
              <div className="body-serif italic text-[14px] pt-6 text-center" style={{ color: "var(--muted)" }}>
                no lyrics found for this one —<br />roll the windows down anyway.
              </div>
            )
          ) : (
            <div className="body-serif italic text-[14px] pt-6 text-center" style={{ color: "var(--muted)" }}>
              lyrics land here, line by line,<br />highlighted as they're sung.
            </div>
          )}
        </div>
      </div>

      {/* transport */}
      <div className="flex items-center justify-center gap-4 py-1">
        <button className="transport-btn" onClick={p.onShuffle} disabled={p.queueLen < 2} title="shuffle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>
        <button className="transport-btn main" onClick={p.onToggle} disabled={!p.track} title="play / pause">
          {p.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          )}
        </button>
        <button className="transport-btn" onClick={p.onNext} disabled={p.queueLen < 2} title="next">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 4l10 8-10 8zM19 5v14" />
          </svg>
        </button>
      </div>

      {/* the four options */}
      <div className="grid grid-cols-2 gap-2">
        <button className="deck-action" onClick={p.onPlayFull} disabled={!p.track} title="play the full track from youtube">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="9" />
            <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
          </svg>
          <span>{p.mode === "yt" && p.isPlaying ? "full track on" : "full track"}</span>
        </button>
        <a
          className="deck-action"
          href={`https://open.spotify.com/search/${encodeURIComponent(p.track ? p.track.name + " " + p.track.artist : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          title="open in spotify"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M7.5 9.5c3-.8 6.5-.4 9 1.2M8 12.5c2.4-.6 5-.3 7 1M8.6 15.3c1.8-.4 3.6-.2 5 .7" />
          </svg>
          <span>spotify</span>
        </a>
        <button
          className={"deck-action" + (p.isFav ? " on" : "")}
          onClick={p.onToggleFav}
          disabled={!p.track}
          title="add to favourites"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={p.isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 21s-7.5-4.7-9.7-9C.8 8.6 2.6 5 6.2 5c2 0 3.3 1 4 2.1.8-1.1 2-2.1 4-2.1 3.6 0 5.4 3.6 3.9 7-2.2 4.3-9.7 9-9.7 9z" />
          </svg>
          <span>{p.isFav ? "favourited" : "favourite"}</span>
        </button>
        <button
          className={"deck-action" + (p.inPlaylist ? " on" : "")}
          onClick={p.onAddPlaylist}
          disabled={!p.track}
          title="add to your travibe playlist"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M4 6h12M4 12h12M4 18h7" />
            <path d="M18 15v6M15 18h6" />
          </svg>
          <span>{p.inPlaylist ? "in playlist" : "+ playlist"}</span>
        </button>
      </div>

      <button className="icon-btn justify-center !py-2.5" onClick={p.onOpenPlaylist}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
          <path d="M4 6h16M4 12h16M4 18h10" />
          <circle cx="19" cy="18" r="2.4" fill="currentColor" stroke="none" />
        </svg>
        open the travibe playlist · {p.playlistCount}
      </button>
    </aside>
  );
}
