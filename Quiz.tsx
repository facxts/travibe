import { useEffect, useState } from "react";
import { Landmark } from "../lib/api";

interface Q {
  q: string;
  options: string[];
  answer: number;
}

interface Props {
  open: boolean;
  city: string;
  landmarks: Landmark[];
  onClose: () => void;
}

function build(landmarks: Landmark[]): Q[] {
  const names = landmarks.map((l) => l.name);
  return landmarks
    .map((l) => {
      const options = [...names].sort(() => Math.random() - 0.5);
      return { q: `Which spot is this? “${l.fact}”`, options, answer: options.indexOf(l.name) };
    })
    .sort(() => Math.random() - 0.5);
}

export default function Quiz({ open, city, landmarks, onClose }: Props) {
  const [bank, setBank] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setBank(build(landmarks));
      setI(0);
      setScore(0);
      setPicked(null);
      setDone(false);
    }
  }, [open, landmarks]);

  if (!open || !bank.length) return null;
  const cur = bank[i];

  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === cur.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 >= bank.length) {
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(20,17,12,0.82)" }}
      onClick={onClose}
    >
      <div className="panel w-full max-w-[460px] p-6 reveal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">minigame · {city.split(",")[0]}</span>
          <svg width="16" height="16" viewBox="0 0 100 95" fill="var(--brass)">
            <path d="M50 2 L61 34 L95 35 L68 56 L78 90 L50 70 L22 90 L32 56 L5 35 L39 34 Z" />
          </svg>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="script text-[30px]" style={{ color: "var(--burgundy)" }}>
              {score === bank.length ? "flawless!" : score >= bank.length / 2 ? "well travelled!" : "keep wandering!"}
            </div>
            <div className="serif text-[40px] font-black mt-1">
              {score}<span style={{ color: "var(--muted)" }}>/{bank.length}</span>
            </div>
            <button className="btn-solid mt-4" onClick={onClose}>back to the city</button>
          </div>
        ) : (
          <>
            <div className="mono text-[10px] mb-2" style={{ color: "var(--muted)" }}>
              question {i + 1} of {bank.length}
            </div>
            <div className="serif text-[19px] font-semibold leading-snug mb-4">{cur.q}</div>
            <div>
              {cur.options.map((opt, idx) => (
                <div
                  key={opt}
                  className={
                    "quiz-opt" +
                    (picked !== null && idx === cur.answer ? " correct" : "") +
                    (picked === idx && idx !== cur.answer ? " wrong" : "")
                  }
                  onClick={() => pick(idx)}
                >
                  {opt}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="mono text-[11px]" style={{ color: "var(--burgundy)" }}>score: {score}</span>
              {picked !== null && (
                <button className="btn-solid" onClick={next}>
                  {i + 1 >= bank.length ? "finish" : "next"}
                </button>
              )}
            </div>
          </>
        )}
        <div className="mono text-[10px] text-center mt-4 cursor-pointer" style={{ color: "var(--muted)" }} onClick={onClose}>
          close
        </div>
      </div>
    </div>
  );
}
