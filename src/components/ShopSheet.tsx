"use client";

import { useEffect, useState } from "react";
import { loadKakao } from "@/lib/kakao/loader";
import { searchNearby, type NearbyPlace } from "@/lib/kakao/places";
import { MENU_BY_KEY } from "@/lib/menus";
import { kstVoteDate, visitBucketFromFirstVisit, type VisitBucket } from "@/lib/today";
import { track } from "@/lib/track";
import type { MyCell } from "@/lib/region";

const VOTED_KEY = "lunchmap.voted"; // 값 = vote_date (하루 1회)
const FIRST_VISIT_KEY = "lunchmap.firstVisit";

type Props = {
  menuKey: string;
  coords: { lat: number; lng: number };
  cell: MyCell;
  onClose: () => void;
};

type Load =
  | { kind: "loading" }
  | { kind: "ok"; places: NearbyPlace[] }
  | { kind: "error"; message: string };

function visitBucket(): VisitBucket {
  const first = localStorage.getItem(FIRST_VISIT_KEY) ?? new Date().toISOString();
  return visitBucketFromFirstVisit(first);
}

export default function ShopSheet({ menuKey, coords, cell, onClose }: Props) {
  const menu = MENU_BY_KEY.get(menuKey)!;
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [deciding, setDeciding] = useState(false);
  const [decidedCount, setDecidedCount] = useState<number | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(VOTED_KEY) === kstVoteDate(),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoad({ kind: "loading" });
      try {
        const kakao = await loadKakao();
        const places = await searchNearby(kakao, menu.searchKeywords[0], coords.lat, coords.lng);
        if (alive) setLoad({ kind: "ok", places });
      } catch (e) {
        if (alive) setLoad({ kind: "error", message: e instanceof Error ? e.message : "검색 실패" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [menuKey, coords.lat, coords.lng, menu.searchKeywords]);

  async function decide() {
    if (deciding || alreadyVoted) return;
    setDeciding(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          region_code: cell.regionCode,
          menu_type: menuKey,
          visit_bucket: visitBucket(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "결정 실패");
      localStorage.setItem(VOTED_KEY, kstVoteDate());
      setAlreadyVoted(true);
      setDecidedCount(json.region_menu_count ?? null);
      track("decide");
    } catch {
      // 실패 시 조용히 — 재시도 가능하도록 deciding 해제
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>
            <span style={{ color: menu.color }}>{menu.label}</span> · 근처 가게
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="닫기">✕</button>
        </div>

        <div style={{ marginTop: 12, minHeight: 120 }}>
          {load.kind === "loading" && <p style={muted}>가게 찾는 중…</p>}
          {load.kind === "error" && <p style={{ color: "#d1495b" }}>{load.message}</p>}
          {load.kind === "ok" && load.places.length === 0 && (
            <p style={muted}>근처에 결과가 없어요. 다른 메뉴를 골라보세요.</p>
          )}
          {load.kind === "ok" &&
            load.places.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                style={row}
              >
                <div>
                  <div style={{ fontSize: 15 }}>{p.name}</div>
                  <div style={{ ...muted, fontSize: 12 }}>{p.address}</div>
                </div>
                <span style={{ ...muted, fontSize: 12, whiteSpace: "nowrap" }}>
                  {p.distance}m
                </span>
              </a>
            ))}
        </div>

        {decidedCount !== null ? (
          <p style={{ textAlign: "center", fontSize: 15, margin: "12px 0 0" }}>
            오늘 <b>{cell.sigunguName}</b>에서 <b style={{ color: menu.color }}>{menu.label}</b> 고른 사람{" "}
            <b>{decidedCount}명</b> 🎉
          </p>
        ) : (
          <button
            onClick={decide}
            disabled={deciding || alreadyVoted}
            style={{ ...decideBtn, opacity: alreadyVoted ? 0.5 : 1 }}
          >
            {alreadyVoted ? "오늘은 이미 결정했어요" : deciding ? "기록 중…" : "이걸로 결정"}
          </button>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "flex-end",
  zIndex: 50,
};
const sheet: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  background: "var(--bg)",
  borderRadius: "16px 16px 0 0",
  padding: 16,
  maxHeight: "80dvh",
  overflowY: "auto",
};
const closeBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontSize: 18,
  cursor: "pointer",
};
const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  textDecoration: "none",
  color: "var(--fg)",
};
const decideBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--fg)",
  color: "var(--bg)",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};
const muted: React.CSSProperties = { color: "var(--muted)" };
