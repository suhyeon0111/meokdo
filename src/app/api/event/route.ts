import { NextResponse } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { kstVoteDate } from "@/lib/today";
import { allow, ipKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// 화이트리스트 이벤트만 (SPEC §8)
const EVENTS = [
  "home_view",
  "menu_select",
  "roulette_spin",
  "decide",
  "map_view",
  "share_click",
  "decide_under_30s",
  "decide_30_60s",
  "decide_over_60s",
] as const;

const schema = z.object({ name: z.enum(EVENTS) });

export async function POST(request: Request) {
  if (!allow(ipKey(request))) {
    return NextResponse.json({ error: { code: "rate_limited", message: "요청이 많습니다" } }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_json", message: "본문 파싱 실패" } }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "bad_request", message: "알 수 없는 이벤트" } }, { status: 400 });
  }
  const { error } = await admin().rpc("bump_event", { d: kstVoteDate(), n: parsed.data.name });
  if (error) {
    return NextResponse.json({ error: { code: "db", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
