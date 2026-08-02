import { useEffect, useMemo, useRef, useState } from "react";
import MusicDeck from "./components/MusicDeck";
import WorldView from "./components/WorldView";
import PlaceView, { ChatMsg } from "./components/PlaceView";
import Quiz from "./components/Quiz";
import DriveMode from "./components/DriveMode";
import { Sparkle } from "./components/bits";
import { carTypes, CarType } from "./lib/cars";
import {
  Track,
  Lyrics,
  YtTrack,
  Landmark,
  ChatTurn,
  searchMusic,
  searchYouTube,
  cleanTitle,
  fetchLyrics,
  geocode,
  wikiSummary,
  wikivoyageSummary,
  fetchLandmarks,
  askGuide,
  fetchViral,
  ViralSpot,
} from "./lib/api";

const W = window as any;
const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function App() {
  /* ---------------- navigation history ---------------------------- */
  const [hist, setHist] = useState<string[]>(["world"]);
  const [pos, setPos] = useState(0);
  const view = hist[pos];
  const go = (id: string) => {
    const next = hist.slice(0, pos + 1);
    next.push(id);
    setHist(next);
    setPos(next.length - 1);
  };
  const prev = () => pos > 0 && setPos(pos - 1);
  const next = () => pos < hist.length - 1 && setPos(pos + 1);

  /* ---------------- toast ----------------------------------------- */
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<number | undefined>(undefined);
  const say = (m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2800);
  };

  /* ================= MUSIC ENGINE (full songs via YouTube) ======== */
  const playerRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [queue, setQueue] = useState<YtTrack[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [mode, setMode] = useState<"yt" | "preview" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [currentLine, setCurrentLine] = useState(-1);
  const [now, setNow] = useState<{ name: string; artist: string; art: string } | null>(null);
  const [results, setResults] = useState<YtTrack[]>([]);
  const [currentYtId, setCurrentYtId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof Audio !== "undefined") audioRef.current = new Audio();
  const audio = audioRef.current!;

  const trackIdRef = useRef(0);
  const qIndexRef = useRef(0);
  const queueRef = useRef<YtTrack[]>([]);
  qIndexRef.current = qIndex;
  queueRef.current = queue;

  /* load the YouTube IFrame API once */
  useEffect(() => {
    if (W.YT?.Player) {
      setYtReady(true);
      return;
    }
    const old = W.onYouTubeIframeAPIReady;
    W.onYouTubeIframeAPIReady = () => {
      old?.();
      setYtReady(true);
    };
    if (!document.querySelector('script[src*="iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  }, []);

  /* instantiate the hidden player the moment the API is ready —
     regardless of whether a song is queued yet — so later loadVideoById
     calls always have a live player to talk to. */
  useEffect(() => {
    if (!ytReady || !pendingId || playerRef.current) return;
    if (!document.getElementById("yt-mount")) return;
    playerRef.current = new W.YT.Player("yt-mount", {
      videoId: pendingId,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e: any) => {
          try {
            e.target.playVideo();
          } catch {}
        },
        onStateChange: (e: any) => {
          if (e.data === 1) setIsPlaying(true);
          if (e.data === 2) setIsPlaying(false);
          if (e.data === 0) {
            if (queueRef.current.length > 1) {
              setQIndex((qIndexRef.current + 1) % queueRef.current.length);
            } else if (upNextRef.current.length) {
              const q = upNextRef.current.shift()!;
              searchAndPlay(q);
            }
          }
        },
        onError: () => {
          // this video can't be embedded — quietly roll to the next match
          if (queueRef.current.length > 1) {
            setQIndex((qIndexRef.current + 1) % queueRef.current.length);
          } else {
            setToast("that video blocks embedding — pick another match from the list");
          }
        },
      },
    });
    setPendingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytReady, pendingId]);

  /* poll time for progress + synced lyrics */
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (mode === "yt" && playerRef.current?.getCurrentTime) {
        try {
          setTime(playerRef.current.getCurrentTime() || 0);
          setDur(playerRef.current.getDuration() || 0);
        } catch {}
      } else if (mode === "preview") {
        setTime(audio.currentTime || 0);
        setDur(audio.duration || 0);
      }
    }, 350);
    return () => window.clearInterval(iv);
  }, [mode, audio]);

  useEffect(() => {
    const lines = lyrics?.synced;
    if (!lines?.length) {
      setCurrentLine(-1);
      return;
    }
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= time + 0.2) idx = i;
      else break;
    }
    setCurrentLine(idx);
  }, [time, lyrics]);

  const loadLyrics = (name: string, artist: string) => {
    const myId = ++trackIdRef.current;
    setLyrics(null);
    setCurrentLine(-1);
    fetchLyrics(name, artist).then((l) => {
      if (trackIdRef.current === myId) setLyrics(l);
    });
  };

  const loadYt = (id: string) => {
    if (playerRef.current?.loadVideoById) {
      try {
        playerRef.current.loadVideoById(id);
        return;
      } catch {}
    }
    setPendingId(id); // effect will create the player with this video
  };

  /* when queue index changes (next/shuffle/ended) */
  useEffect(() => {
    const t = queueRef.current[qIndex];
    if (!t || mode !== "yt") return;
    loadYt(t.id);
    setCurrentYtId(t.id);
    const ct = cleanTitle(t.title);
    setNow({ name: ct.title, artist: ct.artist || t.artist.replace(/ - Topic$/i, ""), art: t.art });
    loadLyrics(ct.title, ct.artist || t.artist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  const searchAndPlay = async (q: string) => {
    setIsLoading(true);
    audio.pause();
    try {
      playerRef.current?.pauseVideo?.();
    } catch {}
    const [yt, it] = await Promise.all([searchYouTube(q), searchMusic(q).catch(() => [] as Track[])]);
    setIsLoading(false);

    if (yt.length) {
      setMode("yt");
      setQueue(yt);
      setResults(yt.slice(0, 4));
      setCurrentYtId(yt[0].id);
      setQIndex(0);
      const t = yt[0];
      const ct = cleanTitle(t.title);
      const meta = it[0];
      setNow({ name: meta?.name || ct.title, artist: meta?.artist || ct.artist || t.artist, art: meta?.art || t.art });
      loadYt(t.id);
      loadLyrics(meta?.name || ct.title, meta?.artist || ct.artist || t.artist);
      say(`now spinning: ${meta?.name || ct.title} — 3 more versions below`);
    } else if (it.length) {
      setMode("preview");
      setQueue([]);
      audio.src = it[0].preview;
      audio.play().catch(() => setIsPlaying(false));
      setNow({ name: it[0].name, artist: it[0].artist, art: it[0].art });
      loadLyrics(it[0].name, it[0].artist);
      say(`preview mode: ${it[0].name}`);
    } else {
      say(`nothing found for “${q}”`);
    }
  };

  /* preview-mode audio events */
  useEffect(() => {
    if (mode !== "preview") return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => {
      if (upNextRef.current.length) searchAndPlay(upNextRef.current.shift()!);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, audio]);

  const toggle = () => {
    if (!now) return;
    if (mode === "yt" && playerRef.current) {
      isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    } else if (mode === "preview") {
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
    }
  };
  const nextTrack = () => queue.length > 1 && setQIndex((qIndex + 1) % queue.length);
  const shuffle = () => {
    if (queue.length < 2) return;
    let n = qIndex;
    while (n === qIndex) n = Math.floor(Math.random() * queue.length);
    setQIndex(n);
  };
  const seekLine = (t: number) => {
    if (mode === "yt" && playerRef.current?.seekTo) playerRef.current.seekTo(t, true);
    else if (mode === "preview") {
      audio.currentTime = t;
      audio.play().catch(() => {});
    }
  };
  const seekRatio = (r: number) => seekLine(r * (dur || 0));

  const pickResult = (t: YtTrack) => {
    const idx = queue.findIndex((x) => x.id === t.id);
    setMode("yt");
    setCurrentYtId(t.id);
    if (idx >= 0 && idx !== qIndex) {
      setQIndex(idx); // effect loads it
    } else {
      const ct = cleanTitle(t.title);
      setNow({ name: ct.title, artist: ct.artist || t.artist, art: t.art });
      loadYt(t.id);
      loadLyrics(ct.title, ct.artist || t.artist);
    }
    say(`switched to: ${cleanTitle(t.title).title}`);
  };

  /* ---------------- suggestions ----------------------------------- */
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const suggT = useRef<number | undefined>(undefined);
  const onType = (q: string) => {
    window.clearTimeout(suggT.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggT.current = window.setTimeout(async () => {
      try {
        setSuggestions(await searchMusic(q));
      } catch {
        setSuggestions([]);
      }
    }, 280);
  };

  /* ---------------- favourites ------------------------------------ */
  interface Fav {
    name: string;
    artist: string;
    art: string;
    query: string;
  }
  const [favs, setFavs] = useState<Fav[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("travibe-favs") || "[]");
    } catch {
      return [];
    }
  });
  const [drawer, setDrawer] = useState(false);
  const isFav = !!now && favs.some((f) => f.query === `${now.artist} ${now.name}`);
  const toggleFav = () => {
    if (!now) return;
    const query = `${now.artist} ${now.name}`;
    if (isFav) {
      setFavs(favs.filter((f) => f.query !== query));
      say("removed from your playlist");
    } else {
      setFavs([{ name: now.name, artist: now.artist, art: now.art, query }, ...favs]);
      say("saved to your travibe playlist");
    }
  };
  useEffect(() => {
    localStorage.setItem("travibe-favs", JSON.stringify(favs));
  }, [favs]);

  /* playlist — an ordered list you build, separate from favourites */
  const [playlist, setPlaylist] = useState<Fav[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("travibe-playlist") || "[]");
    } catch {
      return [];
    }
  });
  const [drawerTab, setDrawerTab] = useState<"playlist" | "favs">("playlist");
  const inPlaylist = !!now && playlist.some((f) => f.query === `${now.artist} ${now.name}`);
  const addToPlaylist = () => {
    if (!now) return;
    const query = `${now.artist} ${now.name}`;
    if (inPlaylist) {
      say("already in your travibe playlist");
      return;
    }
    setPlaylist([...playlist, { name: now.name, artist: now.artist, art: now.art, query }]);
    say("added to your travibe playlist");
  };
  useEffect(() => {
    localStorage.setItem("travibe-playlist", JSON.stringify(playlist));
  }, [playlist]);

  /* up-next chain: "play all" queues songs that auto-start when one ends */
  const upNextRef = useRef<string[]>([]);
  const playAll = (items: Fav[]) => {
    if (!items.length) return;
    upNextRef.current = items.slice(1).map((f) => f.query);
    searchAndPlay(items[0].query);
    setDrawer(false);
    if (items.length > 1) say(`playing ${items[0].name} · ${items.length - 1} more queued`);
  };
  const playFull = () => {
    if (!now) return;
    if (mode === "yt" && isPlaying) {
      say("already spinning the full track");
      return;
    }
    searchAndPlay(`${now.artist} ${now.name}`);
  };

  /* ---------------- travel ---------------------------------------- */
  const [destination, setDestination] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gate, setGate] = useState("A" + (1 + Math.floor(Math.random() * 9)));
  const [searching, setSearching] = useState(false);
  const [car, setCar] = useState<CarType>(carTypes[0]);

  const worldPins = useMemo(
    () => (coords && destination ? [{ id: "dest", lat: coords.lat, lon: coords.lon, label: destination }] : []),
    [coords, destination]
  );

  const searchPlace = async (q: string) => {
    setSearching(true);
    const g = await geocode(q);
    setSearching(false);
    if (!g) {
      say("couldn't find that place — try “city, country”");
      return;
    }
    setDestination(q);
    setCoords({ lat: g.lat, lon: g.lon });
    setGate("A" + (1 + Math.floor(Math.random() * 9)));
    say(`ticket stamped for ${q}`);
  };

  /* ---------------- place / guide --------------------------------- */
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loadingLandmarks, setLoadingLandmarks] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [placePins, setPlacePins] = useState<{ id: string; lat: number; lon: number; label: string; color?: string }[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [asking, setAsking] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [viral, setViral] = useState<ViralSpot[]>([]);
  const [viralSeen, setViralSeen] = useState<Set<string>>(new Set());
  const wikiRef = useRef("");
  const landmarksRef = useRef<Landmark[]>([]);
  landmarksRef.current = landmarks;
  const chatHistRef = useRef<ChatTurn[]>([]);
  const [driveOpen, setDriveOpen] = useState(false);

  const dive = async () => {
    if (!destination || !coords) return;
    go("place");
    setLandmarks([]);
    setVisited(new Set());
    setPlacePins([]);
    setViral([]);
    setViralSeen(new Set());
    chatHistRef.current = [];
    setMessages([{ who: "guide", text: `Hold on — walking ahead to scout what's real in ${destination}…` }]);
    setLoadingLandmarks(true);
    const [wiki, voy] = await Promise.all([wikiSummary(destination), wikivoyageSummary(destination)]);
    const context =
      (wiki ? `Wikipedia: ${wiki}\n` : "") +
      (voy ? `Official-style tourist guide (Wikivoyage): ${voy}` : "");
    wikiRef.current = context;
    const [lm, vz] = await Promise.all([fetchLandmarks(destination, context), fetchViral(destination, coords)]);
    setLoadingLandmarks(false);
    setLandmarks(lm);
    setViral(vz);
    const opener = (voy || wiki) ? (voy || wiki).split(". ")[0] + "." : "";
    setMessages([
      {
        who: "guide",
        text:
          (opener ? opener + " " : "") +
          (lm.length
            ? `The spots I actually send friends to: ${lm.map((l) => l.name).join(", ")}. Tap one to pin it, or ask me anything — activities, food, hidden corners.`
            : `Ask me anything about ${destination} — activities, food, hidden corners — and I'll give you real names, not postcards.`),
      },
    ]);
  };

  const ask = async (q: string) => {
    if (!destination) return;
    setMessages((m) => [...m, { who: "you", text: q }]);
    setAsking(true);
    const answer = await askGuide(destination, q, wikiRef.current, landmarksRef.current, chatHistRef.current);
    setAsking(false);
    chatHistRef.current = [...chatHistRef.current, { role: "user", content: q }, { role: "assistant", content: answer }];
    setMessages((m) => [...m, { who: "guide", text: answer }]);
  };

  const viralClick = async (v: ViralSpot) => {
    setViralSeen((s) => new Set(s).add(v.name));
    let lat = v.lat;
    let lon = v.lon;
    if (lat == null && destination) {
      const g = await geocode(`${v.name}, ${destination}`);
      if (g) {
        lat = g.lat;
        lon = g.lon;
      }
    }
    if (lat != null && lon != null) {
      setPlacePins((p) => [...p.filter((x) => x.id !== v.name), { id: v.name, lat, lon, label: v.name, color: "#a9823c" }]);
    }
    setMessages((m) => [...m, { who: "guide", text: `Ah, ${v.name} — that's the one all over your feed. ${v.blurb} ${lat != null ? "Pinned it on your map; it's worth the queue." : ""}` }]);
  };

  const landmarkClick = async (l: Landmark) => {
    setVisited((v) => new Set(v).add(l.name));
    setMessages((m) => [...m, { who: "guide", text: `${l.name} — ${l.fact}` }]);
    if (destination) {
      const g = await geocode(`${l.name}, ${destination}`);
      if (g) {
        setPlacePins((p) => [
          ...p.filter((x) => x.id !== l.name),
          { id: l.name, lat: g.lat, lon: g.lon, label: l.name, color: "#3f7d52" },
        ]);
      }
    }
  };

  /* ---------------- render ---------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex items-center justify-between px-5 py-2.5"
        style={{ borderBottom: "1.5px solid var(--ink)", background: "var(--cream)" }}
      >
        <button className="flex items-end gap-2" onClick={() => go("world")}>
          <span className="script text-[26px] leading-none" style={{ color: "var(--cocoa)" }}>
            Travibe
          </span>
          <Sparkle size={11} className="mb-1" />
        </button>
        <nav className="flex items-center gap-2">
          <button className="icon-btn" onClick={prev} disabled={pos <= 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            previous
          </button>
          <button className="icon-btn" onClick={() => location.reload()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12a8 8 0 1 1 2.6 5.9M4 12V6M4 12h6" />
            </svg>
            refresh
          </button>
          <button className="icon-btn" onClick={next} disabled={pos >= hist.length - 1}>
            next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="w-full shrink-0 lg:w-[302px]">
          <MusicDeck
            track={now}
            isPlaying={isPlaying}
            isLoading={isLoading}
            mode={mode}
            progress={dur ? time / dur : 0}
            timeLabel={fmt(time)}
            durLabel={fmt(dur)}
            lyrics={lyrics}
            currentLine={currentLine}
            queueLen={queue.length}
            isFav={isFav}
            inPlaylist={inPlaylist}
            playlistCount={playlist.length}
            onPlayFull={playFull}
            onAddPlaylist={addToPlaylist}
            suggestions={suggestions}
            results={results}
            currentYtId={currentYtId}
            onPickResult={pickResult}
            onType={onType}
            onSearch={searchAndPlay}
            onPick={(t) => searchAndPlay(`${t.artist} ${t.name}`)}
            onToggle={toggle}
            onNext={nextTrack}
            onShuffle={shuffle}
            onSeekLine={seekLine}
            onSeekRatio={seekRatio}
            onToggleFav={toggleFav}
            onOpenPlaylist={() => setDrawer(true)}
          />
        </div>

        <main className="min-w-0 flex-1">
          {view === "world" ? (
            <WorldView
              destination={destination}
              gate={gate}
              coords={coords}
              pins={worldPins}
              selectedCar={car}
              onSelectCar={setCar}
              onSearchPlace={searchPlace}
              searching={searching}
              onDive={dive}
            />
          ) : (
            <PlaceView
              city={destination || "somewhere"}
              car={car}
              coords={coords}
              pins={placePins}
              landmarks={landmarks}
              loadingLandmarks={loadingLandmarks}
              visited={visited}
              onLandmarkClick={landmarkClick}
              viral={viral}
              viralSeen={viralSeen}
              onViralClick={viralClick}
              messages={messages}
              asking={asking}
              onAsk={ask}
              onDrive={() => setDriveOpen(true)}
              onOpenQuiz={() => {
                if (landmarks.length < 2) {
                  say("the guide needs a couple of spots before the minigame works");
                  return;
                }
                setQuizOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* library drawer: playlist + favourites */}
      <div className={"drawer-scrim" + (drawer ? " open" : "")} onClick={() => setDrawer(false)} />
      <div className={"drawer" + (drawer ? " open" : "")}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1.5px solid var(--ink)" }}>
          <span className="script text-[22px]" style={{ color: "var(--cocoa)" }}>
            your library
          </span>
          <button className="icon-btn" onClick={() => setDrawer(false)}>
            close
          </button>
        </div>
        <div className="flex gap-1.5 px-3 pt-3">
          {(
            [
              ["playlist", `playlist · ${playlist.length}`],
              ["favs", `favourites · ${favs.length}`],
            ] as ["playlist" | "favs", string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className="icon-btn flex-1 justify-center"
              style={drawerTab === k ? { background: "var(--ink)", color: "var(--cream)" } : undefined}
              onClick={() => setDrawerTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-3">
          {(drawerTab === "playlist" ? playlist : favs).length ? (
            <>
              {drawerTab === "playlist" && (
                <button className="btn-solid w-full mb-2.5" onClick={() => playAll(playlist)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                  play all · {playlist.length}
                </button>
              )}
              {(drawerTab === "playlist" ? playlist : favs).map((f, i) => (
                <div
                  key={f.query + i}
                  className="mb-2 flex cursor-pointer items-center gap-3 rounded-md border p-2 transition-all hover:translate-x-1"
                  style={{ borderColor: "var(--line)", background: "var(--cream-3)" }}
                  onClick={() => {
                    if (drawerTab === "playlist") playAll(playlist.slice(i));
                    else {
                      searchAndPlay(f.query);
                      setDrawer(false);
                    }
                  }}
                >
                  <img src={f.art} alt="" className="h-10 w-10 rounded object-cover" style={{ border: "1px solid var(--ink)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="serif truncate text-[14px] font-semibold">{f.name}</div>
                    <div className="mono truncate text-[9px] uppercase" style={{ color: "var(--muted)" }}>
                      {f.artist}
                    </div>
                  </div>
                  <button
                    className="icon-btn !px-2 !py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (drawerTab === "playlist") setPlaylist(playlist.filter((x) => x.query !== f.query));
                      else setFavs(favs.filter((x) => x.query !== f.query));
                    }}
                    aria-label="remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="body-serif px-2 pt-6 text-center italic" style={{ color: "var(--muted)" }}>
              {drawerTab === "playlist"
                ? "empty for now — hit “+ playlist” under a song to start building your road-trip queue."
                : "nothing saved yet — hit the heart on a song you love."}
            </div>
          )}
        </div>
      </div>

      <Quiz open={quizOpen} city={destination || ""} landmarks={landmarks} onClose={() => setQuizOpen(false)} />

      {driveOpen && coords && destination && (
        <DriveMode city={destination} center={coords} car={car} onExit={() => setDriveOpen(false)} />
      )}

      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
    </div>
  );
}
