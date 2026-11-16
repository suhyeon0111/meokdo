import type { Kakao, KakaoPlaceResult } from "@/types/kakao";

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  distance: number; // m
  url: string;
};

/**
 * 메뉴 키워드로 현재 좌표 근처 가게를 거리순 검색 (카카오 JS SDK, 실시간).
 * ⚠️ 결과는 화면 표시용 — 저장/전송하지 않는다 (기획서 원칙 3).
 * 좌표는 이 호출에만 쓰고 서버로 보내지 않는다.
 */
export function searchNearby(
  kakao: Kakao,
  keyword: string,
  lat: number,
  lng: number,
  radius = 1200,
): Promise<NearbyPlace[]> {
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    places.keywordSearch(
      keyword,
      (data: KakaoPlaceResult[], status: string) => {
        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }
        if (status !== kakao.maps.services.Status.OK) {
          reject(new Error("가게 검색 실패"));
          return;
        }
        resolve(
          data.map((d) => ({
            id: d.id,
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            distance: Number(d.distance) || 0,
            url: d.place_url,
          })),
        );
      },
      {
        location: new kakao.maps.LatLng(lat, lng),
        radius,
        sort: kakao.maps.services.SortBy.DISTANCE,
        size: 15,
      },
    );
  });
}
