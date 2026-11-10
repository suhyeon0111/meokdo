import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { kstVoteDate } from "@/lib/today";

// DB를 매 요청 조회하므로 동적. 빌드 타임 프리렌더 금지(그때 DB env 없음).
export const dynamic = "force-dynamic";

const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" };

export async function GET() {
  const d = kstVoteDate();
  const sb = admin();
  const { data, error } = await sb.rpc("map_today", { d });
  if (error) {
    return NextResponse.json({ error: { code: "db", message: error.message } }, { status: 500 });
  }
  const cells = (data ?? []).map((row: { region_code: string; top_menu: string; total: number; tie: boolean }) => ({
    region_code: row.region_code,
    top_menu: row.top_menu,
    count: Number(row.total),
    tie: row.tie,
  }));
  return NextResponse.json({ vote_date: d, cells }, { headers: CACHE });
}
