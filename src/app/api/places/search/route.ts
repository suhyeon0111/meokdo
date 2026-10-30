import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET /api/places/search — 카카오 로컬 키워드 검색 프록시 (실시간).
 * ⚠️ 약관: 응답을 DB에 저장하지 않는다. 이 핸들러는 화면 표시용 데이터만 반환한다.
 *   저장 시에는 상호명을 사용자 입력으로 확정하고, 좌표는 판정 후 폐기한다(SPEC §3·§4, DECISIONS #6).
 */

const querySchema = z.object({
  q: z.string().trim().min(2, "검색어는 2자 이상"),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).max(45).optional(),
});

export type PlaceCandidate = {
  name: string;
  address: string;
  category: string | null;
  lat: number;
  lng: number;
  kakao_place_id: string;
  kakao_url: string;
};

type KakaoDoc = {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
  place_url: string;
};

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key || key === "placeholder-kakao-rest-key") {
    return NextResponse.json(
      { error: { code: "config", message: "KAKAO_REST_KEY 미설정" } },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }
  const { q, lat, lng, page } = parsed.data;

  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  kakaoUrl.searchParams.set("query", q);
  kakaoUrl.searchParams.set("category_group_code", "FD6"); // 음식점
  kakaoUrl.searchParams.set("size", "15");
  if (page) kakaoUrl.searchParams.set("page", String(page));
  if (lat != null && lng != null) {
    kakaoUrl.searchParams.set("x", String(lng));
    kakaoUrl.searchParams.set("y", String(lat));
    kakaoUrl.searchParams.set("sort", "distance");
  }

  let res: Response;
  try {
    res = await fetch(kakaoUrl, {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: { code: "upstream", message: "카카오 요청 실패" } },
      { status: 502 },
    );
  }

  if (res.status === 429) {
    return NextResponse.json(
      { error: { code: "quota", message: "카카오 쿼터 초과" } },
      { status: 429 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: { code: "upstream", message: `카카오 ${res.status}` } },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { documents: KakaoDoc[] };
  const candidates: PlaceCandidate[] = data.documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    category: d.category_name || null,
    lat: Number(d.y),
    lng: Number(d.x),
    kakao_place_id: d.id,
    kakao_url: d.place_url,
  }));

  return NextResponse.json({ candidates });
}
