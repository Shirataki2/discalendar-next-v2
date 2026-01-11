---
description: 変更をステージングしてコミット。コミットメッセージを自動生成することも可能
allowed-tools: Bash, Read
argument-hint: [commit-message] [--amend] [--no-verify]
---

# Git Commit コマンド

<background_information>
- **Mission**: 変更をステージングしてコミット。コミットメッセージを自動生成することも可能
- **Success Criteria**:
  - 変更内容を分析して適切なコミットメッセージを生成
  - 変更をステージング
  - コミットを実行
  - コミット結果を表示
</background_information>

<instructions>
## Core Task
変更をステージングしてコミットを実行。コミットメッセージが提供されていない場合は、変更内容から自動生成。

## Parse Arguments
- `commit-message`: コミットメッセージ（省略可能、自動生成される）
- `--amend`: 直前のコミットを修正
- `--no-verify`: フックをスキップ

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. コミットする変更が存在する
3. 現在のブランチが存在する

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: 変更内容の確認
変更があるか確認:
```bash
git status --porcelain
```

変更がない場合、エラーを報告して終了。

### Step 2: コミットメッセージの決定
**コミットメッセージが提供されている場合**:
- 提供されたメッセージを使用

**コミットメッセージが提供されていない場合**:
変更内容を分析してコミットメッセージを自動生成:

1. 変更されたファイルを取得:
   ```bash
   git status --porcelain
   ```

2. 変更内容の差分を取得:
   ```bash
   git diff --cached
   git diff
   ```

3. 変更の統計を取得:
   ```bash
   git diff --stat
   git diff --cached --stat
   ```

4. コミットメッセージ生成ルール:
   - Conventional Commits形式を使用: `<type>(<scope>): <subject>`
   - タイプ: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`
   - スコープ: 変更された主要なコンポーネントやモジュール（省略可能）
   - サブジェクト: 変更内容の簡潔な説明（50文字以内）

**タイプ判定ルール**:
- `feat`: 新機能の追加
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント変更
- `style`: コードスタイルの変更（フォーマットなど）
- `test`: テストの追加・変更
- `chore`: ビルドプロセスやツールの変更
- `perf`: パフォーマンス改善

### Step 3: 変更のステージング
未ステージングの変更がある場合、ステージング:
```bash
git add .
```

または特定のファイルのみ:
```bash
git add <file-path>
```

### Step 4: コミットの実行
**通常のコミット**:
```bash
git commit -m "<commit-message>"
```

**修正モード** (`--amend`):
```bash
git commit --amend -m "<commit-message>"
```

**フックスキップ** (`--no-verify`):
```bash
git commit --no-verify -m "<commit-message>"
```

### Step 5: コミット結果の確認
コミットが成功したか確認:
```bash
git log -1 --oneline
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 自動生成モードまたは手動モード
2. **生成されたコミットメッセージ** (自動生成の場合):
   - コミットメッセージ
   - 生成理由の説明
3. **ステージング結果**:
   - ステージングされたファイル一覧
4. **コミット結果**:
   - コミットハッシュ
   - コミットメッセージ
   - 変更されたファイル数
5. **次のステップ**: プッシュなどの推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コミットメッセージはコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **変更がない**: エラーを報告し、変更がないことを通知
- **コミットメッセージが空**: エラーを報告し、メッセージの入力を促す
- **コミット失敗**: 具体的なエラーメッセージを表示し、解決策を提案
- **フックエラー**: エラー内容を表示し、`--no-verify`オプションの使用を提案（慎重に）
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 変更内容の分析（必要に応じて）

## Safety & Fallback
- **変更内容の分析失敗**: デフォルトのコミットメッセージを使用（`chore: update files`）
- **コミットメッセージ生成失敗**: ユーザーに入力を促す
- **ステージング失敗**: エラーを報告し、手動でのステージングを提案
