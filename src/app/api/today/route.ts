import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { kstVoteDate } from "@/lib/today";

export const revalidate = 30; // 30s 캐시 (가정)

type Row = { menu_type: string; cnt: number };

function pack(rows: Row[]) {
  const total = rows.reduce((s, r) => s + Number(r.cnt), 0);
  const top3 = rows
    .slice()
    .sort((a, b) => Number(b.cnt) - Number(a.cnt))
    .slice(0, 3)
    .map((r) => ({ menu_type: r.menu_type, count: Number(r.cnt) }));
  return { total, top3 };
}

export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region");
  if (!region || !/^\d{4,10}$/.test(region)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "region 파라미터 필요" } },
      { status: 400 },
    );
  }
  const d = kstVoteDate();
  const sb = admin();

  // 1) 내 칸
  const { data: regionRows, error } = await sb.rpc("top_menus", { d, r: region });
  if (error) {
    return NextResponse.json({ error: { code: "db", message: error.message } }, { status: 500 });
  }
  let packed = pack((regionRows ?? []) as Row[]);
  if (packed.total >= 5) {
    return NextResponse.json({ scope: "region", ...packed });
  }

  // 2) 시도 (코드 앞 2자리)
  const sido = region.slice(0, 2);
  const { data: sidoRows } = await sb.rpc("top_menus_prefix", { d, p: sido });
  packed = pack((sidoRows ?? []) as Row[]);
  if (packed.total >= 5) {
    return NextResponse.json({ scope: "sido", ...packed });
  }

  // 3) 전국
  const { data: natRows } = await sb.rpc("top_menus_prefix", { d, p: "" });
  packed = pack((natRows ?? []) as Row[]);
  return NextResponse.json({ scope: "nation", ...packed });
}
