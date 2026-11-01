/**
 * 투표 단위가 되는 고정 메뉴 종류 10개 (기획서 §지도표현).
 * key: DB/계측에 저장되는 안정적 식별자 (변경 금지)
 * searchKeywords: 카카오 JS SDK keywordSearch 에 쓸 키워드
 * color: 지도에서 이 메뉴가 1위인 칸의 고정 색
 */
export type MenuType = {
  key: string;
  label: string;
  searchKeywords: string[];
  color: string;
};

export const MENUS: MenuType[] = [
  { key: "korean", label: "한식", searchKeywords: ["한식", "백반"], color: "#e4572e" },
  { key: "soup", label: "국밥·탕", searchKeywords: ["국밥", "해장국"], color: "#f3a712" },
  { key: "noodle", label: "면", searchKeywords: ["국수", "칼국수", "라멘"], color: "#f6c85f" },
  { key: "chinese", label: "중식", searchKeywords: ["중식", "중국집"], color: "#d1495b" },
  { key: "japanese", label: "일식", searchKeywords: ["돈가스", "초밥", "덮밥"], color: "#6a4c93" },
  { key: "western", label: "양식", searchKeywords: ["파스타", "햄버거"], color: "#1982c4" },
  { key: "bunsik", label: "분식", searchKeywords: ["분식", "김밥"], color: "#ff6b6b" },
  { key: "meat", label: "고기·구이", searchKeywords: ["고기집", "제육"], color: "#8d5524" },
  { key: "salad", label: "샐러드·건강식", searchKeywords: ["샐러드", "포케"], color: "#2a9d8f" },
  { key: "asian", label: "아시안", searchKeywords: ["쌀국수", "커리"], color: "#3cb44b" },
];

export const MENU_KEYS = MENUS.map((m) => m.key);
export const MENU_BY_KEY = new Map(MENUS.map((m) => [m.key, m]));

export function isMenuKey(v: unknown): v is string {
  return typeof v === "string" && MENU_BY_KEY.has(v);
}

/** 표 수 → 진하기 3단계 (SPEC §3). 0 = 미표시(5표 미만). */
export function intensityTier(total: number): 0 | 1 | 2 | 3 {
  if (total < 5) return 0;
  if (total <= 9) return 1;
  if (total <= 29) return 2;
  return 3;
}
