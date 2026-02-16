import type { Metadata } from "next";
import { StaticPageLayout } from "@/components/static-page-layout";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Discalendar",
  description:
    "Discalendarのプライバシーポリシーです。個人情報の取り扱いについて説明します。",
};

export default async function PrivacyPage() {
  return (
    <StaticPageLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>プライバシーポリシー</h1>

        <h2>収集する個人情報</h2>
        <p>
          DisCalendar(以下「本サービス」)は，サービスの利用時にDiscordのユーザID，ユーザネームおよび所属しているDiscordのサーバーのID及び名前を取得及び保存しています．
        </p>
        <p>
          また，当サイトではホームページの利用状況を把握するためにGoogle
          Analytics を利用しています．Google Analytics から提供されるCookie
          を使用していますが，Google Analytics
          によって個人を特定する情報は取得していません．Google Analytics
          の利用により収集されたデータは、Google社のプライバシーポリシーに基づいて管理されています。Google
          Analyticsの利用規約・プライバシーポリシーについてはGoogle Analytics
          のホームページでご確認ください。
        </p>
        <ul>
          <li>
            <a
              href="https://www.google.co.jp/analytics/terms/jp.html"
              rel="noopener noreferrer"
              target="_blank"
            >
              Google アナリティクス サービス利用規約
            </a>
          </li>
          <li>
            <a
              href="https://policies.google.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Googleポリシーと規約
            </a>
          </li>
        </ul>
        <p>
          なお，Google
          Analyticsのサービス利用による損害については、本運営は責任を負わないものとします．
        </p>

        <h2>個人情報の利用目的</h2>
        <p>本サービスは，収集した個人情報を以下の目的で利用します．</p>
        <ol>
          <li>本人の認証のため</li>
          <li>本サービスで発生した不具合に対応するため</li>
          <li>その他，利用目的に付随する目的のため</li>
        </ol>

        <h2>個人情報の第三者への提供</h2>
        <p>
          本サービスは以下の場合において，ユーザーの個人情報を第三者に提供することがあります．
        </p>
        <ul>
          <li>本人の同意がある場合</li>
          <li>
            国の機関若しくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
          </li>
          <li>
            裁判所，検察庁，警察またはこれらに準じた権限を有する機関から，個人情報についての開示を求められた場合
          </li>
          <li>法令により開示または提供が許容されている場合</li>
        </ul>

        <h2>免責事項</h2>
        <p>
          利用者によって投稿されたデータなど，他の利用者が容易にアクセス可能な情報に個人情報等プライバシーに関する情報が記載されていた場合，その投稿内容に対する補償は致しかねます．
        </p>

        <h2>プライバシーポリシーの改定について</h2>
        <p>
          本サービスは法令の変更又はサービス提供内容の変更に伴い，本プライバシーポリシーを変更することがあります．
        </p>

        <p className="text-muted-foreground text-sm">2020年12月1日 制定</p>
      </article>
    </StaticPageLayout>
  );
}
