export function DocsCommands() {
  return (
    <article className="prose prose-lg prose-docs dark:prose-invert">
      <p>Discalendarで使用できるDiscordスラッシュコマンドの一覧です。</p>

      <h2>/init</h2>
      <p>Botの通知の送信先をこのコマンドが送信されたチャンネルに設定します。</p>
      <p>
        このコマンドは「メッセージの管理」「サーバーの管理」「ロールの管理」「管理者」のいずれかの権限を持っている方、もしくはサーバーのオーナーが実行できます。
      </p>

      <h2>/list</h2>
      <p>開催予定の予定のリストを表示できます。</p>
      <p>
        <code>/list 過去</code>や<code>/list 全て</code>
        と入力することで、過去に開催したイベントなどを表示することもできます。
      </p>

      <h2>/create</h2>
      <p>
        Discord上から直接、予定を作成できます。引数の説明はDiscordが自動で補完してくれます。
      </p>

      <h2>/help</h2>
      <p>
        ヘルプメッセージを表示します。コマンドの使い方がわからない場合はこちらを参照してください。
      </p>

      <h2>/invite</h2>
      <p>
        Botを自分のサーバーに参加させるためのリンクを表示します。他のサーバーにもBotを導入したい場合に使用してください。
      </p>
    </article>
  );
}
