/* ------------------------------------------------------------------ */
/*  Travibe data layer — every call is a real, keyless, CORS-open API  */
/* ------------------------------------------------------------------ */

export interface Track {
  id: number | string;
  name: string;
  artist: string;
  album: string;
  art: string;
  preview: string;
  link: string;
}

export interface YtTrack {
  id: string;
  title: string;
  artist: string;
  art: string;
  duration: number;
}

export interface LyricLine {
  time: number;
  text: string;
}
export interface Lyrics {
  synced: LyricLine[];
  plain: string;
}
export interface GeoPoint {
  lat: number;
  lon: number;
  display: string;
}
export interface Landmark {
  name: string;
  fact: string;
}

const enc = encodeURIComponent;

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

/* =================== 1. FULL-LENGTH PLAYBACK: YouTube ============= */
/* Search YouTube via public Piped / Invidious mirrors (no API key).  */

const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.private.coffee",
  "https://pipedapi.leptons.xyz",
];
const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.f5.si",
  "https://iv.melmac.space",
  "https://invidious.private.coffee",
  "https://yewtu.be",
  "https://inv.tux.pizza",
];

async function searchPiped(base: string, q: string): Promise<YtTrack[]> {
  const t = withTimeout(4000);
  const res = await fetch(`${base}/search?q=${enc(q)}&filter=music_songs`, { signal: t.signal });
  t.done();
  if (!res.ok) throw new Error("piped " + res.status);
  const j = await res.json();
  return (j.items || [])
    .filter((i: any) => (i.url || "").includes("watch?v="))
    .slice(0, 10)
    .map((i: any) => ({
      id: i.url.replace("/watch?v=", ""),
      title: i.title || "Unknown",
      artist: i.uploaderName || "",
      art: i.thumbnail || `https://i.ytimg.com/vi/${i.url.replace("/watch?v=", "")}/hqdefault.jpg`,
      duration: i.duration || 0,
    }));
}

async function searchInvidious(base: string, q: string): Promise<YtTrack[]> {
  const t = withTimeout(4000);
  const res = await fetch(`${base}/api/v1/search?q=${enc(q)}&type=video`, { signal: t.signal });
  t.done();
  if (!res.ok) throw new Error("invidious " + res.status);
  const j = await res.json();
  return (Array.isArray(j) ? j : [])
    .filter((i: any) => i.videoId)
    .slice(0, 10)
    .map((i: any) => ({
      id: i.videoId,
      title: i.title || "Unknown",
      artist: i.author || "",
      art: i.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg`,
      duration: i.lengthSeconds || 0,
    }));
}

/* Direct YouTube search scrape via a CORS relay — the most reliable
   keyless route when mirror APIs are down or blocked. */
async function searchYouTubeScrape(q: string): Promise<YtTrack[]> {
  const t = withTimeout(7000);
  const res = await fetch(
    "https://api.allorigins.win/raw?url=" +
      encodeURIComponent("https://www.youtube.com/results?search_query=" + enc(q)),
    { signal: t.signal }
  );
  t.done();
  if (!res.ok) throw new Error("relay " + res.status);
  const html = await res.text();
  const seen = new Set<string>();
  const out: YtTrack[] = [];
  const re = /"videoId":"([\w-]{11})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < 10) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const tail = html.slice(m.index, m.index + 900);
    const tm = tail.match(/"text":"([^"]{3,90})"/);
    out.push({
      id,
      title: tm ? tm[1] : q,
      artist: "",
      art: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: 0,
    });
  }
  if (!out.length) throw new Error("no ids");
  return out;
}

export async function searchYouTube(q: string): Promise<YtTrack[]> {
  // fire every route at once; resolve the instant any returns results
  const attempts: Promise<YtTrack[]>[] = [
    searchYouTubeScrape(q),
    ...PIPED.map((b) => searchPiped(b, q)),
    ...INVIDIOUS.map((b) => searchInvidious(b, q)),
  ].map((p) => p.catch(() => [] as YtTrack[]));

  return await new Promise<YtTrack[]>((resolve) => {
    let pending = attempts.length;
    let settled = false;
    const finish = (r: YtTrack[]) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    attempts.forEach((p) =>
      p.then((r) => {
        if (r.length) return finish(r);
        if (--pending === 0) finish([]);
      })
    );
    setTimeout(() => finish([]), 8000); // hard deadline
  });
}

/* =================== 2. METADATA + SUGGESTIONS: iTunes ============ */

function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cb = "__travibe_cb_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    const cleanup = () => {
      delete (window as any)[cb];
      s.remove();
    };
    (window as any)[cb] = (data: any) => {
      resolve(data);
      cleanup();
    };
    s.onerror = () => {
      cleanup();
      reject(new Error("jsonp failed"));
    };
    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    document.head.appendChild(s);
  });
}

export async function searchMusic(query: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${enc(query)}&media=music&entity=song&limit=12`;
  let data: any;
  try {
    const t = withTimeout(5000);
    const res = await fetch(url, { signal: t.signal });
    t.done();
    if (!res.ok) throw new Error("itunes " + res.status);
    data = await res.json();
  } catch {
    data = await jsonp(url);
  }
  return (data.results || [])
    .filter((r: any) => r.previewUrl)
    .map((r: any) => ({
      id: r.trackId ?? Math.random(),
      name: r.trackName || "Unknown track",
      artist: r.artistName || "Unknown artist",
      album: r.collectionName || "",
      art: (r.artworkUrl100 || "").replace("100x100", "600x600"),
      preview: r.previewUrl,
      link: r.trackViewUrl || "",
    }));
}

/* Clean messy YouTube titles so lyrics search matches better */
export function cleanTitle(t: string): { title: string; artist: string } {
  let s = t
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\b(official|lyric|lyrics|video|audio|music|hd|4k|hq|remastered|visualizer|clip)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  let artist = "";
  if (s.includes(" - ")) {
    const parts = s.split(" - ");
    artist = parts[0].trim();
    s = parts.slice(1).join(" - ").trim();
  }
  return { title: s || t, artist };
}

/* =================== 3. LYRICS: LRCLIB ============================ */

function parseLRC(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  const re = /\[(\d+):(\d+(?:\.\d+)?)\]([^\[]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lrc)) !== null) {
    const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
    const text = m[3].trim();
    if (text) out.push({ time, text });
  }
  return out.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(track: string, artist: string): Promise<Lyrics> {
  const empty: Lyrics = { synced: [], plain: "" };
  const { title } = cleanTitle(track);
  const artistClean = artist.replace(/\s*-\s*Topic$/i, "").trim();
  try {
    const byName = await fetch(
      `https://lrclib.net/api/get?artist_name=${enc(artistClean)}&track_name=${enc(title)}`
    );
    if (byName.ok) {
      const d = await byName.json();
      if (d && (d.syncedLyrics || d.plainLyrics)) {
        return { synced: d.syncedLyrics ? parseLRC(d.syncedLyrics) : [], plain: d.plainLyrics || "" };
      }
    }
    const search = await fetch(`https://lrclib.net/api/search?q=${enc(title + " " + artistClean)}&limit=5`);
    if (search.ok) {
      const arr = await search.json();
      const hit = Array.isArray(arr) && arr.find((x: any) => x.syncedLyrics);
      if (hit) return { synced: parseLRC(hit.syncedLyrics), plain: hit.plainLyrics || "" };
      const plainHit = Array.isArray(arr) && arr.find((x: any) => x.plainLyrics);
      if (plainHit) return { synced: [], plain: plainHit.plainLyrics };
    }
  } catch {
    /* offline */
  }
  return empty;
}

/* =================== 4. GEO: Nominatim ============================ */

export interface ReverseHit {
  name: string;
  detail: string;
  kind: string;
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseHit | null> {
  try {
    const t = withTimeout(6000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { signal: t.signal }
    );
    t.done();
    if (!res.ok) return null;
    const j = await res.json();
    if (!j) return null;
    const a = j.address || {};
    const name =
      j.name || a.amenity || a.shop || a.tourism || a.leisure || a.building || a.road || a.neighbourhood || "";
    const detail = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village]
      .filter(Boolean)
      .join(", ");
    return { name: name || "a quiet corner", detail: detail || j.display_name || "", kind: j.type || j.category || "place" };
  } catch {
    return null;
  }
}

export async function geocode(query: string): Promise<GeoPoint | null> {
  try {
    const t = withTimeout(6000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${enc(query)}`,
      { signal: t.signal }
    );
    t.done();
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr[0]) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), display: arr[0].display_name };
  } catch {
    return null;
  }
}

/* Wikivoyage — the community-run tourist guide (trusted travel source) */
export async function wikivoyageSummary(place: string): Promise<string> {
  try {
    const clean = place.split(",")[0].trim();
    const t1 = withTimeout(5000);
    const s = await fetch(
      `https://en.wikivoyage.org/w/api.php?action=query&list=search&srsearch=${enc(clean)}&format=json&origin=*&srlimit=1`,
      { signal: t1.signal }
    );
    t1.done();
    const sj = await s.json();
    const title = sj?.query?.search?.[0]?.title;
    if (!title) return "";
    const t2 = withTimeout(5000);
    const e = await fetch(
      `https://en.wikivoyage.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&titles=${enc(title)}`,
      { signal: t2.signal }
    );
    t2.done();
    const ej = await e.json();
    const pages: any = ej?.query?.pages || {};
    const first: any = Object.values(pages)[0] || {};
    return String(first.extract || "").slice(0, 900);
  } catch {
    return "";
  }
}

/* =================== 5. GROUNDING: Wikipedia ====================== */

export async function wikiSummary(place: string): Promise<string> {
  try {
    const clean = place.split(",")[0].trim();
    const t1 = withTimeout(5000);
    const s = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc(clean)}&format=json&origin=*&srlimit=1`,
      { signal: t1.signal }
    );
    t1.done();
    const sj = await s.json();
    const title = sj?.query?.search?.[0]?.title;
    if (!title) return "";
    const t2 = withTimeout(5000);
    const e = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&titles=${enc(title)}`,
      { signal: t2.signal }
    );
    t2.done();
    const ej = await e.json();
    const pages: any = ej?.query?.pages || {};
    const first: any = Object.values(pages)[0] || {};
    return String(first.extract || "").slice(0, 1400);
  } catch {
    return "";
  }
}

/* =================== 6. AI GUIDE (grounded) ======================= */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

async function tryGet(url: string, ms = 9000): Promise<string> {
  const t = withTimeout(ms);
  const res = await fetch(url, { signal: t.signal });
  t.done();
  if (!res.ok) throw new Error("http " + res.status);
  const txt = (await res.text()).trim();
  if (txt.length < 3) throw new Error("empty");
  return txt;
}

async function callAI(prompt: string, system: string, history: ChatTurn[] = []): Promise<string> {
  // compress recent turns so even stateless GET keeps the thread;
  // include past answers explicitly so the model never repeats them
  const recap = history
    .slice(-8)
    .map((h) => `${h.role === "user" ? "TRAVELER ASKED" : "YOU ALREADY ANSWERED"}: ${h.content.slice(0, 220)}`)
    .join("\n");
  const fullPrompt =
    (recap ? `Conversation so far (never restate or re-ask any of this):\n${recap}\n\n` : "") + prompt;

  // 1) POST with real history
  try {
    const t = withTimeout(12000);
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: t.signal,
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "system", content: system }, ...history.slice(-14), { role: "user", content: prompt }],
      }),
    });
    t.done();
    if (res.ok) {
      const j = await res.json();
      const txt = j?.choices?.[0]?.message?.content?.trim();
      if (txt) return txt;
    }
  } catch {
    /* fall through */
  }

  // 2) GET across models, two passes
  for (const model of ["openai", "mistral", "llama"]) {
    try {
      return await tryGet(
        `https://text.pollinations.ai/${enc(system + "\n\n" + fullPrompt)}?model=${model}`
      );
    } catch {
      /* next model */
    }
  }
  // 3) one patient retry on the default route
  return await tryGet("https://text.pollinations.ai/" + enc(system + "\n\n" + fullPrompt), 14000);
}

/* Humanlike answer composed from trusted data — used only if every AI route is down */
function composeFallback(city: string, q: string, wiki: string, spots: Landmark[], history: ChatTurn[]): string {
  const low = q.toLowerCase();
  const names = spots.map((s) => s.name);
  const pick = (i: number) => spots[i % Math.max(1, spots.length)];
  const wikiBit = wiki ? wiki.split(". ")[0] + "." : "";

  if (/(food|eat|dish|restaurant|cuisin|dinner|lunch|breakfast)/.test(low)) {
    const s = pick(1);
    return spots.length
      ? `Honestly, skip the hotel restaurants. Head to ${s.name} — ${s.fact} That's where I'd take you tonight.`
      : `For food here, locals eat late and generously. ${wikiBit} Ask me again in a second and I'll name exact tables.`;
  }
  if (/(hidden|secret|local|off the beaten|underrated)/.test(low)) {
    const s = pick(3);
    return spots.length
      ? `Okay, the one I don't advertise: ${s.name}. ${s.fact} Go before it gets famous.`
      : `My hidden list is still loading from the map data — give me a beat, then ask again.`;
  }
  if (/(when|best time|weather|month|season)/.test(low)) {
    const clim = wiki.split(". ").find((s) => /climat|weather|summer|winter|season|temperature/i.test(s));
    return (clim ? clim + "." : `${city} rewards early mornings and late evenings.`) + " Come with comfortable shoes and an empty stomach.";
  }
  if (/(do|activit|thing|visit|see|trip|plan)/.test(low)) {
    if (!spots.length) return wikiBit || `${city} is one of those places you feel more than tour.`;
    return `Here's the real itinerary: start at ${names[0]}, then ${names[1] || names[0]}, and finish the day at ${names[2] || names[0]}. ${pick(0).fact}`;
  }
  if (/(where|which one|the one you|that place)/.test(low) && history.length) {
    const last = [...history].reverse().find((h) => h.role === "assistant");
    const mentioned = last && spots.find((s) => last.content.includes(s.name));
    if (mentioned) return `${mentioned.name}? ${mentioned.fact} You can't miss it — and I'd go around golden hour.`;
  }
  if (/(hello|hi|hey|salam|thanks|thank)/.test(low)) {
    return `Always a pleasure. I know ${city} street by street — ask me about food, hidden corners, or what to do tonight.`;
  }
  return (
    (wikiBit ? wikiBit + " " : "") +
    (spots.length
      ? `If I were you, I'd start at ${names[0]} — ${pick(0).fact} Want food, hidden gems, or the best time to go?`
      : `Ask me about food, activities or hidden corners and I'll name real places.`)
  );
}

const GUIDE_SYSTEM = `You are a real local tour guide who has lived their whole life in the city you are guiding.
HARD RULES:
- Name SPECIFIC real places, streets, dishes, events with their actual names. Never say "the main square", "the old town", "this wonderful place" or any vague phrase.
- Only use facts from the VERIFIED CONTEXT below or things you are certain are true and famous about this exact city.
- If you are not sure about something, say so honestly instead of inventing.
- 3-6 sentences, warm, concrete, packed with named details. No preamble like "Welcome" or "Great question".
- CRITICAL: read "YOU ALREADY ANSWERED" lines in the conversation. NEVER repeat a place, fact, or sentence you already gave. Every reply must bring NEW names and NEW details. If asked a follow-up like "where?" or "and food?", answer it directly using earlier context — do not restart the conversation.`;

export async function fetchLandmarks(city: string, wiki: string): Promise<Landmark[]> {
  const fb = fallbackLandmarks(city);
  try {
    const raw = await callAI(
      `VERIFIED CONTEXT about ${city}:\n${wiki || "(none)"}\n\nReturn ONLY a raw JSON array, no markdown, of exactly 5 real famous landmarks or experiences in ${city}. Each: {"name": string, "fact": string} where fact is one specific true sentence a local would tell you (a detail, a time to go, a food nearby). Real places only.`,
      "You output strict valid JSON only."
    );
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no json");
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length < 3) throw new Error("bad shape");
    return arr
      .filter((l: any) => l && l.name && l.fact)
      .slice(0, 6)
      .map((l: any) => ({ name: String(l.name), fact: String(l.fact) }));
  } catch {
    return fb;
  }
}

export async function askGuide(
  city: string,
  question: string,
  wiki: string,
  spots: Landmark[],
  history: ChatTurn[] = []
): Promise<string> {
  const known = spots.length ? spots.map((s) => `• ${s.name}: ${s.fact}`).join("\n") : "(none yet)";
  const sys =
    GUIDE_SYSTEM +
    `\nYou are in an ongoing conversation with this traveler about ${city}. Remember what was already asked and answered — never repeat yourself, and use prior context to resolve vague follow-ups like "where?" or "and food?".`;
  try {
    return await callAI(
      `VERIFIED CONTEXT about ${city}:\n${wiki ? wiki + "\n" : ""}Confirmed local spots:\n${known}\n\nTraveler asks: ${question}`,
      sys,
      history
    );
  } catch {
    // every AI route is down — answer like a human from trusted data instead
    return composeFallback(city, question, wiki, spots, history);
  }
}

/* =================== 6b. VIRAL / SOCIAL BUZZ SPOTS ================ */
export interface ViralSpot {
  name: string;
  blurb: string;
  kind: "cafe" | "park" | "photo" | "food" | "spot";
  lat?: number;
  lon?: number;
}

async function overpassParks(lat: number, lon: number): Promise<ViralSpot[]> {
  try {
    const q = `[out:json][timeout:8];(nwr["tourism"="theme_park"](around:14000,${lat},${lon});nwr["tourism"="zoo"](around:14000,${lat},${lon});nwr["leisure"="water_park"](around:14000,${lat},${lon}););out center 6;`;
    const t = withTimeout(9000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + enc(q),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: t.signal,
    });
    t.done();
    if (!res.ok) return [];
    const j = await res.json();
    return (j.elements || [])
      .filter((e: any) => e.tags?.name)
      .slice(0, 4)
      .map((e: any) => ({
        name: e.tags.name,
        blurb: e.tags["tourism"] === "zoo" ? "the city's zoo — real on the map" : "a real amusement spot, straight off OpenStreetMap",
        kind: "park" as const,
        lat: e.lat ?? e.center?.lat,
        lon: e.lon ?? e.center?.lon,
      }));
  } catch {
    return [];
  }
}

export async function fetchViral(city: string, coords: { lat: number; lon: number } | null): Promise<ViralSpot[]> {
  let fromAI: ViralSpot[] = [];
  try {
    const raw = await callAI(
      `List 6 places in ${city} that are viral on TikTok / Instagram right now — aesthetic cafés, amusement parks, photo spots, street-food stalls. Return ONLY raw JSON array, each {"name","blurb","kind"} where kind is one of cafe|park|photo|food|spot. blurb = one punchy sentence on why it's all over feeds. Real places in ${city} only.`,
      "You output strict valid JSON only."
    );
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) {
      const arr = JSON.parse(m[0]);
      fromAI = (Array.isArray(arr) ? arr : [])
        .filter((x: any) => x?.name && x?.blurb)
        .slice(0, 6)
        .map((x: any) => ({
          name: String(x.name),
          blurb: String(x.blurb),
          kind: (["cafe", "park", "photo", "food", "spot"].includes(x.kind) ? x.kind : "spot") as ViralSpot["kind"],
        }));
    }
  } catch {
    /* ai route down — overpass alone still delivers */
  }

  // validate names against the real map; merge guaranteed-real parks
  const [geoResults, parks] = await Promise.all([
    Promise.all(
      fromAI.map(async (s) => {
        const g = await geocode(`${s.name}, ${city}`);
        return g ? { ...s, lat: g.lat, lon: g.lon } : null;
      })
    ),
    coords ? overpassParks(coords.lat, coords.lon) : Promise.resolve([] as ViralSpot[]),
  ]);

  const merged: ViralSpot[] = [];
  const seen = new Set<string>();
  for (const s of [...geoResults.filter(Boolean) as ViralSpot[], ...parks]) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
    if (merged.length >= 8) break;
  }
  return merged;
}

/* =================== 7. OFFLINE FIELD NOTES ======================= */

const FALLBACK_CITIES: Record<string, Landmark[]> = {
  "abu dhabi": [
    { name: "Sheikh Zayed Grand Mosque", fact: "Go at opening time — 82 white marble domes and the world's largest hand-knotted carpet are quietest before 10am." },
    { name: "Louvre Abu Dhabi", fact: "Sit under the 7,500-ton steel dome at noon; the 'rain of light' pattern is the whole point." },
    { name: "Corniche Beach", fact: "Eight kilometres of public beach with the skyline of Etihad Towers behind you — sunset paddle-boarding is a local ritual." },
    { name: "Qasr Al Watan", fact: "The presidential palace's Great Hall chandelier weighs as much as two elephants; the library room is the photo." },
    { name: "Jubail Souk", fact: "Skip the tourist fish market upstairs chaos — the date hall downstairs is where Emiratis actually shop." },
  ],
  doha: [
    { name: "Museum of Islamic Art", fact: "I.M. Pei stacked its limestone blocks on a man-made island so the desert light could do the talking." },
    { name: "Souq Waqif", fact: "Its mud-rendered alleys still smell of cardamom, oud and roasted nuts after sunset." },
    { name: "The Corniche", fact: "A seven-kilometre crescent where dhow boats bob in front of a skyline shaped like the future." },
    { name: "Katara Cultural Village", fact: "An amphitheatre of honeycomb stone blends Greek geometry with Qatari craft." },
    { name: "National Museum of Qatar", fact: "Its interlocking desert-rose discs were modelled on a crystal that forms in sand after rare rain." },
  ],
  paris: [
    { name: "Musée d'Orsay", fact: "A Beaux-Arts railway station became the world's greatest Impressionist collection — check the giant clock window." },
    { name: "Luxembourg Gardens", fact: "Locals still push little wooden sailboats across the octagonal basin with long poles, just like in 1612." },
    { name: "Sainte-Chapelle", fact: "Its 1,113 stained-glass panels turn afternoon sun into a wall of sapphire and ruby." },
    { name: "Canal Saint-Martin", fact: "Iron footbridges and lock gates make this the picnic spot Parisians guard like a secret." },
    { name: "Montmartre vineyard", fact: "Paris has a working vineyard — Clos Montmartre harvests about a thousand bottles a year." },
  ],
  tokyo: [
    { name: "Sensō-ji", fact: "Tokyo's oldest temple began in 645 when two fishermen pulled a golden statue from the Sumida river." },
    { name: "Meiji Shrine forest", fact: "Its 120,000 trees were donated by citizens a century ago — now it swallows the city's noise whole." },
    { name: "Tsukiji Outer Market", fact: "The wholesale fish moved to Toyosu, but the knife shops and tamagoyaki stalls never left." },
    { name: "Shibuya Crossing", fact: "Up to 3,000 people cross per light cycle — watch it from Shibuya Sky just before dusk." },
    { name: "Yanaka Ginza", fact: "A shoten-gai that survived the war; cats, croquettes and a sunset view over the low town." },
  ],
  rome: [
    { name: "Trastevere", fact: "Cobbled lanes west of the Tiber where nonna-run trattorias spill tables onto the piazza by eight." },
    { name: "Pantheon", fact: "Its unreinforced concrete dome is still the largest on Earth after 1,900 years — and the oculus lets the rain in." },
    { name: "Borghese Gardens", fact: "A cardinal's pleasure park turned public; rent a rowboat on the lake shaped like a Greek temple." },
    { name: "Aventine Keyhole", fact: "Peek through the Priory door and St. Peter's dome sits perfectly framed in a hedge tunnel." },
    { name: "Testaccio Market", fact: "Rome's offal heartland — trapizzino was invented at a white stall in this very hall." },
  ],
  "new york": [
    { name: "The High Line", fact: "A derelict freight rail line became an elevated park where wildflowers seed themselves between the tracks." },
    { name: "Brooklyn Bridge walkway", fact: "At dawn the wooden promenade is quiet; the gothic cables hum with a century of cables and gulls." },
    { name: "Grand Central ceiling", fact: "Its zodiac mural is painted backwards — a happy accident the Vanderbilts called 'a heavenly viewpoint'." },
    { name: "St. Marks Place", fact: "The East Village block where punk, pierogi and anime shops have shared a sidewalk since the 70s." },
    { name: "Central Park Ramble", fact: "Thirty-eight acres engineered to feel accidental — 160 bird species have been spotted in the tangle." },
  ],
};

export function fallbackLandmarks(city: string): Landmark[] {
  const key = city.toLowerCase();
  for (const k of Object.keys(FALLBACK_CITIES)) {
    if (key.includes(k)) return FALLBACK_CITIES[k];
  }
  return [];
}
