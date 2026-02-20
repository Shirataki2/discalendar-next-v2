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

### Step 2: 作業開始
```bash
linear issue start <issue-id>
```

これにより:
- イシューのステータスが「In Progress」に更新
- Gitブランチが自動作成（例: `tomoya/dis-42-issue-title`）
- 作成されたブランチに自動チェックアウト

### Step 3: 結果確認
```bash
git branch --show-current
```

### Step 4: 結果表示
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
