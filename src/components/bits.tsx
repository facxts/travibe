export function Sparkle({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={"sparkle-star " + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0 C12.8 7 13.6 8.6 15 10 C16.8 11.4 19 11.7 24 12 C19 12.3 16.8 12.6 15 14 C13.6 15.4 12.8 17 12 24 C11.2 17 10.4 15.4 9 14 C7.2 12.6 5 12.3 0 12 C5 11.7 7.2 11.4 9 10 C10.4 8.6 11.2 7 12 0 Z" />
    </svg>
  );
}

export function SparkleRow({ gap = 6 }: { gap?: number }) {
  return (
    <span className="inline-flex items-center" style={{ gap, color: "var(--olive)" }} aria-hidden>
      <Sparkle size={9} />
      <Sparkle size={14} className="s2" />
      <Sparkle size={9} className="s3" />
    </span>
  );
}

export function FlourishRule() {
  return (
    <svg className="flourish-rule" viewBox="0 0 300 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" preserveAspectRatio="none" aria-hidden>
      <path d="M2 10 C40 2 60 14 100 8 C140 2 150 12 150 8 C150 12 160 2 200 8 C240 14 260 2 298 10" />
      <path d="M120 12 C140 15 160 15 180 12" opacity="0.5" />
    </svg>
  );
}
