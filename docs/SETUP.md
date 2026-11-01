# 세팅 가이드 (처음 하는 사람용)

로컬에서 돌리는 데 필요한 건 **계정 2개(Supabase, 카카오)뿐**이다. 순서대로 하면 된다.
(Upstash·Vercel은 나중 단계라 마지막에 설명.)

---

## 0. 미리 확인
터미널에서:
```bash
node -v   # v20 이상이면 OK
cd /Users/isuhyeon/orca/meokdo
npm install
```

---

## 1. Supabase (DB) — 약 5분

1. https://supabase.com 가입 → **New project** 생성(이름 아무거나, 리전은 `Northeast Asia (Seoul)` 권장, DB 비밀번호는 아무거나 정하고 기록).
2. 프로젝트 열리면 왼쪽 아래 **Project Settings(톱니) → API** 메뉴로 간다.
3. 두 값을 복사한다:
   - **Project URL** (`https://xxxx.supabase.co`) → `.env.local` 의 `SUPABASE_URL`
   - **service_role** 키 (secret 이라고 표시됨, `eyJ...` 또는 `sb_secret_...`) → `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ service_role 은 비밀 키다. 절대 깃에 올리거나 남에게 보내지 말 것(이미 `.gitignore` 처리됨).
4. 왼쪽 **SQL Editor → New query** 에 레포의 `supabase/migrations/0001_init.sql` **내용 전체를 붙여넣고 Run**.
   → 표 `vote_counts`, `event_counts` 와 함수들이 생긴다. (Table Editor 에서 확인 가능)

---

## 2. 카카오 (가게 검색·칸 판정) — 약 5분

1. https://developers.kakao.com 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**.
   - ⚠️ 무료 쿼터는 **계정에서 처음 활성화한 앱 1개**에만 준다. 다른 앱을 이미 쓰고 있으면 이 서비스용으로 새 계정을 쓰는 게 안전(DECISIONS #1).
2. 만든 앱 → **앱 키** 에서 **JavaScript 키** 복사 → `.env.local` 의 `NEXT_PUBLIC_KAKAO_JS_KEY`.
   - (REST 키 아님. 지도는 브라우저에서 JS SDK 로 쓴다.)
3. **플랫폼 → Web** 에 사이트 도메인 등록:
   - 로컬: `http://localhost:3000`
   - 배포 후: `https://내도메인` (Vercel 주소)
   - ⚠️ 등록 안 한 도메인에선 카카오 지도가 동작하지 않는다.
4. (지도/로컬 API 사용 설정이 따로 있으면 켠다 — 콘솔 안내에 따라.)

---

## 3. `.env.local` 채우기
레포 루트의 `.env.local` 을 열어 placeholder 를 실제 값으로 바꾼다. 형식은 `.env.local.example` 참고:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role)
NEXT_PUBLIC_KAKAO_JS_KEY=카카오 JavaScript 키
UPSTASH_REDIS_REST_URL=       # 아직 비워도 됨
UPSTASH_REDIS_REST_TOKEN=     # 아직 비워도 됨
```

---

## 4. 실행
```bash
npm run dev
```
→ 브라우저에서 `http://localhost:3000` 열기.

### 잘 됐는지 확인(터미널에서, 서버 켠 상태로)
```bash
# 검증 에러가 나야 정상(= 핸들러 동작)
curl "http://localhost:3000/api/today"            # 400 (region 필요)

# 실제 투표 1표 (Supabase 연결됐으면 ok:true)
curl -X POST http://localhost:3000/api/vote \
  -H 'content-type: application/json' \
  -d '{"region_code":"11680","menu_type":"korean","visit_bucket":"first"}'
# → {"ok":true,"region_menu_count":1}  이면 DB 연결 성공
```
Supabase **Table Editor → vote_counts** 에 행이 1개 생겼으면 끝.

---

## 5. (나중) Upstash 레이트리밋 — Day 8
도배 방지용. 지금은 인메모리 스텁이라 없어도 로컬은 돈다.
1. https://upstash.com 가입 → **Redis** DB 생성(리전 가까운 곳).
2. **REST API** 섹션의 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 복사 → `.env.local`.

## 6. (나중) Vercel 배포 — 출시 전
1. https://vercel.com 가입 → GitHub 레포 `suhyeon0111/meokdo` import.
2. **Settings → Environment Variables** 에 `.env.local` 의 값 4개(+Upstash 2개)를 그대로 등록.
3. 배포되면 생긴 도메인을 **카카오 콘솔 플랫폼 Web 에 추가**(2-3번).

---

## 자주 겪는 문제
- **카카오 지도가 안 떠요** → 콘솔에 현재 도메인(`localhost:3000`) 등록했는지, JS 키가 맞는지 확인.
- **`/api/vote` 가 500** → `SUPABASE_URL`/`service_role` 오타, 또는 1-4(마이그레이션) 실행 안 함.
- **포트가 3000이 아니에요** → 3000이 쓰이는 중이면 Next 가 3001로 띄운다. 터미널 로그의 `Local:` 주소를 보면 됨.
