---
name: start-task
description: 이 저장소에서 새 작업을 시작할 때 develop에서 작업 브랜치를 분기하고 별도 git worktree를 만든다. 사용자가 기능 구현·버그 수정·문서·설정 변경을 지시하면 파일을 고치기 전에 먼저 사용한다. 이미 진행 중인 작업을 이어서 고치는 경우에도 해당 worktree를 찾는 데 사용한다.
---

# start-task

CLAUDE.md "브랜치·작업 트리 (Git Flow)" 규칙을 실제로 실행하는 절차다. 메인 체크아웃은 `/Users/isuhyeon/orca/meokdo`이고, 작업 트리는 그 옆 폴더에 만든다.

## 1. 이어서 할 작업인지 먼저 확인

```bash
cd /Users/isuhyeon/orca/meokdo
git worktree list
gh pr list --state open --json number,headRefName,baseRefName,title
```

- 같은 작업의 브랜치·PR이 이미 있으면 새로 만들지 않는다. 그 worktree에서 이어서 고친다 (커밋하면 열린 PR에 그대로 올라간다).
- 없으면 2번으로.

## 2. 브랜치 이름 정하기

`<타입>/<짧은-영문-kebab>`. 타입은 CLAUDE.md 커밋 타입과 같다.

| 작업 | 예 |
|---|---|
| 새 기능 | `feat/map-ratio` |
| 버그 수정 | `fix/vote-error-message` |
| 문서 | `docs/spec-map-ratio` |
| CI·설정 | `ci/...`, `chore/...` |

## 3. develop 최신화 후 worktree 만들기

```bash
cd /Users/isuhyeon/orca/meokdo
git fetch origin --quiet
git worktree add ../meokdo-<브랜치의 /를 -로> -b <브랜치> origin/develop
# 예: git worktree add ../meokdo-feat-map-ratio -b feat/map-ratio origin/develop
```

- 기준은 항상 `origin/develop`이다. `main`이나 로컬 `develop`(오래됐을 수 있음)에서 분기하지 않는다.
- 메인 체크아웃에서 바로 파일을 고치지 않는다.

## 4. 필요할 때만 준비

새 worktree에는 `node_modules`와 `.env.local`이 없다.

- **빌드·검증을 할 작업**이면: `cd <worktree> && npm ci`
- **앱을 실제로 띄울 작업**이면 메인 체크아웃의 `.env.local`을 링크한다. 내용은 열지 않는다.
  ```bash
  cd <worktree> && ln -s ../meokdo/.env.local .env.local
  ```
  `.env.local`은 `.gitignore`에 있어서 커밋되지 않는다.
- 문서만 고치는 작업이면 둘 다 필요 없다.

## 5. 작업 중 주의

- Bash는 호출할 때마다 작업 디렉터리가 메인 체크아웃으로 돌아간다. 모든 명령을 `cd <worktree 절대경로> && ...`로 시작한다.
- Read·Edit·Write도 worktree의 절대경로를 쓴다. 메인 체크아웃 경로를 고치면 엉뚱한 브랜치가 바뀐다.

## 6. 보고

사용자에게 한 줄로 알린다: 만든 브랜치 이름, worktree 경로. 이후 마무리는 `finish-task`.
