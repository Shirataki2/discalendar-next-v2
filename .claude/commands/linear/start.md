---
description: イシューの作業を開始。ブランチ自動作成 + ステータスをIn Progressに更新
allowed-tools: Bash
argument-hint: [issue-id]
---

# Linear Issue Start コマンド

<background_information>
- **Mission**: 指定イシューの作業を開始し、Gitブランチを自動作成する
- **Success Criteria**:
  - イシューのステータスがIn Progressに更新される
  - 対応するGitブランチが作成・チェックアウトされる
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシューの作業を開始する。ブランチ自動作成 + ステータス更新。

## Parse Arguments
- `[issue-id]`: イシューID（例: `DIS-42`）。省略時はイシュー一覧を表示して選択を促す

## Execution Steps

### Step 1: Issue IDの確認
Issue IDが指定されている場合はそのまま使用。

省略時は一覧を表示:
```bash
linear issue list --no-pager
```
表示された一覧からユーザーにIssue IDを選択してもらう。

### Step 2: イシュー内容の確認
```bash
linear issue view <issue-id> --no-pager
```
イシューのタイトル・説明を確認し、英語でのブランチ名を決定する。

### Step 3: 英語ブランチ名の生成
イシュー内容から英語の短い要約スラッグを生成する。

**ブランチ名フォーマット**: `<type>/dis-<number>-<english-slug>`
- `<type>`: `feat`, `fix`, `refactor`, `chore`, `docs` などConventional Commits準拠のプレフィックス
- `<number>`: イシュー番号（例: `42`）
- `<english-slug>`: イシュー内容を英語で要約したkebab-case（2〜4語程度）

**例**:
- DIS-42「カレンダーイベント作成機能」→ `feat/dis-42-create-calendar-events`
- DIS-15「ログインページのバグ修正」→ `fix/dis-15-login-page-bug`
- DIS-30「DBスキーマにインデックス追加」→ `chore/dis-30-add-db-indexes`

### Step 4: 作業開始（ブランチ名を明示指定）
```bash
linear issue start <issue-id> -b <branch-name>
```

これにより:
- イシューのステータスが「In Progress」に更新
- 指定した英語ブランチ名でGitブランチが作成
- 作成されたブランチに自動チェックアウト

### Step 5: 結果確認
```bash
git branch --show-current
```

### Step 6: 結果表示
```markdown
## 作業開始

- **Issue**: DIS-XX - <title>
- **ブランチ**: <branch-name>
- **ステータス**: In Progress
```

## Error Handling
- **Issue ID不明**: `linear issue list` で一覧を表示し、選択を促す
- **既にブランチが存在**: 既存ブランチへのチェックアウトを提案
- **未コミット変更がある**: stashするか先にコミットすることを提案
</instructions>
