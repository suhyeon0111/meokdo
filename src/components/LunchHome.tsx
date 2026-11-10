"use client";

import { useCallback, useEffect, useState } from "react";
import { loadKakao } from "@/lib/kakao/loader";
import {
  resolveCell,
  saveCell,
  loadSavedCell,
  type MyCell,
} from "@/lib/region";
import { MENU_BY_KEY } from "@/lib/menus";
import { track } from "@/lib/track";
import MenuPicker from "./MenuPicker";
import Roulette from "./Roulette";
import ShopSheet from "./ShopSheet";

const FIRST_VISIT_KEY = "lunchmap.firstVisit";

type Coords = { lat: number; lng: number };
type Top3 = { scope: string; top3: { menu_type: string; count: number }[]; total: number };

export default function LunchHome() {
  const [cell, setCell] = useState<MyCell | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null); // 메모리 전용, 서버로 보내지 않음
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "error">("idle");
  const [locError, setLocError] = useState("");
  const [top3, setTop3] = useState<Top3 | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const fetchTop3 = useCallback(async (regionCode: string) => {
    try {
      const res = await fetch(`/api/today?region=${regionCode}`);
      if (res.ok) setTop3(await res.json());
    } catch {
      /* 무시 */
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString());
    }
    track("home_view");
    const saved = loadSavedCell();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 저장된 칸 1회 복원
      setCell(saved);
      fetchTop3(saved.regionCode);
    }
  }, [fetchTop3]);

  function getCoords(): Promise<Coords> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("이 브라우저는 위치를 지원하지 않습니다"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error("위치 권한이 거부되었습니다")),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  const locate = useCallback(async (): Promise<Coords> => {
    setLocStatus("loading");
    setLocError("");
    try {
      const kakao = await loadKakao();
      const c = await getCoords();
      setCoords(c); // 메모리에만 — 저장/전송 안 함
      const found = await resolveCell(kakao, c.lng, c.lat);
      setCell(found);
      saveCell(found);
      fetchTop3(found.regionCode);
      setLocStatus("idle");
      return c;
    } catch (e) {
      setLocStatus("error");
      setLocError(e instanceof Error ? e.message : "위치 확인 실패");
      throw e;
    }
  }, [fetchTop3]);

  async function onSelectMenu(menuKey: string) {
    track("menu_select");
    try {
      if (!coords || !cell) await locate();
      setSelectedMenu(menuKey);
    } catch {
      /* 위치 실패 시 시트 열지 않음 (에러는 화면에 표시됨) */
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 40px", minHeight: "100dvh" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>오늘 점심 지도</h1>

      {/* 내 칸 */}
      <section style={{ marginTop: 14 }}>
        {cell ? (
          <div style={{ fontSize: 14 }}>
            내 칸: <b>{cell.sidoName} {cell.sigunguName}</b>{" "}
            <button onClick={locate} style={linkBtn}>다시 찾기</button>
            {top3 && top3.total >= 5 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  오늘 {top3.scope === "region" ? "" : top3.scope === "sido" ? "(시도) " : "(전국) "}TOP3:
                </span>
                {top3.top3.map((t) => (
                  <span key={t.menu_type} style={chip(MENU_BY_KEY.get(t.menu_type)?.color)}>
                    {MENU_BY_KEY.get(t.menu_type)?.label} {t.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button onClick={locate} style={primaryBtn} disabled={locStatus === "loading"}>
            {locStatus === "loading" ? "찾는 중…" : "📍 내 위치로 내 칸 찾기"}
          </button>
        )}
        {locStatus === "error" && (
          <p style={{ color: "#d1495b", fontSize: 13, marginTop: 8 }}>{locError}</p>
        )}
      </section>

      {/* 룰렛 */}
      <section style={{ marginTop: 24 }}>
        <Roulette onResult={onSelectMenu} />
      </section>

      {/* 메뉴 직접 선택 */}
      <section style={{ marginTop: 20 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>또는 직접 고르기</p>
        <MenuPicker onSelect={onSelectMenu} />
      </section>

      {selectedMenu && coords && cell && (
        <ShopSheet
          menuKey={selectedMenu}
          coords={coords}
          cell={cell}
          onClose={() => setSelectedMenu(null)}
        />
      )}
    </main>
  );
}

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg)",
  fontSize: 15,
  cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
};
function chip(color?: string): React.CSSProperties {
  return {
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 999,
    border: `1px solid ${color ?? "var(--border)"}`,
    color: color ?? "var(--fg)",
  };
}
