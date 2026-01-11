---
description: コミットやステージングをリセット。様々なリセットレベルをサポート
allowed-tools: Bash, Read
argument-hint: [commit] [--soft] [--mixed] [--hard] [--abort]
---

# Git Reset コマンド

<background_information>
- **Mission**: コミットやステージングをリセット。様々なリセットレベルをサポート
- **Success Criteria**:
  - 指定されたコミットまでリセット
  - ステージング状態をリセット
  - 作業ディレクトリをリセット（オプション）
  - リセット結果を表示
</background_information>

<instructions>
## Core Task
コミットやステージングをリセット。様々なリセットレベルをサポート。

## Parse Arguments
- `commit`: リセットするコミット（デフォルト: HEAD）
- `--soft`: コミットのみリセット（ステージングは保持）
- `--mixed`: コミットとステージングをリセット（作業ディレクトリは保持、デフォルト）
- `--hard`: コミット、ステージング、作業ディレクトリをすべてリセット（注意: 変更が失われます）
- `--abort`: 進行中のマージ/リベースを中断

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. リセットするコミットが存在する
3. 未コミットの変更がある場合、警告を表示（特に`--hard`の場合）

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: 現在の状態の確認
現在のコミットを確認:
```bash
git log --oneline -5
```

未コミットの変更があるか確認:
```bash
git status --porcelain
```

### Step 3: リセット対象の確認
リセットするコミットが存在するか確認:
```bash
git show-ref --verify --quiet refs/heads/<commit>
```

または:
```bash
git rev-parse --verify <commit>
```

### Step 4: リセットの実行
**Softリセット** (`--soft`):
```bash
git reset --soft <commit>
```

**Mixedリセット** (`--mixed` または引数なし):
```bash
git reset --mixed <commit>
```

または:
```bash
git reset <commit>
```

**Hardリセット** (`--hard`):
⚠️ **警告**: この操作は作業ディレクトリの変更を失います
```bash
git reset --hard <commit>
```

**マージ/リベースの中断** (`--abort`):
```bash
git merge --abort
```

または:
```bash
git rebase --abort
```

### Step 5: リセット結果の確認
リセットが成功したか確認:
```bash
git log --oneline -5
```

現在の状態を確認:
```bash
git status
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: Soft/Mixed/Hardリセット
2. **リセット情報**:
   - リセット前のコミット
   - リセット後のコミット
   - リセットレベル
3. **実行結果**:
   - 成功/失敗のステータス
   - 影響を受けたファイル（該当する場合）
4. **警告** (該当する場合):
   - 失われた変更の警告
   - 復元方法の説明
5. **次のステップ**: 推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コマンドはコードブロックで囲む
- 警告は明確に表示（⚠️）
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **コミットが存在しない**: エラーを報告し、コミットハッシュを確認するよう促す
- **未コミットの変更がある**: 警告を表示し、変更をコミットまたはスタッシュするよう促す（特に`--hard`の場合）
- **リセット失敗**: 具体的なエラーメッセージを表示し、解決策を提案
- **リモートにプッシュ済み**: 警告を表示し、強制プッシュが必要になることを説明
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **Hardリセットの警告**: `--hard`オプション使用時は明確な警告を表示
- **未コミットの変更がある**: 警告を表示し、処理を中断するか確認
- **リモートにプッシュ済み**: 警告を表示し、強制プッシュのリスクを説明
- **部分的な成功**: 成功した部分と失敗した部分を明確に分けて報告
