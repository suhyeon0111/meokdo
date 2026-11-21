# CLAUDE.md

## 프로젝트 개요
- 서비스: 오늘 점심 메뉴를 정하면 그 선택이 모여 "오늘 우리 동네는 뭘 먹었나" 지도가 칠해지는 웹 서비스 (가칭 "오늘 점심 지도")
- 주요 사용자: 로그인 없이 들어오는 동네 방문자 (익명)
- 현재 단계: MVP (1인 개발, 3주 일정)

## 스택
- 프레임워크: Next.js 16 (App Router)
- 언어: TypeScript
- 스타일: 전역 CSS + CSS 변수 토큰 (`src/app/globals.css`). Tailwind·CSS Modules 미사용
- 상태·데이터: React 19 내장 (별도 상태 라이브러리 없음), 입력 검증은 zod
- 백엔드/API: Supabase(서버 전용 admin 클라이언트로 집계 카운트만 저장) + 카카오 Maps JS SDK(클라이언트, 저장 없음). 서버 로직은 `src/app/api`의 Route Handlers

## 폴더 구조
```
src/
  app/
    api/          Route Handlers (event, map, today, vote)
    map/          점심 지도 페이지
    page.tsx      홈
    layout.tsx    루트 레이아웃
    globals.css   전역 스타일 + CSS 변수 토큰
  components/     화면 컴포넌트 (LunchHome, LunchMap, MenuPicker, Roulette, ShopSheet)
  lib/            도메인 로직·외부 연동
    kakao/        카카오 SDK 로더·장소 검색 (loader, places)
    supabase/     Supabase admin 클라이언트
    menus.ts      메뉴 정의
    region.ts     좌표→시군구 판정
    today.ts      오늘 집계 조회
    mapColor.ts   지도 색 계산
    ratelimit.ts  레이트리밋
    track.ts      이벤트 트래킹
  types/          공통 타입 정의 (kakao.d.ts)
```

## 명령어
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 타입체크: `npm run typecheck`
- 린트: `npm run lint`
- 테스트: (설정된 테스트 없음)

## 작업 방식
- 큰 작업은 바로 구현하지 말고 먼저 계획을 제시한다. 내가 승인하면 시작한다.
- 한 번에 하나의 기능만 구현한다. 요청 범위 밖의 파일은 건드리지 않는다.
- 모호한 요구사항은 추측하지 말고 먼저 질문한다.
- 기존 코드의 패턴과 네이밍을 먼저 확인하고 그대로 따른다.

## 브랜치·작업 트리 (Git Flow)
- 작업 지시를 받으면 `develop` 브랜치에서 작업용 브랜치를 분기한다. (main이 아니라 develop 기준)
- 분기 전 `origin/develop`을 최신화한다. 브랜치 이름은 작업 성격에 맞춘다(`feat/...`, `fix/...`, `docs/...`).
- 분기한 브랜치는 `git worktree add`로 별도 작업 트리를 만들어 그 안에서 작업한다(메인 작업 트리와 섞지 않는다).
- PR은 기본적으로 `develop`을 base로 올린다. (내가 main을 지정하면 예외)
- 커밋·푸시·PR은 내가 요청할 때만 한다.

## 코딩 규칙
- TypeScript에서 `any`를 쓰지 않는다. 타입을 모르면 질문한다.
- 컴포넌트는 한 파일에 하나, 함수형 컴포넌트만 사용한다.
- 한 파일이 200줄을 넘으면 분리를 제안한다.
- 같은 로직이 두 번 나오면 훅이나 유틸로 뽑는다.
- 서버 로직(DB 접근·외부 API 호출)은 컴포넌트에 직접 쓰지 않고 `src/app/api`의 Route Handler 또는 `src/lib`의 함수로 분리한다.
- 외부 연동(카카오·Supabase)은 `src/lib` 아래 도메인별 모듈로 모은다. 여러 곳에서 쓰는 타입은 `src/types`에 둔다.
- 로딩, 에러, 빈 상태를 항상 같이 구현한다.
- 주석은 "왜"를 설명할 때만 쓴다. "무엇"은 코드로 드러낸다.

## 디자인 규칙
- 색상, 폰트, 간격은 `src/app/globals.css`의 CSS 변수 토큰만 사용한다. 임의의 값을 직접 쓰지 않는다.
- 간격은 8px 단위, 주색은 1개, 폰트는 1종을 기본으로 한다.
- 모바일 화면(너비 375px)을 먼저 기준으로 만든다.
- 새 UI는 기존 컴포넌트를 먼저 재사용하고, 없을 때만 새로 만든다.
- `docs/DESIGN.md`가 디자인 기준이다. `design-taste-frontend` 등 디자인 스킬의 권장(큰 글씨, 넓은 색 면 등)과 충돌하면 DESIGN.md를 따른다 (UI는 무채색, 색은 지도에만).

## 검증 (작업 완료 전 반드시 실행)
1. 타입체크 통과
2. 린트 통과
3. 테스트 통과 (관련 테스트가 없으면 추가를 제안한다)
4. 빌드 통과
5. 통과 결과를 짧게 보고한다. 실패하면 원인을 고치고 다시 실행한다. 검증을 건너뛰고 "완료"라고 하지 않는다.

## 커밋 규칙
- 작업 하나가 끝나면 커밋을 제안한다. 내가 요청할 때만 커밋한다.
- 메시지 형식: `[타입]: [변경 내용]` (예: `feat: 로그인 화면 추가`, `fix: 목록 빈 상태 오류 수정`)
- 타입:
  - `feat`: 새 기능 추가
  - `fix`: 버그 수정
  - `hotfix`: 긴급 수정
  - `refactor`: 동작 변화 없는 코드 구조 개선
  - `style`: UI·스타일 변경, 코드 포맷팅
  - `perf`: 성능 개선
  - `test`: 테스트 추가·수정
  - `docs`: 문서 수정 (README, CLAUDE.md 등)
  - `build`: 빌드 설정, 의존성 변경
  - `ci`: CI/CD 설정 변경
  - `chore`: 기타 잡다한 작업
  - `revert`: 이전 커밋 되돌리기
  - `remove`: 파일·코드 삭제

## 하지 말 것
- 요청하지 않은 의존성 설치, 대규모 리팩터링, 파일 삭제
- `.env` 및 비밀키 파일 열람·수정·커밋
- 테스트를 통과시키려고 테스트 자체를 삭제하거나 약화시키는 것
