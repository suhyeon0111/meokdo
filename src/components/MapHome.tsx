"use client";

import dynamic from "next/dynamic";
import type { RegionCounts } from "./MapView";

// maplibre-gl 은 window 의존 → SSR 비활성화로 클라에서만 로드
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
      }}
    >
      지도 불러오는 중…
    </div>
  ),
});

export default function MapHome({ counts }: { counts: RegionCounts }) {
  return (
    <MapView
      counts={counts}
      onRegionClick={(code, name) => {
        // Day 5+ 에서 /region/[code] 로 라우팅
        console.log("region clicked:", code, name);
      }}
    />
  );
}
