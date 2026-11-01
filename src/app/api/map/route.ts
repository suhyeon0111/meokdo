import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { kstVoteDate } from "@/lib/today";

export const revalidate = 30; // 30s 캐시 (가정)

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
  return NextResponse.json({ vote_date: d, cells });
}
