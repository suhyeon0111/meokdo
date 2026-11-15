"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { MENUS, MENU_BY_KEY } from "@/lib/menus";
import { cellStyle, type MapCell } from "@/lib/mapColor";
import { track } from "@/lib/track";

const W = 360;
const H = 460;

type RegionProps = { region_code: string; full_name: string };
type Selected = { code: string; name: string; top3?: { menu_type: string; count: number }[] };

export default function LunchMap() {
  const [geo, setGeo] = useState<FeatureCollection<Geometry, RegionProps> | null>(null);
  const [cells, setCells] = useState<Map<string, MapCell>>(new Map());
  const [voteDate, setVoteDate] = useState<string>("");
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    track("map_view");
    (async () => {
      const [g, m] = await Promise.allSettled([
        fetch("/boundaries/display.geojson").then((r) => r.json()),
        fetch("/api/map").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (g.status === "fulfilled") setGeo(g.value);
      if (m.status === "fulfilled" && m.value) {
        setVoteDate(m.value.vote_date ?? "");
        const map = new Map<string, MapCell>();
        for (const c of m.value.cells ?? []) map.set(c.region_code, c);
        setCells(map);
      }
    })();
  }, []);

  const path = useMemo(() => {
    if (!geo) return null;
    const projection = geoMercator().fitSize([W, H], geo);
    return geoPath(projection);
  }, [geo]);

  async function onCellClick(f: Feature<Geometry, RegionProps>) {
    const { region_code, full_name } = f.properties;
    setSelected({ code: region_code, name: full_name });
    try {
      const res = await fetch(`/api/today?region=${region_code}`);
      if (res.ok) {
        const j = await res.json();
        setSelected({ code: region_code, name: full_name, top3: j.top3 });
      }
    } catch {
      /* 무시 */
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 40px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>오늘의 점심 지도</h1>
        <Link href="/" style={{ fontSize: 13, color: "var(--muted)" }}>← 홈</Link>
      </header>
      {voteDate && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{voteDate} 기준</p>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", marginTop: 12, display: "block" }}
        role="img"
        aria-label="시군구별 오늘 1위 점심 메뉴 지도"
      >
        <defs>
          <pattern id="tie-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#9ca3af" fillOpacity="0.25" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#6b7280" strokeWidth="1.5" />
          </pattern>
        </defs>
        {path &&
          geo!.features.map((f, i) => {
            const d = path(f);
            if (!d) return null;
            const s = cellStyle(cells.get(f.properties.region_code));
            return (
              <path
                key={f.properties.region_code ?? i}
                d={d}
                fill={s.tie ? "url(#tie-hatch)" : s.fill}
                fillOpacity={s.tie ? 1 : s.opacity}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={0.4}
                style={{ cursor: "pointer" }}
                onClick={() => onCellClick(f)}
              />
            );
          })}
      </svg>

      {/* 범례 (10색 — 항상 표시) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 12 }}>
        {MENUS.map((m) => (
          <span key={m.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>

      {/* 선택한 칸 TOP3 */}
      {selected && (
        <div style={sheet} onClick={() => setSelected(null)}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{selected.name}</div>
          {!selected.top3 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>불러오는 중…</p>
          ) : selected.top3.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>오늘 아직 표가 없어요.</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.top3.map((t) => (
                <span key={t.menu_type} style={chip(MENU_BY_KEY.get(t.menu_type)?.color)}>
                  {MENU_BY_KEY.get(t.menu_type)?.label} {t.count}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>탭하면 닫혀요</p>
        </div>
      )}
    </main>
  );
}

const sheet: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 16,
  transform: "translateX(-50%)",
  width: "min(92%, 440px)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
};
function chip(color?: string): React.CSSProperties {
  return {
    fontSize: 13,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${color ?? "var(--border)"}`,
    color: color ?? "var(--fg)",
  };
}
