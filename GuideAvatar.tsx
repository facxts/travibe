/* A tiny local guide dressed in the destination's traditional dress */

type Region =
  | "gulf" | "japan" | "india" | "egypt" | "france" | "italy" | "morocco"
  | "china" | "mexico" | "uk" | "usa" | "turkey" | "greece" | "default";

function detect(city: string): Region {
  const c = city.toLowerCase();
  const has = (...w: string[]) => w.some((k) => c.includes(k));
  if (has("uae", "dubai", "abu dhabi", "qatar", "doha", "saudi", "kuwait", "bahrain", "oman")) return "gulf";
  if (has("japan", "tokyo", "kyoto", "osaka")) return "japan";
  if (has("india", "mumbai", "delhi", "jaipur")) return "india";
  if (has("egypt", "cairo")) return "egypt";
  if (has("france", "paris", "lyon")) return "france";
  if (has("italy", "rome", "venice", "milan", "florence")) return "italy";
  if (has("morocco", "marrakech", "fez")) return "morocco";
  if (has("china", "beijing", "shanghai")) return "china";
  if (has("mexico", "cancun")) return "mexico";
  if (has("london", "england", "uk", "britain")) return "uk";
  if (has("new york", "usa", "america", "los angeles", "chicago")) return "usa";
  if (has("turkey", "istanbul")) return "turkey";
  if (has("greece", "athens", "santorini")) return "greece";
  return "default";
}

const ROBES: Record<Region, { robe: string; accent: string; sash?: string }> = {
  gulf: { robe: "#f4f1ea", accent: "#17140f" },
  japan: { robe: "#8a2f3a", accent: "#e9d9a8", sash: "#17140f" },
  india: { robe: "#c0632a", accent: "#e9b949", sash: "#7d2f4f" },
  egypt: { robe: "#e4d7bb", accent: "#a9823c" },
  france: { robe: "#f4f1ea", accent: "#2e4a7d" },
  italy: { robe: "#6b5d3f", accent: "#8a2f3a" },
  morocco: { robe: "#7d6c4a", accent: "#c0632a" },
  china: { robe: "#8a2f3a", accent: "#e9b949" },
  mexico: { robe: "#efe4cd", accent: "#3f7d52", sash: "#8a2f3a" },
  uk: { robe: "#3a3a3a", accent: "#17140f" },
  usa: { robe: "#4a6fa5", accent: "#f4f1ea" },
  turkey: { robe: "#5b4632", accent: "#8a2f3a" },
  greece: { robe: "#f4f1ea", accent: "#2e4a7d" },
  default: { robe: "#7d6c4a", accent: "#5b4632" },
};

function Headwear({ r }: { r: Region }) {
  switch (r) {
    case "gulf":
      return (
        <g>
          <path d="M22 26 Q40 10 58 26 L60 40 Q40 34 20 40 Z" fill="#f4f1ea" stroke="#17140f" strokeWidth="1.6" />
          <ellipse cx="40" cy="20" rx="17" ry="5" fill="none" stroke="#17140f" strokeWidth="3" />
          <path d="M22 26 L18 44 M58 26 L62 44" stroke="#17140f" strokeWidth="1.4" />
        </g>
      );
    case "japan":
      return <path d="M24 24 Q40 14 56 24 L56 30 Q40 24 24 30 Z" fill="#17140f" />;
    case "india":
      return (
        <g>
          <path d="M24 26 Q40 8 56 26 Q40 20 24 26 Z" fill="#e9b949" stroke="#17140f" strokeWidth="1.4" />
          <circle cx="40" cy="30" r="2" fill="#8a2f3a" />
        </g>
      );
    case "egypt":
      return <path d="M26 28 Q40 12 54 28 L54 34 Q40 28 26 34 Z" fill="#f4f1ea" stroke="#17140f" strokeWidth="1.5" />;
    case "france":
      return <ellipse cx="38" cy="20" rx="16" ry="7" fill="#2e2e2e" stroke="#17140f" strokeWidth="1.4" />;
    case "italy":
      return <path d="M24 24 Q40 16 56 24 L56 28 L24 28 Z" fill="#6b5d3f" stroke="#17140f" strokeWidth="1.4" />;
    case "morocco":
      return <path d="M20 30 Q40 2 60 30 L52 32 Q40 14 28 32 Z" fill="#7d6c4a" stroke="#17140f" strokeWidth="1.5" />;
    case "china":
      return (
        <g>
          <path d="M18 26 L62 26 L40 14 Z" fill="#e9d9a8" stroke="#17140f" strokeWidth="1.4" />
          <circle cx="40" cy="13" r="2.4" fill="#8a2f3a" />
        </g>
      );
    case "mexico":
      return (
        <g>
          <ellipse cx="40" cy="22" rx="24" ry="6" fill="#e9d9a8" stroke="#17140f" strokeWidth="1.5" />
          <path d="M30 22 Q40 8 50 22 Z" fill="#e9d9a8" stroke="#17140f" strokeWidth="1.5" />
        </g>
      );
    case "uk":
      return <path d="M26 24 Q26 12 40 12 Q54 12 54 24 L56 26 L24 26 Z" fill="#2e2e2e" stroke="#17140f" strokeWidth="1.4" />;
    case "usa":
      return (
        <g>
          <path d="M26 24 Q26 12 40 12 Q54 12 54 24 Z" fill="#8a2f3a" stroke="#17140f" strokeWidth="1.4" />
          <path d="M54 24 L64 26 L54 28 Z" fill="#8a2f3a" stroke="#17140f" strokeWidth="1.4" />
        </g>
      );
    case "turkey":
      return <path d="M30 26 L30 12 Q40 8 50 12 L50 26 Z" fill="#8a2f3a" stroke="#17140f" strokeWidth="1.4" />;
    case "greece":
      return <path d="M26 24 Q40 14 54 24 L54 27 L26 27 Z" fill="#2e4a7d" stroke="#17140f" strokeWidth="1.4" />;
    default:
      return (
        <g>
          <path d="M24 24 Q40 14 56 24 L56 27 L24 27 Z" fill="#5b4632" stroke="#17140f" strokeWidth="1.4" />
          <path d="M22 27 L58 27" stroke="#17140f" strokeWidth="2" />
        </g>
      );
  }
}

export default function GuideAvatar({ city, size = 76 }: { city: string; size?: number }) {
  const r = detect(city);
  const c = ROBES[r];
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 80 94" aria-label="your local guide">
      {/* robe */}
      <path d="M20 92 Q20 56 40 54 Q60 56 60 92 Z" fill={c.robe} stroke="#17140f" strokeWidth="1.8" />
      {c.sash && <rect x="24" y="68" width="32" height="7" fill={c.sash} stroke="#17140f" strokeWidth="1.2" />}
      {/* collar accent */}
      <path d="M32 56 L40 64 L48 56" fill="none" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
      {r === "france" && (
        <g stroke={c.accent} strokeWidth="2">
          <path d="M24 72 H56 M24 78 H56 M24 84 H56" />
        </g>
      )}
      {r === "china" && (
        <g fill={c.accent}>
          <circle cx="40" cy="68" r="1.6" /><circle cx="40" cy="75" r="1.6" /><circle cx="40" cy="82" r="1.6" />
        </g>
      )}
      {/* head */}
      <circle cx="40" cy="36" r="17" fill="#e8c39a" stroke="#17140f" strokeWidth="1.8" />
      {/* happy closed eyes + smile */}
      <path d="M32 35 q3 -4 6 0 M42 35 q3 -4 6 0" fill="none" stroke="#17140f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M35 43 q5 5 10 0" fill="none" stroke="#17140f" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="30" cy="41" r="2.2" fill="#d99a76" opacity="0.6" />
      <circle cx="50" cy="41" r="2.2" fill="#d99a76" opacity="0.6" />
      <Headwear r={r} />
    </svg>
  );
}
