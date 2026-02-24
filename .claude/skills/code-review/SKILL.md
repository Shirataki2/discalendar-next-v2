---
name: code-review
description: Git差分ベースの自動コードレビュー。Agent Teamsで4つのレビュアーが並列にArchitecture / Type Safety / Code Quality / Securityを分析し、重要度別の統合レポートを出力する。「コードレビューして」「レビューして」「変更をチェック」「セルフレビュー」などで使用。
---

# Code Review Skill (Agent Teams)

mainブランチとの差分に基づき、Agent Teams で4つの観点からプロジェクト規約準拠を自動レビューする。

## Phase 1: 変更検出

### Step 1: ブランチ確認

```bash
git rev-parse --abbrev-ref HEAD
```

- **mainブランチ上の場合**: 「mainブランチ上ではレビューを実行できません。フィーチャーブランチに切り替えてください。」と表示して終了。

### Step 2: mainブランチの存在確認

```bash
git show-ref --verify refs/heads/main 2>/dev/null || git show-ref --verify refs/remotes/origin/main 2>/dev/null
```

- mainが見つからない場合: `git fetch origin main` を試行。それでも失敗したら「mainブランチが見つかりません」と表示して終了。

### Step 3: 変更ファイル一覧取得

```bash
git diff --name-only main...HEAD
git diff --stat main...HEAD
```

- **変更なし**: 「mainブランチとの差分がありません。」と表示して終了。

### Step 4: 未コミット変更の確認

```bash
git status --porcelain
```

- 未コミット変更がある場合: 「**警告**: 未コミットの変更があります。レビューはコミット済みの変更のみを対象とします。」と警告を表示してから続行。

### Step 5: 変更ファイルの分類

変更ファイル一覧から以下を分類:
- **TSX/TS ファイル**: 全エージェントの対象
- **SQL ファイル** (`supabase/migrations/`): セキュリティエージェントの対象
- **設定ファイル** (`.env*`, `next.config.*`, etc.): セキュリティエージェントの対象
- **バイナリファイル** (画像等): スキップ（レポートに記載）
- **50ファイル超**: 「**警告**: 変更ファイルが多数（N files）です。レビューに時間がかかる場合があります。」と表示

**エッジケース**: .ts/.tsx ファイルがなく SQL/設定ファイルのみの場合 → security-reviewer のみ起動。どちらもない場合 → 「TypeScriptファイルの変更なし」と表示して終了。

## Phase 2: チーム起動 & 並列レビュー

### Step 1: TeamCreate

```
TeamCreate: team_name="code-review", description="Git差分ベースのコードレビュー"
```

### Step 2: TaskCreate x 4

各レビュータスクを作成し、owner を各 reviewer 名に設定する。

タスクの description には以下を埋め込む:
- 変更ファイル一覧（Phase 1 で取得した動的データ）
- reference ファイルパス
- 出力フォーマット（後述のエージェント出力フォーマット）

```
TaskCreate: subject="Architecture Review", owner="architecture-reviewer"
TaskCreate: subject="Type Safety Review", owner="type-safety-reviewer"
TaskCreate: subject="Code Quality Review", owner="code-quality-reviewer"
TaskCreate: subject="Security Review", owner="security-reviewer"
```

**注意**: .ts/.tsx ファイルがない場合、security-reviewer のタスクのみ作成する。

### Step 3: Task x 4 並列起動

**重要**: 単一メッセージで4つの `Task` ツールを同時呼び出しする。

各 Task の設定:
- `subagent_type: "general-purpose"` (SendMessage / TaskUpdate を使うため)
- `team_name: "code-review"`
- `name: "{reviewer-name}"`（TaskCreate の owner と一致させる）

各 teammate のプロンプトは以下のテンプレートに従って構成する:

---

#### Teammate プロンプトテンプレート

```
あなたは code-review チームの "{REVIEWER_NAME}" です。

## 手順

1. TaskList でタスク一覧を確認し、自分がオーナーのタスクを見つける
2. TaskGet でタスク詳細を取得する
3. Reference ファイル `{REFERENCE_PATH}` を Read で読み、チェックリストを把握する
4. 以下の変更ファイルを Read してチェックリストに照合する:
{FILE_LIST}
5. レビュー結果を以下の出力フォーマットに従って整理する
6. SendMessage で team lead に結果を報告する:
   SendMessage(type: "message", recipient: "team-lead", content: "レビュー結果...", summary: "{REVIEWER_NAME} review complete")
7. TaskUpdate で自分のタスクを completed にする

## 出力フォーマット

各指摘項目について以下の形式で報告してください:

- **Severity**: 🔴 Critical / 🟡 Recommended / 🟢 Enhancement
- **File**: ファイルパス
- **Line**: 行番号（特定できない場合は "N/A"）
- **Rule**: 違反しているルール名（チェックリストの項目名）
- **Description**: 問題の説明
- **Suggestion**: 修正提案

指摘がない場合は「指摘事項なし」と報告してください。

重要度の判断基準:
- 🔴 Critical: セキュリティリスク、認証漏れ、データ漏洩、ランダムログアウトの原因、バグの原因
- 🟡 Recommended: パターン不遵守、型安全性の低下、テスト/Storybook未作成
- 🟢 Enhancement: 命名改善、コードスタイル、可読性向上
```

---

#### Agent 1: architecture-reviewer

```
プロンプト変数:
- REVIEWER_NAME: "architecture-reviewer"
- REFERENCE_PATH: ".claude/skills/code-review/references/architecture-review.md"
- FILE_LIST: 変更された .ts/.tsx ファイル
```

レビュー観点:
- Server/Client Component の使い分け
- Supabase client の使い分け（server.ts / client.ts / proxy.ts）
- Server Actions パターン準拠
- ルート保護の整合性
- コンポーネント配置規約

#### Agent 2: type-safety-reviewer

```
プロンプト変数:
- REVIEWER_NAME: "type-safety-reviewer"
- REFERENCE_PATH: ".claude/skills/code-review/references/type-safety-review.md"
- FILE_LIST: 変更された .ts/.tsx ファイル
```

レビュー観点:
- any 型の使用
- Result型パターンの準拠
- snake_case/camelCase 変換の適切さ
- Props の型定義
- マジックナンバー
- AbortSignal サポート

#### Agent 3: code-quality-reviewer

```
プロンプト変数:
- REVIEWER_NAME: "code-quality-reviewer"
- REFERENCE_PATH: ".claude/skills/code-review/references/code-quality-review.md"
- FILE_LIST: 変更された .ts/.tsx ファイル
```

レビュー観点:
- Storybook/テストファイルの存在
- React 19 パターン（forwardRef不使用）
- 命名規則
- コードスタイル（const/let, for...of, async/await等）
- `<img>` タグの使用（Next.js `<Image>` を使うべき）

#### Agent 4: security-reviewer

```
プロンプト変数:
- REVIEWER_NAME: "security-reviewer"
- REFERENCE_PATH: ".claude/skills/code-review/references/security-review.md"
- FILE_LIST: 変更された .ts/.tsx ファイル + .sql ファイル + 設定ファイル
```

レビュー観点:
- 認証チェック漏れ
- 認可（権限検証）漏れ
- 機密データ漏洩
- 入力検証の不足
- 環境変数の適切さ
- dangerouslySetInnerHTML 使用

## Phase 3: 結果集約

4 teammate から SendMessage で届いた結果を収集後:

1. 全指摘を重要度別に分類: 🔴 Critical → 🟡 Recommended → 🟢 Enhancement
2. 同一ファイル+同一行付近（5行以内）の重複指摘を統合（高い重要度を維持）
3. 各カテゴリ内ではファイルパス順にソート

**エラーハンドリング**: teammate がエラーで結果を返せなかった場合、そのレビュアーの結果を「レビュー不可」としてレポートに記載し、他のレビュアー結果は正常に表示する。

## Phase 4: レポート出力

以下の形式で統合レポートを表示:

```markdown
# Code Review Report

## Summary
- **Branch**: <branch-name> (vs main)
- **Changed Files**: N files (+additions -deletions)
- **Reviewers**: Architecture, Type Safety, Code Quality, Security

| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟡 Recommended | N |
| 🟢 Enhancement | N |

## 🔴 Critical Issues (N)

### 1. [Rule名] -- `file.ts:42`
**Category**: Architecture / Type Safety / Code Quality / Security
**Description**: 問題の説明
**Suggestion**: 修正提案

---

## 🟡 Recommended (N)

### 1. [Rule名] -- `file.ts:100`
**Category**: ...
**Description**: ...
**Suggestion**: ...

---

## 🟢 Enhancement (N)

### 1. [Rule名] -- `file.ts:200`
**Category**: ...
**Description**: ...
**Suggestion**: ...
```

指摘が0件の場合:

```markdown
# Code Review Report

## Summary
- **Branch**: <branch-name> (vs main)
- **Changed Files**: N files (+additions -deletions)

All checks passed. レビュー指摘はありません。
```

## Phase 5: チーム解散

1. `SendMessage(type: "shutdown_request")` を各 teammate に送信
2. 全員の shutdown_response を確認
3. `TeamDelete` でチームとタスクリストを削除

## エッジケース処理

| 状況 | 対応 |
|------|------|
| mainブランチ上で実行 | チーム作成せず中止メッセージを表示して終了 |
| 変更なし | チーム作成せず "No changes detected" と表示して終了 |
| main未取得 | `git fetch origin main` を試行 |
| 50+ ファイル変更 | 警告表示、エージェントにはファイルリストを渡してRead依存 |
| バイナリファイルのみ変更 | チーム作成せずスキップしてレポートに「バイナリファイルのみの変更」と記載 |
| .ts/.tsx 以外のみ変更 | security-reviewer のみ起動（設定ファイル・SQL）、該当なければチーム作成せず「TypeScriptファイルの変更なし」と表示 |
| teammate がエラー | そのレビュアーの結果を「レビュー不可」としてレポートに記載、他のレビュアー結果は正常に表示 |
