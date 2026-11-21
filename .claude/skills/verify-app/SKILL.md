---
name: verify-app
description: 이 저장소(오늘 점심 지도, Next 16) 변경을 검증하는 절차. 코드 변경을 끝냈다고 보고하기 전과 커밋 전에 사용한다. typecheck·lint·build 정적 검사와, dev 서버를 띄워 페이지와 API를 실제로 확인하는 방법, 실제 DB에 쓰면 안 되는 요청을 정리했다.
---

# verify-app

CLAUDE.md "검증" 단계를 이 저장소에서 실제로 실행하는 방법이다. 모든 명령은 작업 중인 worktree에서 `cd <worktree> && ...`로 실행한다.

## 1. 범위 정하기

| 바꾼 것 | 할 것 |
|---|---|
| 문서만 (`docs/`, `*.md`) | 생략. 링크·표만 확인 |
| 설정·CI만 | 2번 |
| 코드 (`src/`) | 2번 + 3번 + 4번 |
| 화면 (`src/components`, `globals.css`) | 위 전부 + 5번 |

## 2. 정적 검사 (CI와 같음)

```bash
cd <worktree> && [ -d node_modules ] || npm ci
cd <worktree> && npm run typecheck && npm run lint && npm run build
```

- 빌드에는 env가 필요 없다. API 라우트가 모두 `force-dynamic`이라 빌드 때 실행되지 않는다.
- 빌드가 env 때문에 실패하면, 새 라우트에 `export const dynamic = "force-dynamic"`이 빠졌는지부터 본다.
- 테스트 스크립트는 아직 없다. 로직을 바꿨으면 테스트 추가를 제안한다.

## 3. dev 서버 띄우기

```bash
cd <worktree> && [ -e .env.local ] || ln -s ../meokdo/.env.local .env.local   # 내용은 열지 않는다
lsof -i :3000 -sTCP:LISTEN
```

- **포트는 3000만 쓴다.** 카카오 JS SDK는 카카오 콘솔에 등록한 `http://localhost:3000`에서만 동작한다. 3001 등으로 띄우면 지도·위치·가게 검색이 안 된다.
- 3000을 이미 다른 프로세스(다른 worktree의 dev 서버 등)가 쓰고 있으면 죽이지 말고 사용자에게 알린다.
- 비어 있으면 백그라운드로 띄우고 로그에서 `Ready`를 기다린다: `cd <worktree> && npm run dev -- --port 3000`

## 4. API 확인

안전한 요청 (읽기 또는 DB 전에 막히는 요청):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/today"            # 400 (region 없음)
curl -s "http://localhost:3000/api/today?region=11680"                                 # 200 {scope, top3, total}
curl -s "http://localhost:3000/api/map"                                                # 200 {vote_date, cells}
curl -s -X POST http://localhost:3000/api/vote -H 'content-type: application/json' \
  -d '{"region_code":"x","menu_type":"korean","visit_bucket":"first"}'                # 400 (zod 검증, DB 안 감)
```

**하지 말 것**
- 올바른 본문으로 `POST /api/vote`, `POST /api/event`를 보내지 않는다. `.env.local`은 실제 Supabase 프로젝트를 가리키므로 실제 표·이벤트가 쌓인다. 꼭 필요하면 사용자에게 먼저 묻는다.
- 같은 IP로 POST를 반복하면 레이트리밋(429)에 걸린다. 429는 버그가 아니다.

200 대신 500이 나오면 docs/SETUP.md "자주 겪는 문제"를 본다 (Supabase env 오타, 마이그레이션 미적용).

## 5. 화면 확인

- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` 와 `/map`이 200이고, dev 서버 로그에 에러가 없어야 한다.
- 브라우저 도구가 있으면 `/`(룰렛, 메뉴 고르기)와 `/map`(지도, 칸 누르기)을 실제로 눌러본다. 위치 권한·카카오 가게 검색은 자동화가 어려우니, 바꾼 흐름이 거기에 걸리면 사용자에게 확인할 항목을 목록으로 준다.
- docs/DESIGN.md 규칙 확인 (화면을 바꿨을 때):
  - 새로 쓴 색 값이 토큰(`var(--...)`)인지: `git diff origin/develop -- src | grep -nE '^\+.*#[0-9a-fA-F]{3,8}\b'`
  - 메뉴 색(`menu.color`, `m.color`)을 글자색(`color:`)으로 쓰지 않았는지

## 6. 마무리

- 직접 띄운 dev 서버만 종료한다.
- 결과를 짧게 보고한다: 통과한 단계, 실패한 단계와 출력, 건너뛴 단계와 이유. 실패하면 고치고 다시 돌린다. 검증을 건너뛰고 "완료"라고 하지 않는다.
