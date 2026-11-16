"use client";

import { useRef, useState } from "react";
import { MENUS } from "@/lib/menus";

export default function Roulette({
  onResult,
}: {
  onResult: (menuKey: string) => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    const target = Math.floor(Math.random() * MENUS.length);
    let ticks = 0;
    const totalTicks = 20 + target; // 한 바퀴 넘게 돌다 target 에서 멈춤
    timer.current = setInterval(() => {
      ticks += 1;
      setHighlight((h) => (h + 1) % MENUS.length);
      if (ticks >= totalTicks) {
        if (timer.current) clearInterval(timer.current);
        setHighlight(target);
        setSpinning(false);
        onResult(MENUS[target].key);
      }
    }, 80);
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          padding: "16px 0",
          color: MENUS[highlight].color,
        }}
      >
        {MENUS[highlight].label}
      </div>
      <button
        onClick={spin}
        disabled={spinning}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--fg)",
          fontSize: 15,
          cursor: spinning ? "default" : "pointer",
        }}
      >
        {spinning ? "돌리는 중…" : "🎲 룰렛 돌리기"}
      </button>
    </div>
  );
}
