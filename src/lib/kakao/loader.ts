import type { Kakao } from "@/types/kakao";

/**
 * 카카오 Maps JS SDK(services 포함)를 1회 로드한다. 클라이언트 전용.
 * JS 키는 NEXT_PUBLIC_KAKAO_JS_KEY, 등록된 도메인에서만 동작한다.
 */
let promise: Promise<Kakao> | null = null;

export function loadKakao(): Promise<Kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadKakao는 브라우저에서만 호출"));
  }
  if (promise) return promise;

  promise = new Promise<Kakao>((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key || key === "placeholder-kakao-js-key") {
      reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY 미설정"));
      return;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () =>
      reject(new Error("카카오 SDK 로드 실패 — 콘솔에 도메인 등록 여부 확인"));
    document.head.appendChild(script);
  });

  return promise;
}
