/**
 * 칸 색 단계 변환. store_count = 칸 안에서 기록한 서로 다른 가게 수.
 * 단계: 0 / 1~5 / 6~10 / 11~15 / 16~20 / 21곳~
 * SQL region_stage() 와 반드시 동일하게 유지할 것.
 */
export const STAGE_THRESHOLDS = [0, 5, 10, 15, 20] as const;

export type Stage = 0 | 1 | 2 | 3 | 4 | 5;

export function toStage(count: number): Stage {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  if (count <= 20) return 4;
  return 5;
}

/** 단계별 색(가정 — 디자인 확정 시 조정). 0단계는 투명. */
export const STAGE_COLORS = [
  "#00000000",
  "#ffe0b2",
  "#ffb74d",
  "#ff9800",
  "#f57c00",
  "#e65100",
] as const;

/** 기록 입력 제약 */
export const PLACE_NAME_MAX = 60;
export const MEMO_MAX = 200;
export const MAX_PHOTOS = 5;
