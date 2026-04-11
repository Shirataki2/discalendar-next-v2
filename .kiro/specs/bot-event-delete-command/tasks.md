# Implementation Plan

- [ ] 1. サービス層に events 物理削除関数を追加する
- [ ] 1.1 deleteEvent 関数のテストを先に書く
  - 既存の event-service の単体テストファイルに deleteEvent 用のテストケースを追加する
  - 成功時に Result 型の success が true、data が undefined を返すことを検証する
  - Supabase 側から error が返ったケースで Result 型の failure と DELETE_FAILED 系のドメインコードへの変換を検証する
  - id と guild_id の複合条件で eq チェーンが組み立てられることを Supabase クライアントの mock で検証する
  - 失敗時に既存の構造化ロガーが eventId と guildId を含むコンテキストでエラーを記録することを検証する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.3_

- [ ] 1.2 deleteEvent 関数を実装する
  - Bot 側 event-service モジュールに deleteEvent をエクスポート関数として追加する
  - Supabase クライアントから events テーブルに対し id と guild_id の複合条件で物理削除を実行する
  - Supabase エラーは既存の classifySupabaseError を operation 名 delete で呼び ServiceError に変換する
  - 失敗時に既存の logger を使い error レベルで eventId と guildId を含むコンテキストを記録する
  - 既存の getEventById や updateEvent と同じ Result 型 (ServiceResult<void>) パターンを踏襲する
  - 実装後に該当ファイルの単体テストを実行し全 PASS を確認する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.3_

- [ ] 2. delete スラッシュコマンドハンドラを実装する
- [ ] 2.1 delete コマンドのテストを先に書く
  - 新規 delete コマンド用の単体テストファイルを Bot コマンドのテスト規約に沿って作成する
  - ギルド外実行時に「サーバーでのみ実行可能」エフェメラル応答を返し、サービス層が呼ばれないことを検証する
  - guild config 取得失敗時にエフェメラルでエラーメッセージを返し処理が中断することを検証する
  - restricted モードで権限不足ユーザーに権限エラーが返り、findEventByName と deleteEvent が呼ばれないことを検証する
  - restricted モードで管理権限保有者は確認 UI 表示まで進むことを検証する
  - 通常モード (restricted 無効) では権限チェックがスキップされ全員が確認 UI に進めることを検証する
  - findEventByName が null を返した場合に直近イベントヒント付きエラーが返り deleteEvent が呼ばれないことを検証する
  - findEventByName がエラーを返した場合に検索エラーがログに記録され、ユーザーには簡潔なエラー埋め込みが返ることを検証する
  - 確認ボタン押下で deleteEvent が呼ばれ、削除成功時に成功メッセージが editReply されることを検証する
  - キャンセルボタン押下で deleteEvent が呼ばれず、キャンセルメッセージが editReply されることを検証する
  - コマンド実行者以外がボタンを押した場合に操作不可エフェメラル応答が返り、deleteEvent が呼ばれないことを検証する
  - deleteEvent が失敗した場合にエラー埋め込みが editReply され、ロガーに error が記録されることを検証する
  - 削除成功時に info ログへ guildId と userId と eventId とイベント名が含まれることを検証する
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_

- [ ] 2.2 delete コマンドの SlashCommandBuilder 定義と実行ロジックを実装する
  - SlashCommandBuilder で /delete コマンドを定義し、必須の event 文字列オプション (最大 100 文字) と日本語の説明を設定する
  - execute 関数の冒頭でギルド外実行を弾き、エフェメラル reply で早期終了する
  - インタラクションの応答制限を超えないよう deferReply をエフェメラル属性付きで即座に呼ぶ
  - guild-service の getGuildConfig を呼び出し、エラー時はロガーにエラーを記録し、ユーザーへエフェメラルで失敗を通知して中断する
  - ギルド設定の restricted フラグが true の場合のみ utils permissions の hasManagementPermission を呼び、権限不足時は所定の権限要件メッセージを返して中断する
  - attendee-service の findEventByName で部分一致検索を行い、エラー時はロガーに記録し簡潔なエラー埋め込みで応答する
  - 検索結果が null の場合は event-service の getEventsByGuildId で取得した直近イベント (最大 5 件) を hint として整形し、エラー埋め込みで応答する
  - 検索ヒット時は createEventEmbed で対象イベントの埋め込みを生成し、確認メッセージとして editReply する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2.3 削除確認 UI のボタンと collector を実装する
  - ButtonBuilder で「削除する」(Danger) と「キャンセル」(Secondary) の 2 ボタンを ActionRow にまとめ、確認メッセージに添付する
  - 確認メッセージは引き続きエフェメラル属性を維持する (deferReply で確定済み)
  - editReply の戻り値に対し createMessageComponentCollector を ComponentType.Button と 60 秒タイムアウトで開始する
  - collector の collect イベントでコマンド実行者以外を判定し、操作不可メッセージをエフェメラル reply で返して握りつぶす
  - 実行者本人がキャンセルボタンを押した場合は「削除をキャンセルしました」と非活性化ボタンで editReply し collector を停止する
  - 実行者本人が削除ボタンを押した場合は事前に保存した EventRecord を用いて event-service の deleteEvent を呼び出す
  - deleteEvent の成功時は「予定を削除しました: <イベント名>」と非活性化ボタンで editReply し、構造化 info ログを記録する
  - deleteEvent の失敗時はロガーに error を記録し、エラー埋め込みで非活性化ボタン付きの editReply を返す
  - collect 1 回完了後 collector.stop を呼び 1 回限りの操作受信を保証する
  - collector の end イベント (タイムアウト) では「タイムアウトしました。削除はキャンセルされました」と非活性化ボタンで editReply し、メッセージ削除済みなどの例外は try/catch で握りつぶす
  - 想定外例外の握り潰しは bot.ts 既存の safeReplyError 経路に委ねる (本コマンドでは追加の try/catch を入れない)
  - 実装後に該当ファイルの単体テストを実行し全 PASS を確認する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_

- [ ] 3. delete コマンドを Bot に登録する
  - Bot エントリ (bot.ts) のコマンドインポートに新規 delete コマンドを追加する
  - loadCommands の配列に delete コマンドを追加し、起動時のスラッシュコマンド登録に含まれるようにする
  - bot.ts のコマンド読み込みパスとアルファベット順 (既存規約に合わせる) を確認する
  - Bot の type-check と既存テストをローカル実行し回帰がないことを確認する
  - _Requirements: 1.1_
