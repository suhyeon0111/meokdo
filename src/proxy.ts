import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산·이미지·공개 데이터 파일(.geojson/.json 등) 제외한 모든 경로.
     * public/ 아래 정적 파일(예: /boundaries/*.geojson)은 가드 대상에서 빼야
     * 클라이언트 fetch 가 /login 으로 리다이렉트되지 않는다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|geojson|txt|xml|woff2?)$).*)",
  ],
};
