"use client";

import { useEffect, useState } from "react";
import { loadKakao } from "@/lib/kakao/loader";
import {
  resolveCell,
  saveCell,
  loadSavedCell,
  sidoPrefix,
  type MyCell,
} from "@/lib/region";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; cell: MyCell }
  | { kind: "error"; message: string };

export default function FindMyCell() {
  const [state, setState] = useState<State>({ kind: "idle" });

  // 저장된 칸이 있으면 먼저 보여준다. localStorage 는 브라우저 전용이라
  // 마운트 후 1회 읽어 하이드레이션 불일치를 피한다(외부 저장소 동기화).
  useEffect(() => {
    const saved = loadSavedCell();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 localStorage 1회 동기화
    if (saved) setState({ kind: "ok", cell: saved });
  }, []);

  async function findByLocation() {
    setState({ kind: "loading" });
    try {
      const kakao = await loadKakao();
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("이 브라우저는 위치를 지원하지 않습니다"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          () => reject(new Error("위치 권한이 거부되었습니다")),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
      // 좌표 → 시군구. 좌표는 여기서만 쓰고 버린다(서버로 보내지 않음).
      const cell = await resolveCell(kakao, coords.longitude, coords.latitude);
      saveCell(cell);
      setState({ kind: "ok", cell });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "실패" });
    }
  }

  return (
    <section style={card}>
      <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>내 칸 찾기 (Day 1 진단)</h2>

      <button onClick={findByLocation} style={btn} disabled={state.kind === "loading"}>
        {state.kind === "loading" ? "찾는 중…" : "📍 내 위치로 찾기"}
      </button>

      {state.kind === "ok" && (
        <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7 }}>
          <div>
            칸: <b>{state.cell.sidoName} {state.cell.sigunguName}</b>
          </div>
          <div style={mono}>
            시군구 코드: <b>{state.cell.regionCode}</b> · 시도 {sidoPrefix(state.cell.regionCode)}
          </div>
          <div style={{ ...mono, color: "var(--muted)" }}>
            법정동 코드(원본): {state.cell.fullCode}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
            ⚠️ 이 코드가 경계 GeoJSON의 region_code와 일치해야 지도 색칠이 맞습니다(리스크 #6 검증).
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <p style={{ marginTop: 12, color: "#d1495b", fontSize: 14 }}>
          {state.message}
          <br />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            권한 거부 시 직접 선택(시군구 목록)은 경계 데이터 준비 후 추가 예정.
          </span>
        </p>
      )}
    </section>
  );
}

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  marginTop: 24,
};
const btn: React.CSSProperties = {
  fontSize: 15,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg)",
  cursor: "pointer",
};
const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  marginTop: 4,
};
