import { MENU_BY_KEY, intensityTier } from "./menus";

export type MapCell = {
  region_code: string;
  top_menu: string;
  count: number;
  tie: boolean;
};

export type CellStyle = { fill: string; opacity: number; tie: boolean };

const EMPTY: CellStyle = { fill: "var(--border)", opacity: 0.22, tie: false };

/** 칸 스타일: 1위 메뉴 색 + 표 수 3단계 진하기. 동률은 회색 빗금. 미표시는 옅은 회색. */
export function cellStyle(cell: MapCell | undefined): CellStyle {
  if (!cell) return EMPTY;
  if (cell.tie) return { fill: "#9ca3af", opacity: 0.55, tie: true };
  const color = MENU_BY_KEY.get(cell.top_menu)?.color ?? "#9ca3af";
  const tier = intensityTier(cell.count); // 1~3 (0은 서버에서 제외됨)
  const opacity = tier >= 3 ? 1 : tier === 2 ? 0.72 : 0.46;
  return { fill: color, opacity, tie: false };
}
