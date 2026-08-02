export interface CarType {
  id: string;
  name: string;
  color: string;
  svg: (color?: string) => React.ReactNode;
}

const S = (color: string) => ({
  fill: "none",
  stroke: color,
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const carTypes: CarType[] = [
  {
    id: "hatch",
    name: "Hatchback",
    color: "#c0392b",
    svg: (c = "#c0392b") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <path d="M10 42 Q10 30 22 28 L34 16 Q42 12 55 12 L70 16 Q80 20 88 30 Q92 34 90 42 Z" />
        <circle cx="28" cy="46" r="8" />
        <circle cx="74" cy="46" r="8" />
        <path d="M36 18 L45 28 M52 14 L56 28" />
      </svg>
    ),
  },
  {
    id: "convertible",
    name: "Convertible",
    color: "#2e6db4",
    svg: (c = "#2e6db4") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <path d="M10 42 Q12 28 26 26 Q40 18 60 18 Q78 20 90 32 Q94 36 90 42 Z" />
        <path d="M28 26 Q45 22 62 24" />
        <circle cx="28" cy="46" r="8" />
        <circle cx="74" cy="46" r="8" />
      </svg>
    ),
  },
  {
    id: "van",
    name: "Camper Van",
    color: "#8e6fc0",
    svg: (c = "#8e6fc0") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <path d="M8 42 L8 22 Q8 16 16 16 L78 16 Q92 16 92 30 L92 42 Z" />
        <path d="M14 16 L14 30 L92 30" />
        <rect x="20" y="20" width="14" height="8" rx="1" />
        <circle cx="26" cy="46" r="8" />
        <circle cx="76" cy="46" r="8" />
      </svg>
    ),
  },
  {
    id: "coupe",
    name: "Coupé",
    color: "#d4589a",
    svg: (c = "#d4589a") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <path d="M8 42 Q10 34 24 30 L38 18 Q46 14 58 15 L68 22 Q84 26 92 34 Q94 38 90 42 Z" />
        <path d="M40 19 L48 30 M60 16 L66 28" />
        <circle cx="26" cy="46" r="8" />
        <circle cx="76" cy="46" r="8" />
      </svg>
    ),
  },
  {
    id: "truck",
    name: "Pickup",
    color: "#d9a407",
    svg: (c = "#d9a407") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <path d="M8 42 L8 30 Q8 20 20 20 L38 20 Q44 20 47 28 L47 42" />
        <path d="M47 42 L47 24 L92 24 L92 42 Z" />
        <circle cx="24" cy="46" r="8" />
        <circle cx="76" cy="46" r="8" />
      </svg>
    ),
  },
  {
    id: "scooter",
    name: "Scooter",
    color: "#6d1a24",
    svg: (c = "#6d1a24") => (
      <svg viewBox="0 0 100 60" {...S(c)}>
        <circle cx="24" cy="44" r="9" />
        <circle cx="80" cy="44" r="9" />
        <path d="M24 44 L48 44 L60 20 L74 20 M60 20 L60 12 M48 44 Q60 36 80 44" />
      </svg>
    ),
  },
];
