"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { toStage, STAGE_COLORS } from "@/lib/constants";

export type RegionCounts = Record<string, number>;

type Props = {
  /** region_code -> 서로 다른 가게 수 */
  counts: RegionCounts;
  /** 칸 탭 시 */
  onRegionClick?: (regionCode: string, fullName?: string) => void;
};

const SOURCE = "regions";
const FILL_LAYER = "regions-fill";
const LINE_LAYER = "regions-line";
const EMPTY_FILL = "rgba(255,255,255,0.04)"; // 미방문 칸

export default function MapView({ counts, onRegionClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // 지도 1회 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // 배경 타일 없음 — 우리 폴리곤만 그린다
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "bg",
            type: "background",
            paint: { "background-color": "#0b1020" },
          },
        ],
      },
      center: [127.8, 36.2], // 대한민국 중심 근방
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", async () => {
      try {
        const res = await fetch("/boundaries/display.geojson");
        if (!res.ok) return;
        const geojson = await res.json();

        map.addSource(SOURCE, {
          type: "geojson",
          data: geojson,
          promoteId: "region_code", // region_code 를 feature id 로
        });
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE,
          paint: {
            "fill-color": [
              "coalesce",
              ["feature-state", "color"],
              EMPTY_FILL,
            ],
            "fill-opacity": 0.92,
          },
        });
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE,
          paint: {
            "line-color": "rgba(255,255,255,0.25)",
            "line-width": 0.5,
          },
        });

        applyCounts(map, counts);

        map.on("click", FILL_LAYER, (e) => {
          const f = e.features?.[0];
          const code = f?.properties?.region_code as string | undefined;
          if (code) onRegionClick?.(code, f?.properties?.full_name as string);
        });
        map.on("mouseenter", FILL_LAYER, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", FILL_LAYER, () => {
          map.getCanvas().style.cursor = "";
        });
      } catch {
        // 경계 파일 없음(데이터 준비 전) — 조용히 무시
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // 의존성: 초기화는 1회만. counts 반영은 아래 effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // counts 변경 시 색 재적용
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(SOURCE)) return;
    applyCounts(map, counts);
  }, [counts]);

  return <div ref={containerRef} style={{ width: "100%", height: "100dvh" }} />;
}

function applyCounts(map: maplibregl.Map, counts: RegionCounts) {
  for (const [code, cnt] of Object.entries(counts)) {
    const stage = toStage(cnt);
    if (stage === 0) continue; // 미방문은 기본 색 유지
    map.setFeatureState(
      { source: SOURCE, id: code },
      { color: STAGE_COLORS[stage] },
    );
  }
}
