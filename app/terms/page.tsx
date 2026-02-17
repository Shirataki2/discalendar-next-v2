import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/static-page-layout";

export const metadata: Metadata = {
  title: "利用規約 | Discalendar",
  description:
    "Discalendarの利用規約です。本サービスをご利用の際には必ずお読みください。",
};

export default async function TermsPage() {
  return (
    <StaticPageLayout>
      <section className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="animate-fade-in-up">
            <h1 className="font-uni-sans-heavy text-3xl tracking-tight sm:text-4xl">
              利用規約
            </h1>
            <p className="mt-3 text-muted-foreground">
              DisCalendarをご利用いただくにあたっての利用条件です。
            </p>
            <span className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-muted-foreground text-xs">
              2020年12月1日 施行
            </span>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <article className="prose prose-neutral prose-legal dark:prose-invert animation-delay-100 max-w-none animate-fade-in-up">
          <p>
            この利用規約(以下「本規約」)は，DisCalendar(以下「本Bot」)や，本Botを含む，本Botの運営が提供するサービス全体(以下「本サービス」)を利用するにあたっての利用条件を定めたものです．
          </p>
          <p>本Botをご利用の際には必ずお読みいただくようお願い致します．</p>

          <h2>第1条 前提</h2>
          <ol>
            <li>
              本規約は本サービスを利用するすべての皆様(以下「ユーザー」)に適用されるものとする．
            </li>
            <li>
              本規約の掲載内容に対して，その内容の全てもしくは一部が日本国の定める法，及びDiscordの利用規約に反していた場合，本規約の該当する箇所に関しては一切の効力を有さないものとする．
            </li>
          </ol>

          <h2>第2条 利用</h2>
          <ol>
            <li>
              本サービスにおいて以下の機能を実行することを本サービスにおける利用と定義する
              <ul>
                <li>本BotをDiscordのサーバーに導入する</li>
                <li>本Botの提供するコマンドを実行する</li>
                <li>
                  本サービスの提供するWebサービスのログインページからリダイレクトされるDiscordのログインページでDiscordのユーザー情報を入力し，本Webサービスにログインする
                </li>
                <li>
                  本Webサービスのうち，ログイン後に利用可能なサービスを実行する
                </li>
              </ul>
            </li>
            <li>
              ユーザーは本サービスの利用をもって，本規約に同意したものとする．
            </li>
            <li>
              本運営は，ユーザーが以下の事由に該当すると判断した場合，そのユーザーのサービスの利用を拒否することができるものとする．
              <ul>
                <li>
                  Discordのほかのサーバーにおいて，スパム行為などの迷惑行為を行っていた場合
                </li>
                <li>Discordの利用規約に違反していた場合</li>
                <li>第3条に示す禁止事項に繰り返し違反していた場合</li>
                <li>
                  その他，本運営がユーザーが利用することで本運営が不利益を被ると判断した場合
                </li>
              </ul>
            </li>
          </ol>

          <h2>第3条 禁止事項</h2>
          <p>
            ユーザーは本サービスの利用に際して，以下の行為をしてはならないものとする．
          </p>
          <ol>
            <li>法令や公序良俗に反する行為や，それを助長する行為</li>
            <li>本サービスに対して故意に負荷をかける行為</li>
            <li>本運営に対する妨害行為</li>
            <li>正規ではない方法で本サービスのデータにアクセスする行為</li>
            <li>
              本サービスを利用する他のユーザーを含む第三者の個人情報をみだりに収集する行為
            </li>
            <li>
              他のユーザーや，本サービスの提供するコンテンツ，および本運営に対し誹謗中傷や差別的な発言を行う行為
            </li>
            <li>
              犯罪行為や反社会的勢力への一切の関与行為やそれを助長する行為
            </li>
            <li>その他，本運営が不適切と判断した行為</li>
          </ol>

          <h2>第4条 免責事項</h2>
          <ol>
            <li>
              本サービスは事前に予告を行ったかにかかわらず，本サービスに記載されている情報や提供するサービスを変更することがある．
            </li>
            <li>
              本サービスはメンテナンスや機能の追加など，サービスの中断が適当と判断した際にサービスの提供を中断することができるものとする．
            </li>
            <li>
              本サービスは，運営者の都合や自然災害など，その他本サービスの継続が困難と判断する状況が発生した際，本サービスの提供を中止できるものとする．
            </li>
            <li>
              本サービスの機能を利用されたことで直接・間接的に生じた損失に関し本サービスは一切の責任を負わないものとする．
            </li>
          </ol>

          <h2>第5条 本規約の変更</h2>
          <p>
            本規約は，本サービスの定める連絡手段で連絡を行った後に変更されることがある．
          </p>

          <h2>第6条 準拠法及び裁判管轄</h2>
          <p>
            本規約の解釈は日本法を準拠法とし，東京地方裁判所を専属的合意管轄裁判所とする．
          </p>
        </article>
      </div>
    </StaticPageLayout>
  );
}
