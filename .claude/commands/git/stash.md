---
description: 変更を一時的に保存（スタッシュ）または復元。スタッシュ一覧の表示も可能
allowed-tools: Bash, Read
argument-hint: [message] [--list] [--pop] [--apply] [--drop] [--clear]
---

# Git Stash コマンド

<background_information>
- **Mission**: 変更を一時的に保存（スタッシュ）または復元
- **Success Criteria**:
  - 変更をスタッシュに保存
  - スタッシュ一覧を表示
  - スタッシュを復元
  - スタッシュを削除
</background_information>

<instructions>
## Core Task
変更を一時的に保存（スタッシュ）または復元。スタッシュ一覧の表示も可能。

## Parse Arguments
- `message`: スタッシュメッセージ（保存時に使用）
- `--list`: スタッシュ一覧を表示
- `--pop`: 最新のスタッシュを復元して削除
- `--apply`: 最新のスタッシュを復元（削除しない）
- `--drop`: 最新のスタッシュを削除
- `--clear`: すべてのスタッシュを削除

**モード判定**:
- 引数なし: 変更をスタッシュに保存
- `--list`: スタッシュ一覧を表示
- `--pop`: スタッシュを復元して削除
- `--apply`: スタッシュを復元（削除しない）
- `--drop`: スタッシュを削除
- `--clear`: すべてのスタッシュを削除

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. スタッシュする変更が存在する（保存時）

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: モード別の実行

#### モード1: スタッシュ一覧を表示 (`--list`)
```bash
git stash list
```

詳細情報も表示:
```bash
git stash list --date=local
```

#### モード2: 変更をスタッシュに保存（引数なし）
1. 変更があるか確認:
   ```bash
   git status --porcelain
   ```

2. スタッシュの保存:
   ```bash
   git stash push -m "<message>"
   ```

   メッセージがない場合:
   ```bash
   git stash push
   ```

   未追跡ファイルも含める:
   ```bash
   git stash push -u -m "<message>"
   ```

#### モード3: スタッシュを復元して削除 (`--pop`)
1. スタッシュ一覧を確認:
   ```bash
   git stash list
   ```

2. 最新のスタッシュを復元して削除:
   ```bash
   git stash pop
   ```

   特定のスタッシュを指定:
   ```bash
   git stash pop stash@{<index>}
   ```

#### モード4: スタッシュを復元（削除しない）(`--apply`)
1. スタッシュ一覧を確認:
   ```bash
   git stash list
   ```

2. 最新のスタッシュを復元:
   ```bash
   git stash apply
   ```

   特定のスタッシュを指定:
   ```bash
   git stash apply stash@{<index>}
   ```

#### モード5: スタッシュを削除 (`--drop`)
1. スタッシュ一覧を確認:
   ```bash
   git stash list
   ```

2. 最新のスタッシュを削除:
   ```bash
   git stash drop
   ```

   特定のスタッシュを指定:
   ```bash
   git stash drop stash@{<index>}
   ```

#### モード6: すべてのスタッシュを削除 (`--clear`)
```bash
git stash clear
```

### Step 3: 結果の表示
実行結果を表示:
- スタッシュの保存/復元/削除が成功したか
- スタッシュ一覧（該当する場合）

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 保存/一覧表示/復元/削除
2. **実行結果**:
   - 成功/失敗のステータス
   - 実行されたコマンド
3. **スタッシュ情報**:
   - スタッシュ一覧（該当する場合）
   - スタッシュの内容（該当する場合）
4. **次のステップ**: 推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コマンドはコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **変更がない**: エラーを報告し、スタッシュする変更がないことを通知
- **スタッシュが存在しない**: エラーを報告し、スタッシュ一覧を表示
- **競合が発生した**: 競合ファイルを一覧表示し、解決手順を説明
- **スタッシュの復元失敗**: 具体的なエラーメッセージを表示し、解決策を提案
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: スタッシュの内容確認（必要に応じて）

## Safety & Fallback
- **変更がない**: 情報メッセージを表示
- **スタッシュの復元で競合**: 競合解決の手順を明確に説明
- **スタッシュの削除失敗**: エラーを報告し、手動での削除を提案
- **部分的な成功**: 成功した部分と失敗した部分を明確に分けて報告
