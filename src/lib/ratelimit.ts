/**
 * IP 레이트리밋 (남용 방지 2단계, SPEC §7).
 * ⚠️ 현재는 인메모리 스텁 — 서버리스에서 인스턴스마다 따로 세므로 임시용.
 *   Day 8 에서 Upstash Redis(만료 카운터)로 교체. IP 는 DB 에 저장하지 않는다.
 * IP 원문 대신 해시를 키로 쓴다.
 */
import { createHash } from "node:crypto";

const WINDOW_MS = 60_000; // 1분
const MAX = 20; // 분당 최대 요청(가정)

const hits = new Map<string, { count: number; resetAt: number }>();

export function ipKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/** true = 허용, false = 초과(429) */
export function allow(key: string, now = Date.now()): boolean {
  const cur = hits.get(key);
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (cur.count >= MAX) return false;
  cur.count += 1;
  return true;
}
