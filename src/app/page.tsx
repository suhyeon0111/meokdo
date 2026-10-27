import MapHome from "@/components/MapHome";

// Day 2: 목업 집계. Day 5 에서 v_region_counts(로그인 사용자) 로 교체.
const MOCK_COUNTS: Record<string, number> = {
  "11680": 23, // 강남구 → stage 5
  "41110": 12, // 수원시 장안구 → stage 3
  "28110": 7, //  인천 중구 → stage 2
  "26110": 3, //  부산 중구 → stage 1
};

export default function Home() {
  return <MapHome counts={MOCK_COUNTS} />;
}
