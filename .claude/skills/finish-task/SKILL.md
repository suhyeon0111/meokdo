---
name: finish-task
description: 이 저장소에서 worktree 작업을 마무리할 때 쓴다. 검증, 커밋, 푸시, develop 기준 PR 생성, 머지 후 worktree 정리 절차. 사용자가 "커밋해줘", "PR 올려줘", "정리해줘"라고 하거나 작업 완료를 보고하기 직전에 사용한다.
---

# finish-task

커밋·푸시·PR은 **사용자가 요청할 때만** 한다 (CLAUDE.md 커밋 규칙). 요청이 없으면 1번까지만 하고 커밋할지 묻는다.

## 1. 검증

- 코드를 바꿨으면 `verify-app` 스킬 절차를 따른다.
- 문서만 바꿨으면 링크·표가 깨지지 않았는지만 본다.
- 결과를 짧게 보고한다. 실패를 숨기고 "완료"라고 하지 않는다.

## 2. 커밋 (요청 시)

```bash
cd <worktree> && git status --short
cd <worktree> && git add <바꾼 파일 경로들>    # -A 금지: 의도한 파일만
```

- 메시지: `<타입>: <변경 내용>` (한국어) + 빈 줄 + `- ` 목록으로 무엇을·왜.
- 마지막 줄은 하네스가 지정한 `Co-Authored-By` 줄을 그대로 쓴다.
- `.env*` 파일이 스테이징되어 있으면 멈추고 사용자에게 알린다.

## 3. PR에 들어갈 커밋 확인 (PR 만들기 전에 반드시)

```bash
cd <worktree> && git fetch origin --quiet && git log --oneline origin/develop..HEAD
```

- 이 작업의 커밋만 나와야 한다. 다른 작업 커밋이 섞여 있으면 멈추고 사용자에게 알린다.
- 이 단계를 빼먹어서 PR 설명과 실제 내용이 달랐던 적이 있다.

## 4. 푸시와 PR (요청 시)

```bash
cd <worktree> && git push -u origin <브랜치>
gh pr list --head <브랜치> --state open --json number,url
```

- 같은 브랜치 PR이 이미 있으면 푸시로 갱신된 것이다. 새로 만들지 않고 그 PR 링크를 알려준다.
- 없으면 base `develop`으로 만든다. 사용자가 main을 지정했을 때만 예외.

```bash
gh pr create --base develop --head <브랜치> --title "<커밋 제목과 같은 형식>" --body "<본문>"
```

본문 구성: `## 개요` → `## 변경` → `## 검증` → (있으면) `## 후속 작업`, `## 정할 것`. 마지막 줄은 하네스가 지정한 PR 문구.

CI 결과가 필요하면 `gh pr checks <번호>`로 확인해 보고한다.

## 5. 머지 후 정리 (사용자가 머지했다고 하거나 정리를 요청할 때)

```bash
gh pr view <번호> --json state --jq .state     # MERGED 인지 확인
cd /Users/isuhyeon/orca/meokdo
git worktree remove ../meokdo-<브랜치의 /를 -로>
git branch -d <브랜치>
```

- `MERGED`가 아니면 지우지 않는다.
- `git worktree remove`가 커밋 안 된 변경 때문에 실패하면 `--force`를 쓰지 말고 무엇이 남았는지 사용자에게 보여준다.
- 원격 브랜치 삭제(`git push origin --delete <브랜치>`)는 되돌리기 어려우니 사용자에게 확인받고 한다.
