import { NextResponse } from "next/server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { kstVoteDate, VISIT_BUCKETS } from "@/lib/today";
import { MENU_KEYS } from "@/lib/menus";
import { allow, ipKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  region_code: z.string().regex(/^\d{4,10}$/, "시군구 코드 형식 오류"),
  menu_type: z.enum(MENU_KEYS as [string, ...string[]]),
  visit_bucket: z.enum(VISIT_BUCKETS),
});

export async function POST(request: Request) {
  if (!allow(ipKey(request))) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "요청이 많습니다" } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_json", message: "본문 파싱 실패" } },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }
  const { region_code, menu_type, visit_bucket } = parsed.data;
  const d = kstVoteDate();

  const sb = admin();
  const { error } = await sb.rpc("bump_vote", {
    d,
    r: region_code,
    m: menu_type,
    b: visit_bucket,
  });
  if (error) {
    return NextResponse.json(
      { error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }

  // Should: 오늘 이 칸·이 메뉴 합 (결정 직후 "N명" 메시지용)
  const { data: rows } = await sb
    .from("vote_counts")
    .select("count")
    .eq("vote_date", d)
    .eq("region_code", region_code)
    .eq("menu_type", menu_type);
  const region_menu_count = (rows ?? []).reduce((s, r) => s + (r.count ?? 0), 0);

  return NextResponse.json({ ok: true, region_menu_count });
}
