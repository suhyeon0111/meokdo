// 카카오 Maps JS SDK는 공식 npm 타입이 없어, 우리가 쓰는 범위만 최소 선언한다.

export interface KakaoRegionResult {
  region_type: "B" | "H"; // B=법정동, H=행정동
  code: string; // 10자리 법정동/행정동 코드 (앞 2=시도, 앞 5=시군구)
  region_1depth_name: string; // 시도
  region_2depth_name: string; // 시군구
  region_3depth_name: string; // 읍면동
  x: number;
  y: number;
}

export interface KakaoPlaceResult {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
  category_name: string;
  distance: string;
}

export interface KakaoGeocoder {
  coord2RegionCode(
    lng: number,
    lat: number,
    callback: (result: KakaoRegionResult[], status: string) => void,
  ): void;
}

export interface KakaoPlaces {
  keywordSearch(
    keyword: string,
    callback: (data: KakaoPlaceResult[], status: string) => void,
    options?: Record<string, unknown>,
  ): void;
}

export interface KakaoMaps {
  load(callback: () => void): void;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Places: new () => KakaoPlaces;
    Status: { OK: string; ZERO_RESULT: string; ERROR: string };
  };
}

export interface Kakao {
  maps: KakaoMaps;
}

declare global {
  interface Window {
    kakao: Kakao;
  }
}
