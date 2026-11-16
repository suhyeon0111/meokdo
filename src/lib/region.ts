import type { Kakao, KakaoRegionResult } from "@/types/kakao";

/** 내 칸 (시군구). 좌표는 담지 않는다 — 판정 후 버린다. */
export type MyCell = {
  regionCode: string; // 시군구 5자리 (앞 2 = 시도)
  sidoName: string;
  sigunguName: string;
  fullCode: string; // 법정동 10자리 (디버그/코드 매칭 확인용)
};

const STORAGE_KEY = "lunchmap.cell";

export function sidoPrefix(regionCode: string): string {
  return regionCode.slice(0, 2);
}

/** coord2RegionCode 결과에서 법정동(B) 우선으로 시군구 칸을 뽑는다. */
export function toMyCell(results: KakaoRegionResult[]): MyCell | null {
  const r = results.find((x) => x.region_type === "B") ?? results[0];
  if (!r) return null;
  return {
    regionCode: r.code.slice(0, 5),
    sidoName: r.region_1depth_name,
    sigunguName: r.region_2depth_name,
    fullCode: r.code,
  };
}

/** 좌표 → 시군구. 좌표는 이 함수 밖으로 나가지 않는다. */
export function resolveCell(
  kakao: Kakao,
  lng: number,
  lat: number,
): Promise<MyCell> {
  return new Promise((resolve, reject) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2RegionCode(lng, lat, (result, status) => {
      if (status !== kakao.maps.services.Status.OK) {
        reject(new Error("행정구역 변환 실패"));
        return;
      }
      const cell = toMyCell(result);
      if (!cell) {
        reject(new Error("시군구를 찾지 못함"));
        return;
      }
      resolve(cell);
    });
  });
}

export function saveCell(cell: MyCell): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cell));
  } catch {
    /* 저장 실패 무시 */
  }
}

export function loadSavedCell(): MyCell | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MyCell) : null;
  } catch {
    return null;
  }
}
