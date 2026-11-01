# 오늘 점심 지도 — 개발 스펙 (SPEC)

작성 2026-11-02 · 기반: [기획서.md](./기획서.md) · 1인 · MVP 2~3주

기획서가 제품/근거의 소스다. 이 문서는 그 **엔지니어링 번역**(스키마·API 계약·클라 흐름·구현 결정)만 담는다. 중복 설명은 하지 않는다.

## 0. 원칙이 코드에 미치는 영향 (기획서 원칙 1~3)
- **로그인 없음** → 인증·세션·RLS(사용자 스코프)·개인 테이블 전부 없음.
- **개인 식별정보 서버 미저장** → 서버/DB에 좌표·IP·기기식별값 없음. 저장은 집계 카운트뿐.
- **카카오 가게 정보 미저장** → 가게 검색은 클라에서 실시간, 결과는 화면에만.

## 1. 스택 (기획서 §기술스택 확정)

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16.4.3 (App Router) + TS, Vercel | 화면 + 집계 API(Route Handler) |
| 가게 검색·칸 판정 | **카카오 Maps JS SDK (services)** — 클라이언트 | `Places.keywordSearch`(근처 가게), `Geocoder.coord2RegionCode`(좌표→시군구). JS 키는 등록 도메인에서만 |
| 점심 지도 | **d3-geo + 단순화 시군구 GeoJSON → SVG** | 카카오 타일 미사용. 캡처 쉬움. 경량 |
| 저장소 | Supabase Postgres (**auth 미사용**) | 집계 카운트만. 쓰기는 Route Handler + service_role |
| 레이트리밋 | 만료 카운터(Upstash Redis 권장, DECISIONS) | IP를 DB에 남기지 않음 |

버전(2026-11-02 npm): next 16.4.3 · react 19.3.1 · @supabase/supabase-js 2.118.0 · d3-geo(**미확인, 설치 시 확정**) · topojson-client(선택).
- 카카오 JS SDK services 한도(한 번 최대 45개, 반경 최대 20km)는 **공식 문서로 재확인**(기획서 §API, 리스크).

## 2. 데이터 모델 (Supabase Postgres)

사용자 스코프 없음. 모든 식별정보 배제. 시군구 목록·경계는 **레포 정적 파일**(DB 테이블 불필요).

```sql
-- 표 집계: (날짜, 칸, 메뉴, 방문구간) 당 한 행, count 증가
create table vote_counts (
  vote_date   date not null,          -- KST 05:00 경계 기준 "오늘"
  region_code text not null,          -- 시군구 코드
  menu_type   text not null,          -- 10종 중 하나(키)
  visit_bucket text not null,         -- 'first' | 'd2_7' | 'd8plus'
  count       integer not null default 0,
  primary key (vote_date, region_code, menu_type, visit_bucket)
);
create index vote_counts_date_region_idx on vote_counts(vote_date, region_code);

-- 단계별 이벤트 횟수만
create table event_counts (
  event_date date not null,
  name       text not null,           -- 'home_view' | 'menu_select' | 'decide' | ...
  count      integer not null default 0,
  primary key (event_date, name)
);
```

**원자적 증가 (RPC, service_role로만 호출)**
```sql
create function bump_vote(d date, r text, m text, b text)
returns void language sql as $$
  insert into vote_counts(vote_date, region_code, menu_type, visit_bucket, count)
  values (d, r, m, b, 1)
  on conflict (vote_date, region_code, menu_type, visit_bucket)
  do update set count = vote_counts.count + 1;
$$;

create function bump_event(d date, n text)
returns void language sql as $$
  insert into event_counts(event_date, name, count) values (d, n, 1)
  on conflict (event_date, name) do update set count = event_counts.count + 1;
$$;
```

**RLS (사용자 없음 → anon 전면 차단, service_role만 통과)**
```sql
alter table vote_counts  enable row level security;
alter table event_counts enable row level security;
-- 정책을 만들지 않는다 = anon/authenticated 는 읽기·쓰기 모두 거부.
-- 집계 조회(GET /api/today, /api/map)도 Route Handler에서 service_role로 수행한다.
```
> 브라우저는 DB에 직접 접근 불가. 모든 읽기/쓰기는 Route Handler 경유.

## 3. "오늘"·메뉴·색 상수

- **오늘(vote_date)**: KST 05:00~익일 05:00. 서버에서 계산 — `now()` KST 기준, 05시 이전이면 전날. `src/lib/today.ts`.
- **메뉴 10종**(기획서 §지도표현): 한식·국밥탕·면·중식·일식·양식·분식·고기구이·샐러드건강식·아시안. 각: `{ key, label, searchKeywords[], color }`. `src/lib/menus.ts`.
- **칠하기 규칙**: 칸 총표 ≥ 5일 때만 색칠. 색 = 1위 메뉴 고정색. 진하기 3단계(5~9 / 10~29 / 30+). 동률 1위 = 회색 빗금. 범례 상시. (기준값 5는 가정 — DECISIONS)
- **넘겨 보여주기**: 내 칸 <5표 → 시도 TOP3, 시도도 <5표 → 전국 TOP3. (시도 = region_code 접두 2자리, 전처리에서 확정)

## 4. Route Handler (API 계약)

공통: JSON `{ error:{code,message} }`. 외부 호출 없음(카카오는 클라). 쓰기는 service_role.

| 경로 / 메서드 | 입력 | 출력 | 처리 |
|---|---|---|---|
| `POST /api/vote` | `{ region_code, menu_type, visit_bucket }` | `{ ok, region_menu_count }` | zod 검증(코드/메뉴/구간 화이트리스트) → IP 레이트리밋 → `bump_vote(today, ...)` → (Should) 해당 칸·메뉴 오늘 합 반환 |
| `GET /api/today?region=` | region_code | `{ scope:'region'|'sido'|'nation', top3:[{menu_type,count}] }` | 칸 합계 ≥5면 region, 아니면 시도, 그것도 <5면 전국. 캐시 30~60s |
| `GET /api/map` | - | `{ vote_date, cells:[{region_code, top_menu, count, tie:boolean}] }` | 오늘, 칸별 합 ≥5만. 동률 tie=true. 캐시 30~60s |
| `POST /api/event` | `{ name }` | `{ ok }` | 화이트리스트 이벤트만 `bump_event`. 레이트리밋 가벼움 |

- 레이트리밋: IP 해시 기반 만료 카운터(Upstash). 초과 시 429. IP 원문·해시 모두 **DB 미저장**(메모리/카운터만).
- `/api/vote`·`/api/event`는 `cache: no-store`. `/api/today`·`/api/map`은 `revalidate`/`Cache-Control`로 30~60s.

## 5. 클라이언트 흐름 (카카오 JS SDK, 익명)

1. **칸 찾기**: `navigator.geolocation` → 좌표 → `Geocoder.coord2RegionCode(lng,lat)` → 시군구 코드. **좌표는 즉시 버림**(서버 전송·저장 X). 권한 거부 시 시도→시군구 직접 선택(마지막 선택 localStorage 기억).
2. **홈**: `GET /api/today?region=`로 TOP3 칩. `POST /api/event {home_view}`.
3. **메뉴 선택/룰렛**: 10종 중 택1 또는 룰렛. `POST /api/event {menu_select}`.
4. **가게 시트**: `Places.keywordSearch(menu.searchKeywords, { location, radius, sort:'distance' })` → 거리순 목록 → 가게 클릭 시 카카오맵 상세(place_url)로 이동. **결과 저장 안 함.**
5. **이걸로 결정**: localStorage로 "오늘 결정함" 확인(하루 1회) → `POST /api/vote { region_code, menu_type, visit_bucket }` → 결정 완료(Should: "오늘 OO구에서 OO 고른 사람 N명").
6. **방문 구간**: localStorage의 최초 방문일 → `first | d2_7 | d8plus` 계산해 투표에 포함. 날짜 원본은 전송 안 함.
7. **지도**: `GET /api/map` → d3-geo로 시군구 GeoJSON을 SVG path로 그리고 `top_menu` 색·3단계 진하기 적용. 칸 탭 → `GET /api/today?region=`.

## 6. 칸 경계 데이터 (레포 정적)
- 단순화 시군구 GeoJSON(d3-geo SVG용) + 시군구 목록(코드·이름·시도). `scripts/build-boundaries.mjs`로 생성(mapshaper).
- **칸 판정은 1차로 카카오 `coord2RegionCode`**. 단 기획서 리스크 #4(판정 결과 코드 저장의 약관 적합성)·#6(2026-07 개편 코드 일치)이 **미확인** → 불일치/제약 시 **공개 경계로 클라 point-in-polygon 폴백**(판정용 GeoJSON + Turf/d3). DECISIONS.
- 2026-07 개편(인천 2군·9구, 전남광주통합특별시)은 SGIS 미반영 확인됨(이전 조사) → 경계·코드 매칭을 개발 초기에 검증.

## 7. 남용 방지 (기획서 §남용방지, 3단계)
1. **브라우저**: localStorage로 결정 하루 1회. (지우면 우회 — 수용)
2. **서버**: IP별 만료 카운터로 단시간 다수 요청 차단. IP DB 미저장.
3. **집계**: 한 칸 1시간 비정상 급증 시 지도에서 보류 + 수동 확인. 기준값은 운영 데이터로. (MVP는 보류 플래그 수동 토글 수준)

## 8. 계측 (익명)
- `event_counts`: `home_view`, `menu_select`, `roulette_spin`, `decide`, `map_view`, `share_click`(Should).
- 결정 소요시간은 **클라에서 구간(30s미만/30~60s/60s+)만 계산해** event로. 원시 시간 미전송.
- 지표 산출(전환율·재방문 구간 비율 등)은 Supabase SQL 수동.

## 9. 성능 (가정)
- 모바일 홈→가게목록 1초 안팎(기획서 완료조건). 지도 SVG는 단순화 경계로 경량(목표 gzip ≤500KB).
- 카카오 호출은 **메뉴 선택 후에만**(쿼터 보호, 리스크 #3).
