/**
 * "오늘" = KST 05:00 ~ 익일 05:00 (기획서 §용어).
 * 어떤 시각이 속하는 vote_date = 그 윈도를 연 05:00의 KST 달력 날짜.
 */

/** KST = UTC+9, 05:00 경계 → UTC 기준 +4h 이동 후 날짜 추출 */
export function kstVoteDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** 방문 구간 — 기기 식별 없이 재방문만 집계 (기획서 §개인정보) */
export const VISIT_BUCKETS = ["first", "d2_7", "d8plus"] as const;
export type VisitBucket = (typeof VISIT_BUCKETS)[number];

export function isVisitBucket(v: unknown): v is VisitBucket {
  return typeof v === "string" && (VISIT_BUCKETS as readonly string[]).includes(v);
}

/** 클라에서 최초 방문일(로컬 저장)로부터 구간 계산. 날짜 원본은 서버로 보내지 않는다. */
export function visitBucketFromFirstVisit(
  firstVisitISO: string,
  now: Date = new Date(),
): VisitBucket {
  const first = new Date(firstVisitISO);
  const days = Math.floor((now.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "first";
  if (days <= 7) return "d2_7";
  return "d8plus";
}
