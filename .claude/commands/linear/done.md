---
description: 実装完了したイシューの受け入れ条件・サブイシューをコードベースから検証して一括更新
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [issue-id]
---

# Linear Issue Done コマンド

<background_information>
- **Mission**: 現在のブランチの実装内容をもとに、Linearイシューの受け入れ条件チェックボックスとサブイシューのステータスを一括更新する
- **Success Criteria**:
  - イシューの受け入れ条件が実装状態に基づいて検証される
  - 達成済みの条件のチェックボックスが更新される
  - 完了したサブイシューのステータスが Completed に更新される
  - 更新結果のサマリーが表示される
</background_information>

<instructions>
## Core Task
コードベースの実装状態を検証し、Linearイシューの受け入れ条件とサブイシューを一括更新する。Issue ID省略時はブランチから自動検出。

## Parse Arguments
- `[issue-id]`: イシューID。省略時はブランチから自動検出

## Execution Steps

### Step 1: Issue IDの解決
Issue IDが指定されていない場合、ブランチから自動検出:
```bash
linear issue id
```

### Step 2: イシュー情報の取得
イシューの詳細（受け入れ条件・サブイシュー）を取得:
```bash
linear issue view <issue-id>
```

### Step 3: 実装状態の検証
イシューの受け入れ条件（`- [ ]` チェックボックス）を1つずつ読み取り、コードベースを調査して達成状況を判定する。

**検証手法**:
- ファイル・依存パッケージの存在確認（`Glob`, `Bash`）
- 設定値やコードパターンの存在確認（`Grep`, `Read`）
- テスト結果による動作確認（必要に応じて `Bash`）

各条件について「達成 / 未達成」を判定し、根拠を記録する。

### Step 4: サブイシューの検証
サブイシューがある場合、各サブイシューの内容を確認し、実装状態と照合する:
```bash
linear issue view <sub-issue-id>
```

### Step 5: 検証結果の表示と確認
更新前に検証結果をテーブル形式でユーザーに表示し、更新内容を確認する:

```markdown
## 検証結果

### 受け入れ条件
| # | 条件 | 状態 | 根拠 |
|---|------|------|------|
| 1 | ... | ✅ 達成 | ... |
| 2 | ... | ❌ 未達成 | ... |

### サブイシュー
| Issue | タイトル | 現在の状態 | 更新後 |
|-------|---------|-----------|--------|
| DIS-XX | ... | Todo | → Completed |
```

ユーザーの承認を得てから次のステップに進む。

### Step 6: 受け入れ条件の更新
チェックボックスの状態を更新した説明文で `linear issue update` を実行:
- 達成済みの条件: `- [ ]` → `- [x]`
- 未達成の条件: `- [ ]` のまま維持
- 既にチェック済みの条件: `- [x]` のまま維持

```bash
linear issue update <issue-id> --description "<updated-description>"
```

**重要**: 説明文のチェックボックス以外の部分（背景、目的、技術メモ等）は変更しないこと。

### Step 7: サブイシューの更新
完了と判定されたサブイシューのステータスを更新:
```bash
linear issue update <sub-issue-id> --state completed
```

### Step 8: 結果サマリー
```markdown
## 更新完了

- **Issue**: DIS-XX - <title>
- **受け入れ条件**: X/Y 達成（Z件更新）
- **サブイシュー**: X/Y 完了（Z件更新）
```

## Error Handling
- **Issue ID不明**: ブランチ検出失敗時、手動指定を促す
- **受け入れ条件なし**: チェックボックスが説明文にない場合、サブイシューのみ更新
- **サブイシューなし**: 受け入れ条件のみ更新
- **検証不確実**: 自動判定が困難な条件はユーザーに確認する
- **更新失敗**: エラー内容を表示し、個別の再実行方法を提示
</instructions>
