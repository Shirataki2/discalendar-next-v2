# Requirements Document

## Introduction
カレンダー画面にイベント検索・フィルタ機能を追加し、イベント数が増加した際のナビゲーション効率を改善する。キーワードによる部分一致検索とリアルタイム絞り込みをクライアントサイドで実装し、モバイル・デスクトップの両環境で快適に利用できるUIを提供する。

## Requirements

### Requirement 1: キーワード検索
**Objective:** ユーザーとして、キーワードでイベントを検索したい。多数のイベントから目的のイベントを素早く見つけるため。

#### Acceptance Criteria
1. The CalendarToolbar shall 検索入力フィールドを表示する
2. When ユーザーが検索フィールドにテキストを入力した時, the CalendarContainer shall イベントタイトルに対して大文字小文字を区別しない部分一致でフィルタリングする
3. When ユーザーが検索フィールドにテキストを入力した時, the SearchInput shall 300msのデバウンスを適用してからフィルタリングを実行する
4. When 検索クエリに一致するイベントがない時, the CalendarGrid shall 「一致するイベントが見つかりません」という空状態メッセージを表示する
5. When ユーザーが検索フィールドのクリアボタンをクリックした時, the CalendarContainer shall 検索フィルタを解除して全イベントを表示する

### Requirement 2: 検索UIのレスポンシブ対応
**Objective:** ユーザーとして、モバイルでもデスクトップでも快適に検索したい。どのデバイスからでも同じ機能にアクセスできるようにするため。

#### Acceptance Criteria
1. While デスクトップ表示の時, the CalendarToolbar shall 検索フィールドをツールバー内にインラインで表示する
2. While モバイル表示の時, the CalendarToolbar shall 検索アイコンボタンを表示し、タップで検索フィールドを展開する
3. When モバイルで検索フィールドが展開された時, the SearchInput shall 画面幅いっぱいに拡張して入力しやすいサイズを確保する

### Requirement 3: 検索状態の視覚的フィードバック
**Objective:** ユーザーとして、検索が適用されていることを視覚的に把握したい。フィルタの有無を常に認識できるようにするため。

#### Acceptance Criteria
1. While 検索フィルタが適用されている時, the CalendarToolbar shall 一致件数を表示する
2. While 検索フィルタが適用されている時, the CalendarGrid shall フィルタに一致しないイベントを非表示にする
3. When ユーザーが検索をクリアした時, the CalendarGrid shall 即座に全イベントを再表示する

### Requirement 4: アクセシビリティ
**Objective:** すべてのユーザーが検索機能を利用できるようにしたい。アクセシビリティ標準に準拠するため。

#### Acceptance Criteria
1. The SearchInput shall 適切なaria-label属性を持つ
2. When 検索結果の件数が変化した時, the CalendarToolbar shall aria-liveリージョンで結果件数を通知する
3. The SearchInput shall キーボード操作のみで検索の入力・クリアが完了できる
