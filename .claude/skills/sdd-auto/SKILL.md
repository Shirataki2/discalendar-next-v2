---
name: sdd-auto
description: Linear Issue起点のSDD自動化ワークフロー。イシュー取得 → 仕様策定(自動) → ユーザー承認 → 実装ループ → コードレビューまでを統合実行する。「SDDを始めて」「DIS-XXを自動で実装」「SDD自動化」「自動実装」などで使用。
---

# SDD Auto — Linear Issue to Implementation Pipeline

Linear Issueを起点に、仕様策定 → 実装 → コードレビューを自動実行する。

## ワークフロー

```
Phase 0: 状態検出・再開判定
Phase 1: セットアップ (Linear start + issue内容取得)        [自動]
Phase 2: 仕様策定 (spec-init → requirements → design → tasks) [自動]
Phase 3: 承認ゲート                                         [必ず停止]
Phase 4: 実装ループ (spec-impl × N + commit × N)            [自動]
Phase 5: 仕上げ (バリデーション + code-review)               [自動 → ユーザー判断]
```

## 引数

`$ARGUMENTS` から Linear Issue ID を取得する（例: `DIS-42`）。
Issue IDが未指定の場合は `linear issue list --no-pager` で一覧を表示し選択を促す。

---

## Phase 0: 状態検出・再開判定

途中再開のため、現在の状態を検出してスキップ可能なPhaseを判定する。

### Step 1: ブランチ確認

```bash
git branch --show-current
```

- `*/dis-<number>-*` パターンに一致 → Phase 1（ブランチ作成）をスキップ
- 一致しない → Phase 1 から開始

### Step 2: 仕様ファイル確認

`.kiro/specs/` 内を走査し、該当するspec（イシュー内容に対応するもの）を探す。

見つかった場合、`spec.json` の `phase` フィールドで再開位置を判定:
- `initialized` → Phase 2 Step 3（requirements）から再開
- `requirements-generated` → Phase 2 Step 4（design）から再開
- `design-generated` → Phase 2 Step 5（tasks）から再開
- `tasks-generated` → Phase 3（承認ゲート）から再開

### Step 3: 実装進捗確認

`tasks.md` に `- [x]` のタスクがある場合 → Phase 4（実装ループ）の途中から再開。
未完了タスク `- [ ]` のみを実装対象とする。

**検出した状態と再開ポイントをユーザーに表示してから続行する。**

---

## Phase 1: セットアップ

### Step 1: イシュー内容取得

```bash
linear issue view DIS-XX --no-pager
```

イシューのタイトル・説明・受け入れ条件を取得して保持する。

### Step 2: イシュー品質チェック

説明文が乏しい場合（空 or 1行以下）:

`/linear:refine DIS-XX --auto --skip-split` を実行してイシューを補強する。
補強後、再度 `linear issue view DIS-XX --no-pager` で最新内容を取得。

### Step 3: ブランチ作成

`/linear:start DIS-XX` を実行。

- ステータスが「In Progress」に更新
- `<type>/dis-<number>-<english-slug>` 形式のブランチが作成される

---

## Phase 2: 仕様策定（全自動）

Phase 1で取得したイシュー内容（タイトル + 説明 + 受け入れ条件）を「仕様記述」として構成する。

### Step 1: 仕様初期化

`/kiro:spec-init "仕様記述"` を実行。

### Step 2: slug検出

`.kiro/specs/` 内の最新ディレクトリ（直前に作成されたもの）からslugを特定する。

### Step 3: 要件生成

`/kiro:spec-requirements <slug>` を実行。

### Step 4: 技術設計生成

`/kiro:spec-design <slug> -y` を実行（自動承認）。

### Step 5: タスク分解

`/kiro:spec-tasks <slug> -y` を実行（自動承認）。

---

## Phase 3: 承認ゲート

**このPhaseでは必ず停止する。ユーザーの明示的な承認なしに Phase 4 へ進んではならない。**

### 表示内容

`.kiro/specs/<slug>/tasks.md` を読み、以下のサマリーを表示:

```
## SDD 仕様策定完了

### 生成ファイル
- requirements.md: X 件の要件
- design.md: 技術設計
- tasks.md: N 件の実装タスク

### タスク一覧
1. タスク名...
  1.1 サブタスク名...
  1.2 サブタスク名...
2. タスク名...
  ...

### 仕様ファイル
.kiro/specs/<slug>/

実装を開始してよいですか？
仕様を確認・修正してから「進めて」と回答してください。
```

**Phase 4 へ進むにはユーザーの明示的な承認が必要。**

---

## Phase 4: 実装ループ

`tasks.md` の未完了タスク `- [ ]` を順次処理する。

### 実装サイクル

各タスクについて:

1. `/kiro:spec-impl <slug> <task_number>` を実行（TDD: テスト → 実装 → リファクタ）
2. `/git:commit --no-verify` を実行

### 定期バリデーション

以下のタイミングでバリデーションを実行:

- **メジャータスク境界**: タスク番号の整数部が変わるとき（1.x → 2.x）
- **3サブタスクごと**: 連続して3つのサブタスクを実装した後

バリデーション内容:
```bash
pnpm ultracite check
pnpm run type-check
```

失敗時: 問題を修正し、`/git:commit --no-verify` でコミットしてから続行。

---

## Phase 5: 仕上げ

### Step 1: 全体バリデーション

```bash
pnpm ultracite check
pnpm run type-check
pnpm vitest run
```

失敗時: 修正して `/git:commit --no-verify` でコミット。

### Step 2: コードレビュー

`/code-review` を実行。

### Step 3: 結果サマリー

```
## SDD Auto 完了

### 実装結果
- 完了タスク: N / N
- コミット数: M

### バリデーション
- Lint: PASS/FAIL
- Type Check: PASS/FAIL
- Tests: PASS/FAIL

### コードレビュー
- Critical: N件
- Recommended: N件

### 次のアクション
- `/linear:pr` — PR作成（推奨）
- `/git:pr-cycle` — PRライフサイクル管理
- 追加修正が必要な場合は手動で対応
```

---

## エッジケース

| 状況 | 対応 |
|------|------|
| Issue ID 未指定 | `linear issue list` で一覧表示、ユーザーに選択を促す |
| イシュー説明が空 | `/linear:refine --auto --skip-split` で補強後に続行 |
| 既にブランチが存在 | `/linear:start` をスキップ |
| 既にspecが存在 | `spec.json` の `phase` から該当ステップに再開 |
| 実装途中で再開 | 未完了タスク `- [ ]` のみを実装対象とする |
| バリデーション失敗 | 修正してコミット後に続行 |
| spec-impl が失敗 | エラーを表示し、手動修正の案内を提示 |
| mainブランチ上で実行 | 「フィーチャーブランチで実行してください」と表示して終了 |
