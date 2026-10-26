# meokdo 개발 스펙 (SPEC)

작성일 2026-10-24 · **최종 개정 2026-10-26 (아키텍처 확정)** · 대상 MVP 2~3주 · 1인 개발

## 아키텍처 한 줄 요약 (확정)
- **지도**: 카카오 타일 안 씀. 우리 **시군구 GeoJSON 폴리곤을 색칠**(MapLibre GL). 줌아웃=칸 색칠, 줌인=더 촘촘한 칸. **개별 가게 마커 없음**(좌표 미저장 — 아래 이유).
- **가게 찾기**: 카카오 로컬 **키워드 검색을 실시간 프록시**로만 사용. 응답은 화면에만 쓰고 **저장하지 않음**.
- **상호명**: **사용자 입력 필드**(검색 결과로 자동완성하되 사용자가 수정·확정 → 사용자 콘텐츠). → DB에 들어가는 카카오 출처 필드 0개.
- **칸 판정**: 선택한 좌표로 서버에서 Turf 판정 → **region_code만 저장, 좌표는 버림**(저장 X).
- 근거·대안은 DECISIONS #6 참조.

---

## 0. 확정 스택 · 버전

| 라이브러리 | 확인 버전 (npm, 2026-10-26) | 용도 |
|---|---|---|
| next | 16.4.3 | App Router |
| react / react-dom | 19.3.1 | |
| typescript | 최신 | |
| @supabase/ssr | 0.12.7 | 쿠키 기반 세션(SSR 공식 권장). `auth-helpers`는 폐기됨 |
| @supabase/supabase-js | 2.118.0 | |
| maplibre-gl | 6.16.0 | **지도 렌더(기본)** — 베이스맵 타일 없이 GeoJSON 폴리곤 choropleth. 키·쿼터 없음 |
| @turf/boolean-point-in-polygon | 7.4.0 | 칸 판정(저장 시 1회) |
| mapshaper | 0.7.98 | 경계 단순화 CLI(빌드 타임) |
| proj4 | 2.22.0 | 경계 좌표계 변환(필요 시) |
| zod | 4.6.7 | Route Handler 입력 검증 |
| browser-image-compression | 2.0.2 | 클라 사진 리사이즈(긴 변 1280) + EXIF 제거(재인코딩) |

- 대안 렌더러: Leaflet 1.9.4 (GeoJSON 레이어, 더 단순하나 대용량 폴리곤·data-driven 색칠은 MapLibre가 유리). **MapLibre 채택**.
- 카카오: **로컬 REST 키워드 검색 1종만** 사용(실시간 프록시). 지도 JS SDK·타일 미사용. REST 키는 서버 env(`KAKAO_REST_KEY`)에서만, 브라우저 노출 금지.
- 배포: Vercel **(가정)**. Route Handler = Vercel Functions(Node 런타임).
- 경계 데이터: SGIS 시군구 경계(2025-06-30 기준본) + **2026-07 개편(인천 2군·9구, 전남광주통합특별시) 수동 패치**(DECISIONS #1·#3, 베타 전 1회).

---

## 1. 화면 목록 · 라우트 구조 (App Router)

원칙: 데이터 패칭·인증 가드는 서버 컴포넌트(RSC), 지도/폼/업로드 등 상호작용은 클라이언트 컴포넌트(`"use client"`). MapLibre·Turf(클라 미사용)·canvas 리사이즈는 클라이언트에서만.

| 라우트 | 유형 | 설명 |
|---|---|---|
| `/` | RSC 셸 + 클라 `<MapView>` | 지도 홈. 시군구 choropleth. 칸 집계는 서버 prefetch 후 클라 전달 |
| `/login` | 클라이언트 | 로그인(카카오 OAuth 추천, DECISIONS #4) |
| `/auth/callback` | Route Handler | OAuth code → 세션 교환(@supabase/ssr) |
| `/onboarding` | 클라 위저드 | 내 동네 고르기 → 첫 기록 → 첫 색칠 |
| `/record/new` | 클라 폼 | 가게 찾기(카카오 키워드 검색) → **상호명 확정(사용자)** → 기록 작성 |
| `/record/[id]` | RSC + 클라 뷰 | 기록 상세(사진 포함) |
| `/record/[id]/edit` | 클라 폼 | 기록 수정(가게당 1개 규칙상 재방문=수정) |
| `/region/[code]` | RSC | 칸 상세: 해당 시군구의 내 기록 목록 |
| `/settings` | RSC + 서버 액션 | 프로필, 로그아웃, 탈퇴 |
| `/privacy`, `/terms` | RSC(정적) | 개인정보처리방침 · 이용약관 |

- 인증 가드: `middleware.ts`에서 @supabase/ssr로 세션 갱신 + 비로그인 시 `/login`. 공개 경로: `/login`, `/privacy`, `/terms`, `/auth/*`.
- 번들 분리: `<MapView>`와 화면용 GeoJSON은 `next/dynamic`(ssr:false)로 지연 로드.

---

## 2. 데이터 모델 (Supabase / Postgres)

마이그레이션 SQL 수준. 모든 사용자 테이블 RLS, 본인 행만. **좌표·주소·카카오 상호명은 저장하지 않는다**(DECISIONS #6).

### 2.1 테이블

```sql
-- 프로필
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  home_region_code text,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 기록 (가게 1개당 1행)
create table records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_name text not null                      -- ★ 사용자 입력(검색 자동완성 가능, 사용자 콘텐츠)
    check (char_length(place_name) between 1 and 60),
  region_code text not null,                    -- Turf 판정 결과(우리 데이터)
  boundary_version date not null,               -- 판정에 쓴 경계 기준일
  kakao_place_id text,                          -- (선택) 카카오 place id — 약관상 저장 허용. 중복감지·딥링크용
  kakao_url text,                               -- (선택) 카카오맵 장소 URL — 저장 허용
  rating smallint not null check (rating between 1 and 5),
  memo text not null check (char_length(memo) between 1 and 200),  -- 한 줄 메모 상한 200자(가정)
  menu text,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 가게당 1기록: 검색으로 고른 경우 place_id로 유일 보장(MVP는 검색 선택 필수)
create unique index records_user_place_uq
  on records(user_id, kakao_place_id) where kakao_place_id is not null;
create index records_user_region_idx on records(user_id, region_code);

-- 사진 (기록당 0~5장)
create table record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index record_photos_record_idx on record_photos(record_id, sort_order);

-- 이벤트 계측
create table events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_name_created_idx on events(name, created_at);

-- 경계 메타(참조용, 공개 읽기)
create table regions (
  code text primary key,               -- 시군구 코드
  name text not null,                  -- 예: "장안구"
  full_name text not null,             -- 예: "수원시 장안구"
  sido_code text not null,
  sido_name text not null,
  has_gu boolean not null default false,
  boundary_version date not null
);
```

> **좌표 미저장의 결과(의도된 제약)**: ① 지도에 개별 가게 마커를 못 찍는다 → MVP는 **시군구 choropleth만**. ② 경계가 바뀌어도 저장된 기록을 **자동 재판정 불가**(좌표가 없음). → 경계 수동 패치는 **베타 전에 완료**해 `boundary_version`을 베타 기간 고정. 이후 경계 변경 시엔 기록이 옛 판정을 유지(또는 사용자가 재저장). DECISIONS #6.

### 2.2 트리거 / 함수

```sql
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger records_touch before update on records
  for each row execute function touch_updated_at();

-- 사진 5장 제한(서버 측 2차 방어)
create function enforce_photo_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from record_photos where record_id = new.record_id) >= 5 then
    raise exception 'photo limit (5) exceeded for record %', new.record_id;
  end if;
  return new;
end $$;
create trigger record_photos_limit before insert on record_photos
  for each row execute function enforce_photo_limit();

-- 단계 변환(SQL, 상수 미러 — stage_up 이벤트용)
create function region_stage(cnt int) returns int language sql immutable as $$
  select case
    when cnt = 0 then 0 when cnt <= 5 then 1 when cnt <= 10 then 2
    when cnt <= 15 then 3 when cnt <= 20 then 4 else 5 end
$$;
```

### 2.3 RLS 정책

```sql
alter table profiles      enable row level security;
alter table records       enable row level security;
alter table record_photos enable row level security;
alter table events        enable row level security;
alter table regions       enable row level security;

create policy own_profiles on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_records on records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_photos on record_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_events_insert on events
  for insert with check (user_id = auth.uid());
create policy own_events_select on events
  for select using (user_id = auth.uid());
-- regions: 모든 로그인 사용자 읽기 전용(쓰기는 service_role)
create policy regions_read on regions for select using (true);
```

- Storage 버킷 `record-photos`(비공개). 경로 접두사 `{{uid}}/...` 소유자만 CRUD.
```sql
create policy photos_own on storage.objects for all
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```
- 읽기: `createSignedUrl`(수 분 만료) **(가정)**. 공개 버킷 미사용.

### 2.4 집계 뷰 (색칠용)

```sql
-- 가게당 1기록이므로 region별 기록 수 = 서로 다른 가게 수
create view v_region_counts with (security_invoker = true) as
  select user_id, region_code, count(*)::int as store_count
  from records
  group by user_id, region_code;
```
- 클라/서버: `select region_code, store_count from v_region_counts where user_id = auth.uid()`. 단계 변환은 공유 상수(`toStage`, §5)로.

---

## 3. Route Handler 목록

공통 에러 규약: `{{ error: { code, message }}}` + HTTP 코드(400 검증, 401 비로그인, 404, 409 중복, 422 처리불가, 429 카카오 쿼터, 502 카카오 실패, 500).

| 경로 / 메서드 | 입력 | 출력 | 카카오 호출 | 에러 처리 |
|---|---|---|---|---|
| `GET /auth/callback` | `?code` | 리다이렉트 | 없음 | 실패 시 `/login?error` |
| `GET /api/places/search` | `q`, `lat?`, `lng?`, `page?` | 후보[] `{{name, address, lat, lng, kakao_place_id, kakao_url}}` (**화면 표시용, 서버 미저장**) | **예**(`/v2/local/search/keyword`, `category_group_code=FD6`) | `q` 2자 미만 400, 502 passthrough, 빈 결과 200 |
| `GET /api/places/nearby` | `lat`, `lng`, `radius?` | 후보[] (동일, 미저장) | 예(`category?category_group_code=FD6&x&y&radius`) | 좌표 누락 400. **MVP 축소 대상(Should)** |
| `POST /api/records` | `place_name`(사용자), `lat`,`lng`(선택 후보의 좌표, **판정용**), `kakao_place_id?`,`kakao_url?`, rating, memo, menu?, visited_on?, photoPaths[]? | 생성된 record | 없음 | 검증 400, `records_user_place_uq` 위반 409(수정 유도), 좌표로 판정 실패 422 |
| `PATCH /api/records/[id]` | 부분 필드(place_id 불변 권장) | 수정된 record | 없음 | 404/403 |
| `DELETE /api/records/[id]` | - | 204 | 없음 | 사진 storage도 함께 삭제 |
| `POST /api/account/delete` | - | 204 | 없음 | service_role로 데이터+storage+auth user 삭제 |

- `POST /api/records` 내부 순서: 인증 → zod 검증 → **좌표로 Turf 판정 → region_code·boundary_version 산출, 좌표는 버림(저장 X)** → insert(유일 위반 409) → 사진 행 연결 → 이벤트 적재(record_save, 조건부 first_record_save, stage_up).
- `/api/places/search`는 **유일한 외부(카카오) 호출**. 응답을 서버 DB에 쓰지 않는다(약관). 클라가 받은 좌표는 저장용 `POST`로 되돌아오지만 서버는 판정에만 쓰고 폐기.
- 이벤트: 클라 발생분(onboarding_start, record_start)은 `supabase.from('events').insert`(RLS 보호). 서버만 아는 것(first_record_save, stage_up)은 `POST /api/records` 내부.

---

## 4. 칸 판정 설계 (핵심 로직)

판정은 **기록 저장 시 1회** 서버에서 좌표로 수행하고 `region_code` + `boundary_version`만 저장한다. 좌표는 저장하지 않는다. 조회 시 재판정 없음(색칠=단순 집계).

### 4.1 경계 데이터 전처리 절차
1. SGIS 시군구 경계 원본(2025-06-30 기준, SHP/GeoJSON) 다운로드.
2. 좌표계 WGS84(EPSG:4326)로 변환(proj4/mapshaper).
3. **2026-07 개편 수동 패치**(확인됨, SGIS 미반영): 인천 2군·9구(제물포·영종·검단 신설 등), 전남광주통합특별시 경계·코드 반영. (DECISIONS #1·#3, +4~8h)
4. 일반구 **구 단위 분할 유지**(DECISIONS #2). `regions.has_gu=true`, `full_name`에 "시 구" 병기.
5. mapshaper 두 산출물:
   - **판정용**: `-simplify 20% keep-shapes` 수준 **(가정)**. 정확도 우선. 서버(Route Handler) 번들 동봉.
   - **화면용**: `-simplify 4% keep-shapes -quantize` 수준 **(가정)**. §7 크기 목표까지 조정.
6. `region_code`를 두 산출물·`regions`에서 동일 키로. `boundary_version`(예: `2026-07-01`) 기록.

### 4.2 판정용 / 화면용 분리
- 판정용 GeoJSON: `src/lib/boundaries/judge.geojson`(함수 번들). **bbox prefilter**(flatbush 또는 bbox 배열) 후 후보 폴리곤만 `booleanPointInPolygon`. 모듈 스코프 1회 로드(람다 인스턴스 재사용) → 저장 1건당 수 ms.
- 화면용 GeoJSON: `/public` 또는 CDN 정적 자산. MapLibre `source`로 로드, `fill-color`는 feature-state(region→stage) 데이터 기반 표현식.

### 4.3 boundary_version 관리 · 재판정
- 경계 패치본은 **베타 시작 전 확정** → 베타 중 `boundary_version` 고정.
- ⚠️ 좌표 미저장이라 **기존 기록 자동 재판정 불가**. 베타 후 경계 변경이 필요하면: (a) 기록은 옛 판정 유지(허용), (b) 해당 지역 사용자에게 재저장 유도 — 중 택. MVP·베타 범위 밖.

### 4.4 테스트 (핵심 로직만)
- `region.test.ts`: 경계·일반구 + **인천·전남광주 개편 영역** 테스트 좌표 50개(정답 라벨). PLAN 위험검증(b).
- `stage.test.ts`: `toStage` 경계값(0,1,5,6,10,11,15,16,20,21).
- RLS: 다른 user_id 행 read/write 차단(토큰 2개 통합 테스트).

---

## 5. 색칠 집계 · 단계 상수

```ts
// src/lib/constants.ts  (클라·서버·SQL region_stage() 미러)
export const STAGE_THRESHOLDS = [0, 5, 10, 15, 20] as const;
// store_count -> stage: 0 / 1~5 / 6~10 / 11~15 / 16~20 / 21+
export function toStage(count: number): 0|1|2|3|4|5 {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  if (count <= 20) return 4;
  return 5;
}
export const STAGE_COLORS = ['#00000000','#ffe0b2','#ffb74d','#ff9800','#f57c00','#e65100']; // 가정, 디자인 시 조정
```
- 색칠: `v_region_counts`에서 `{{region_code: store_count}}` → MapLibre feature-state로 각 폴리곤에 `toStage` 색 적용. 0(미방문)=투명.

---

## 6. 이벤트 목록

| 이름 | 발생 시점 | props | 적재 |
|---|---|---|---|
| `onboarding_start` | 온보딩 진입 | `{{}}` | 클라 |
| `onboarding_complete` | 첫 색칠 노출 | `{{ region_code }}` | 클라 |
| `record_start` | 기록 작성 진입 | `{{ source: 'search'|'nearby'|'onboarding' }}` | 클라 |
| `record_save` | 저장 성공 | `{{ record_id, region_code, rating, is_new }}` | 서버 |
| `first_record_save` | 최초 기록 | `{{ record_id, region_code }}` | 서버(records count==1) |
| `stage_up` | 저장 후 칸 단계 상승 | `{{ region_code, from, to }}` | 서버(저장 전후 region_stage 비교) |

- 전부 `events` 테이블. 분석은 Supabase SQL 수동(별도 툴 미도입).

---

## 7. 성능 기준 (가정)

| 항목 | 목표 | 방법 |
|---|---|---|
| 모바일 첫 로드(LCP) | 3초 이내 **(가정)** | 지도·경계 지연 로드, RSC 스트리밍 |
| 화면용 경계 파일 | gzip ≤ 500KB(목표), 상한 800KB **(가정)** | mapshaper simplify/quantize. 초과 시 뷰포트 로딩/줌별 분할 |
| 사진 업로드 | 긴 변 1280px, EXIF 제거 | browser-image-compression 재인코딩 |
| 칸 판정 응답 | p95 ≤ 300ms **(가정)** | bbox prefilter + 모듈 캐시 |

> 경계 파일이 목표 초과 시: "뷰포트 안 시군구만 로딩" 또는 "광역 줌에서 광역 단위 집계"로 완화(Should).
