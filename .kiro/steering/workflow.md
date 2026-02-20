# 開発ワークフロー

Linear（計画）と SDD（仕様駆動開発）を統合した開発プロセス。

## 全体フロー

```
計画                  仕様策定                    実装                  納品
─────────────────────────────────────────────────────────────────────────────
Linear Issue    →   SDD Spec              →   コーディング      →   PR・完了
(WHAT/WHY)         (HOW)                     (DO)                 (DELIVER)

/linear:create      /kiro:spec-init           /linear:start        /linear:pr
/linear:refine      /kiro:spec-requirements   実装 + テスト        /linear:update
                    /kiro:spec-design         /git:commit
                    /kiro:spec-tasks
                    /kiro:spec-impl
```

## Phase 0: 計画（Linear）

Linearでプロジェクト全体の作業を計画・管理する。

### イシュー作成

```bash
# 新規イシュー作成
/linear:create -t "カレンダーに週表示を追加" -d "現在の月表示に加え、週単位の表示切替を実装する"

# 即座にブランチ作成して作業開始する場合
/linear:create -t "タイトル" -d "説明" --start
```

### イシュー詳細化

```bash
# イシューを対話的に深掘り（詳細補強・サブタスク分解・プロジェクト昇格）
/linear:refine DIS-XX

# 全フェーズを対話なしで自動適用
/linear:refine DIS-XX --auto

# 詳細補強のみスキップ（分解判定から開始）
/linear:refine DIS-XX --skip-refine

# サブタスク分解をスキップ（詳細補強のみ）
/linear:refine DIS-XX --skip-split
```

品質スコア（タイトル・説明文・優先度・見積もり・ラベル・受け入れ条件）を分析し、不足項目を対話的に補強する。スコープに応じてサブタスク分解やプロジェクト昇格も実行する。

### イシュー一覧・選択

```bash
/linear:list                    # 自分のイシュー一覧
/linear:list --state "Todo"     # ステータスでフィルタ
/linear:status                  # チーム全体の進捗サマリー
```

### イシュー粒度の目安

| サイズ | 目安 | SDD適用 | 例 |
|--------|------|---------|-----|
| S | 数時間 | 不要（直接実装） | typo修正、スタイル調整 |
| M | 1-2日 | 推奨 | 新規コンポーネント、API追加 |
| L | 3-5日 | 必須 | 新機能、アーキテクチャ変更 |
| XL | 1週間+ | 必須（分割推奨） | 大機能、DB設計変更 |

**判断基準**: 複数ファイルにまたがる変更、DB変更を伴う場合、新しいアーキテクチャパターンを導入する場合は SDD を適用する。

## Phase 1: 仕様策定（SDD）

Linear イシューの要件を SDD で正式な仕様に落とし込む。

### Step 1: 仕様初期化

```bash
/kiro:spec-init "Linear Issue DIS-XX の説明をここに記述"
```

`.kiro/specs/{feature-name}/` に仕様ディレクトリが作成される。

### Step 2: 要件定義

```bash
/kiro:spec-requirements {feature-name}
```

EARS形式で要件を記述。Linear イシューの説明・コメントがインプットになる。

既存コードとの整合性を確認したい場合:
```bash
/kiro:validate-gap {feature-name}
```

### Step 3: 技術設計

```bash
/kiro:spec-design {feature-name}       # 対話的に設計
/kiro:spec-design {feature-name} -y    # 自動承認モード
```

要件（WHAT）を技術設計（HOW）に変換する。コンポーネント構成、データモデル、API設計を含む。

設計レビューが必要な場合:
```bash
/kiro:validate-design {feature-name}
```

### Step 4: タスク分解

```bash
/kiro:spec-tasks {feature-name}
```

設計を実装タスクに分解する。各タスクは Linear イシューのサブタスクに対応。

### 進捗確認

```bash
/kiro:spec-status {feature-name}    # 仕様のフェーズ進捗
```

## Phase 2: 実装

### 作業開始

```bash
/linear:start DIS-XX
```

- Linear ステータスが「In Progress」に自動更新
- Git ブランチが自動作成・チェックアウト

### SDD タスクに沿って実装

```bash
/kiro:spec-impl {feature-name}           # 全タスク順次実装
/kiro:spec-impl {feature-name} [tasks]   # 特定タスクのみ
```

TDDメソドロジーで実装される（テスト → 実装 → リファクタリング）。

### SDD を使わない小規模実装

S サイズのイシューは SDD を経由せず直接実装する:
```bash
/linear:start DIS-XX    # ブランチ作成
# 直接コーディング
/git:commit              # コミット
```

### 品質チェック

```bash
npx ultracite check      # lint + format
npm run type-check        # 型チェック
npx vitest run            # 単体テスト
npm run test:e2e          # E2E テスト（必要に応じて）
```

### コミット規約

Conventional Commits 形式:
```
feat(calendar): add week view toggle
fix(auth): handle expired session redirect
```

## Phase 3: 納品

### PR 作成

```bash
/linear:pr               # Linear Issue 情報から PR を自動生成（推奨）
/git:pr-cycle             # PR作成〜レビュー修正の統合フロー
```

### レビュー対応

```bash
/git:pr-review-fix        # PR コメントを確認して修正
/git:pr-cycle             # 状態に応じた自動アクション
```

### イシュー完了

PR マージ後:
```bash
/linear:update DIS-XX --state completed
```

実装検証が必要な場合:
```bash
/kiro:validate-impl {feature-name}
```

## 判断フローチャート

```
新しい作業が必要
    │
    ├─ バグ修正・軽微な変更？
    │   └─ YES → /linear:create → /linear:start → 直接実装 → /linear:pr
    │
    └─ 機能追加・設計変更？
        │
        ├─ イシューの詳細が不十分？
        │   └─ YES → /linear:refine DIS-XX → 品質補強・サブタスク分解
        │
        ├─ 要件が明確？
        │   ├─ YES → /kiro:spec-init → spec-requirements → spec-design → spec-tasks → spec-impl
        │   └─ NO  → /kiro:spec-init → spec-requirements（要件を対話的に洗い出し）
        │
        └─ 既存コードへの影響大？
            └─ YES → /kiro:validate-gap で影響分析してから設計
```

## コマンド早見表

| フェーズ | コマンド | 用途 |
|---------|---------|------|
| 計画 | `/linear:create` | イシュー作成 |
| 計画 | `/linear:refine` | イシュー詳細化（品質補強・分解・昇格） |
| 計画 | `/linear:list` | イシュー一覧 |
| 計画 | `/linear:status` | 進捗サマリー |
| 仕様 | `/kiro:spec-init` | 仕様初期化 |
| 仕様 | `/kiro:spec-requirements` | 要件定義 |
| 仕様 | `/kiro:spec-design` | 技術設計 |
| 仕様 | `/kiro:spec-tasks` | タスク分解 |
| 仕様 | `/kiro:spec-status` | 仕様進捗確認 |
| 実装 | `/linear:start` | 作業開始（ブランチ作成） |
| 実装 | `/kiro:spec-impl` | SDD タスク実装 |
| 実装 | `/git:commit` | コミット |
| 納品 | `/linear:pr` | PR 作成 |
| 納品 | `/git:pr-cycle` | PR ライフサイクル管理 |
| 納品 | `/linear:update` | イシュー完了 |
| 検証 | `/kiro:validate-gap` | 実装ギャップ分析 |
| 検証 | `/kiro:validate-design` | 設計レビュー |
| 検証 | `/kiro:validate-impl` | 実装検証 |

---
_計画から納品までの一連のフローを定義し、各フェーズの判断基準を明確にする_
