# meokdo 개발 일정표 (SCHEDULE)

작성 2026-10-27 · 1인 · 주 20h · **총 15 작업일 ≈ 58h**(축소안 A 기준, PLAN §4)

- 하루 ≈ 4h 기준. 숫자는 추정 시간, 범위는 불확실.
- 추정·근거는 PLAN.md, 설계는 SPEC.md, 미결정은 DECISIONS.md.
- 각 날짜 DoD(완료 조건)는 **동작으로 확인 가능한 문장**. 체크박스로 추적.
- 축소안 A 적용: `nearby`·사진 순서변경·2026-07 패치(타깃 밖이면 보류)·재판정 자동화는 **베타 이후**.

---

## Week 1 — "지도가 칠해진다" (≈20h)

### Day 1 (4h) · 셋업 + 카카오 검색 프록시 [S]
- [ ] Next 16 + TS + ESLint/Prettier, 레포 스캐폴딩
- [ ] Supabase 프로젝트 생성, env 배선(`.env.local`, Vercel env)
- [ ] 카카오 개발자 앱(로컬 REST 검색용) 등록, `KAKAO_REST_KEY` 서버 전용
- [ ] `GET /api/places/search` 프록시 초안
- [ ] Vercel 1회 배포
- **DoD**: Vercel URL에 빈 홈이 뜬다. "강남 파스타" 검색 시 후보(이름·주소·좌표)가 서버 프록시로 반환된다. 카카오 "첫 활성 앱" 여부를 DECISIONS #3에 기록했다.

### Day 2 (6h) · ⚠️위험(a) 폴리곤 렌더 성능 [A1·A2 일부]
- [ ] SGIS 시군구 경계(2025-06-30) 다운로드 → WGS84 변환
- [ ] mapshaper로 화면용 GeoJSON 생성(simplify/quantize)
- [ ] MapLibre에 polygon choropleth 렌더(배경 타일 없이), 모바일 FPS·파일크기 측정
- **DoD**: 전국 시군구가 모바일에서 끊김 없이 색칠·팬/줌된다. 화면용 gzip 크기를 SPEC §7 목표(≤500KB)와 비교 기록. 초과 시 완화안 1줄 결정.

### Day 3 (6h) · ⚠️위험(b) 판정 정확도 [A3·A1 패치]
- [ ] 판정용 GeoJSON + Turf bbox prefilter 판정 함수
- [ ] 2026-07 개편(인천 2군·9구, 전남광주통합특별시) 수동 패치 — **타깃에 포함될 때만, 아니면 보류**
- [ ] 테스트 좌표 50개(경계·일반구·개편영역) 수집 → `region.test.ts`
- **DoD**: 50개 중 오판정 0건(또는 원인이 데이터 자체임을 규명). 일반구가 구 단위로 갈린다. (패치 시) 개편 영역이 2026-07 기준으로 판정된다.

### Day 4 (4h) · 인증 [B1]
- [ ] @supabase/ssr 서버/클라 클라이언트, `middleware.ts` 세션 갱신·가드
- [ ] 카카오 OAuth(Supabase provider) 로그인/로그아웃, `/auth/callback`
- **DoD**: 비로그인 상태로 보호 경로 접근 시 `/login`으로 간다. 카카오로 로그인하면 홈으로 돌아오고 세션이 유지된다.

### Day 5 (4h) · 집계·색칠 연동 [C2]
- [ ] 마이그레이션(profiles/records/record_photos/events/regions, RLS, `v_region_counts`, `region_stage`)
- [ ] `toStage`/`STAGE_COLORS` 상수, 뷰 → MapLibre feature-state 색칠 연결
- [ ] 시드 데이터로 색칠 확인
- **DoD**: 시드 기록을 넣으면 해당 시군구가 단계 색으로 칠해지고, 기록을 늘리면 색이 진해진다. (Week 1 데모 완료)

---

## Week 2 — "기록을 쌓는다" (≈24h)

### Day 6 (4h) · 가게 검색 UI + 상호명 확정 [B2]
- [ ] 검색 입력 → `/api/places/search` 후보 리스트 UI
- [ ] 후보 선택 시 **상호명 자동완성(편집 가능) + 좌표·place_id는 폼 상태로만 보유**
- **DoD**: 검색→선택하면 상호명 칸이 채워지고 사용자가 수정할 수 있다. 좌표·주소는 화면 어디에도 저장되지 않는다(네트워크 탭으로 확인).

### Day 7 (5h) · 기록 저장 [B3 1/2]
- [ ] `POST /api/records`: zod 검증 → Turf 판정(좌표 폐기) → insert → 이벤트
- [ ] 저장 폼(별점 1~5, 메모, 메뉴, 방문일 기본 오늘)
- **DoD**: 필수값(상호명·별점·메모) 검증이 걸리고, 저장하면 레코드에 region_code·boundary_version이 채워지며 좌표는 DB에 없다. 지도 색이 즉시 반영된다.

### Day 8 (5h) · 재방문 수정 + 유일제약 [B3 2/2]
- [ ] `records_user_place_uq` 충돌 409 → 기존 기록 수정 화면 유도
- [ ] `PATCH /api/records/[id]`, 수정 폼
- **DoD**: 같은 가게(같은 place_id)를 다시 선택하면 새로 만들지 않고 기존 기록 수정으로 간다. 수정이 저장된다.

### Day 9 (5h) · 사진 업로드 [B4 1/2]
- [ ] browser-image-compression로 긴 변 1280 리사이즈 + EXIF 제거
- [ ] Supabase Storage 업로드(`{uid}/...`), `record_photos` 연결, signedUrl 표시
- **DoD**: 사진을 고르면 리사이즈·메타 제거 후 업로드되고, 상세에서 보인다. 5장 초과가 막힌다.

### Day 10 (4h) · 사진 삭제 + 상세 화면 [B4 2/2·C1]
- [ ] 사진 삭제(행+storage), (순서변경은 축소안 A에서 제외)
- [ ] 기록 상세 `/record/[id]`, 칸 상세 `/region/[code]`(기록 목록)
- **DoD**: 사진 삭제가 storage까지 반영된다. 칸을 탭하면 그 시군구의 내 기록 목록이, 항목을 탭하면 기록 상세가 보인다. (Week 2 데모 완료)

---

## Week 3 — "처음 쓰는 사람이 완주한다" (≈14h)

### Day 11 (4h) · 온보딩 [C3]
- [ ] 내 동네 고르기 → 첫 기록 → 첫 색칠 (축소안 A: 모달 1~2단계)
- [ ] `profiles.home_region_code`, `onboarding_done`
- **DoD**: 신규 계정이 온보딩을 끊김 없이 완주하고, 끝나면 첫 색칠된 지도를 본다.

### Day 12 (3h) · 이벤트 계측 [C4]
- [ ] onboarding_start/complete, record_start(클라) / record_save, first_record_save, stage_up(서버)
- **DoD**: 온보딩·첫 기록·단계 상승 시 `events` 테이블에 해당 이벤트가 props와 함께 적재된다.

### Day 13 (4h) · 약관/개인정보 + 탈퇴 [D1]
- [ ] `/privacy`, `/terms` 페이지
- [ ] `POST /api/account/delete`(service_role): records·photos·storage·auth user 삭제
- **DoD**: 탈퇴를 실행하면 해당 사용자의 기록·사진·스토리지·계정이 모두 사라진다(다른 사용자 데이터는 무사).

### Day 14 (4h) · 테스트 [D2]
- [ ] `region.test.ts`(50좌표), `stage.test.ts`(경계값), RLS 교차 접근 차단(토큰 2개)
- **DoD**: 세 테스트가 통과한다. 다른 user_id의 행을 읽거나 쓰려는 시도가 RLS로 막힌다.

### Day 15 (4h) · 폴리싱·배포 점검 [D3]
- [ ] 모바일 첫 로드(LCP) 측정, 에러 상태·빈 상태 UI, 프로덕션 env 점검
- [ ] 베타 배포, 스레드 공개용 링크 확인
- **DoD**: 프로덕션에서 신규 가입→온보딩→기록→색칠→탈퇴 전 과정이 모바일에서 동작한다. (베타 공개 가능)

---

## 버퍼 / 다음 (베타 지표 확인 후)
- 경계 2026-07 전국 패치(타깃 밖이면 보류했던 것), `nearby` 현재위치 검색, 사진 순서변경, 썸네일, 재판정 자동화
- Should: 색칠 애니메이션, 광역별 진행률, 단골집 빠른 입력, 기간 필터, 스탬프/질감, 개별 가게 마커(좌표 저장 정책 재검토 필요)
