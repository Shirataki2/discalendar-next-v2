---
description: ブランチの作成、削除、一覧表示、切り替えなどのブランチ操作
allowed-tools: Bash, Read
argument-hint: [branch-name] [--create] [--delete] [--list] [--switch] [--current]
---

# Git Branch コマンド

<background_information>
- **Mission**: ブランチの作成、削除、一覧表示、切り替えなどのブランチ操作を実行
- **Success Criteria**:
  - ブランチの一覧を表示
  - 新しいブランチを作成
  - 既存のブランチを削除
  - ブランチを切り替え
  - 現在のブランチを表示
</background_information>

<instructions>
## Core Task
ブランチの作成、削除、一覧表示、切り替えなどのブランチ操作を実行。

## Parse Arguments
- `branch-name`: ブランチ名（作成、削除、切り替え時に使用）
- `--create`: 新しいブランチを作成
- `--delete`: ブランチを削除
- `--list`: ブランチ一覧を表示
- `--switch`: ブランチを切り替え
- `--current`: 現在のブランチを表示

**モード判定**:
- 引数なし: ブランチ一覧を表示
- `--current`: 現在のブランチを表示
- `--list`: ブランチ一覧を表示
- `--create <branch-name>`: ブランチを作成
- `--switch <branch-name>`: ブランチを切り替え
- `--delete <branch-name>`: ブランチを削除
- `<branch-name>`のみ: ブランチを作成（`--create`の省略形）

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. ブランチ操作に必要な権限がある

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: モード別の実行

#### モード1: 現在のブランチを表示 (`--current`)
```bash
git branch --show-current
```

#### モード2: ブランチ一覧を表示 (`--list` または引数なし)
```bash
git branch -a
```

リモートブランチも含めて表示:
```bash
git branch -r
```

#### モード3: ブランチを作成 (`--create <branch-name>` または `<branch-name>`のみ)
1. ブランチ名の検証:
   - ブランチ名が有効か確認（特殊文字のチェック）
   - 既存のブランチと重複していないか確認:
     ```bash
     git show-ref --verify --quiet refs/heads/<branch-name>
     ```

2. ブランチの作成:
   ```bash
   git checkout -b <branch-name>
   ```

   または現在のブランチから作成:
   ```bash
   git branch <branch-name>
   ```

#### モード4: ブランチを切り替え (`--switch <branch-name>`)
1. ブランチの存在確認:
   ```bash
   git show-ref --verify --quiet refs/heads/<branch-name>
   ```

2. 未コミットの変更があるか確認:
   ```bash
   git status --porcelain
   ```

3. ブランチの切り替え:
   ```bash
   git checkout <branch-name>
   ```

   または:
   ```bash
   git switch <branch-name>
   ```

#### モード5: ブランチを削除 (`--delete <branch-name>`)
1. 現在のブランチでないことを確認:
   ```bash
   git branch --show-current
   ```

2. ブランチの存在確認:
   ```bash
   git show-ref --verify --quiet refs/heads/<branch-name>
   ```

3. ブランチの削除:
   ```bash
   git branch -d <branch-name>
   ```

   強制削除（マージされていないブランチも削除）:
   ```bash
   git branch -D <branch-name>
   ```

### Step 3: 結果の表示
実行結果を表示:
- 作成/削除/切り替えが成功したか
- 現在のブランチ名
- ブランチ一覧（該当する場合）

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 作成/削除/一覧表示/切り替え
2. **実行結果**:
   - 成功/失敗のステータス
   - 実行されたコマンド
3. **ブランチ情報**:
   - 現在のブランチ名
   - ブランチ一覧（該当する場合）
4. **次のステップ**: 推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- ブランチ名はコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **ブランチが既に存在する**: エラーを報告し、別の名前を提案
- **ブランチが存在しない**: エラーを報告し、ブランチ一覧を表示
- **現在のブランチを削除しようとした**: エラーを報告し、別のブランチに切り替えるよう促す
- **未コミットの変更がある**: 警告を表示し、変更をコミットまたはスタッシュするよう促す
- **マージされていないブランチの削除**: 警告を表示し、`-D`オプションの使用を提案（慎重に）
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **ブランチ名が無効**: エラーを報告し、有効なブランチ名の形式を説明
- **切り替え失敗**: エラーを報告し、未コミットの変更を確認するよう促す
- **削除失敗**: エラーを報告し、強制削除オプションを提案（慎重に）
