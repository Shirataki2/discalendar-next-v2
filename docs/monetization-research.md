# マネタイズ基盤 導入調査

> **作成日**: 2026-05-03
> **ステータス**: 初版（調査・推奨案）
> **関連**: [feature-expansion-plan.md §3 マネタイズ戦略](./feature-expansion-plan.md)

## 0. エグゼクティブサマリー

Discalendar に「**ユーザー単位課金**」「**ギルド単位課金**」「**Donate（寄付）**」の 3 軸でマネタイズ基盤を導入するための調査ドキュメント。`feature-expansion-plan.md §3` の戦略を、決済プラットフォーム比較・実装アーキテクチャ・DB スキーマ・段階的ロールアウト計画として具体化する。

**結論（推奨アーキテクチャ）:**

| 課金モデル | プライマリ | セカンダリ | 理由 |
|-----------|----------|-----------|------|
| ユーザー単位サブスク (Pro) | **Stripe Billing** | Discord User Subscription | Web ダッシュボードからの導線が中心。Stripe で一元管理しつつ、Discord 内導線も用意 |
| ギルド単位サブスク (Guild Pro) | **Stripe Billing** | Discord Guild Subscription | 管理者が Web から契約。Discord 経由で購入したいギルドにも対応 |
| Donate | **Buy Me a Coffee** または **GitHub Sponsors** | Stripe（任意金額決済） | 寄付は登録摩擦の低い外部プラットフォームを優先。Stripe は将来オプション |

**最小公約数の方針:**
- **Stripe を中核に据える**（料率・運用・インボイス制度対応・カスタマーポータルが揃う）
- Discord App Subscriptions は「Discord 内で完結したい層」向けの補助チャネルとして後追いで対応（Phase 2）
- 寄付は **本体に決済を組み込まず外部リンク** から開始（実装ゼロでローンチ可能、段階的に内製化）

---

## 1. 現状分析

### 1.1 既存スキーマで使えるもの

| テーブル | 用途 | 課金統合の余地 |
|---------|------|---------------|
| `guilds` (`guild_id`, `name`, ...) | ギルド情報 | ギルド単位サブスクの紐づけ先 |
| `user_guilds` (`user_id`, `guild_id`, `permissions`) | メンバーシップ・権限ビット | 課金ゲーティングの権限判定基盤として再利用可能 |
| `auth.users` (Supabase) | ユーザー識別 | ユーザー単位サブスクの紐づけ先 |
| `guild_config.restricted` 等の設定パターン | Server Action + Switch トグル | プラン制限 UI の参考実装として流用可能 |

### 1.2 既存技術スタックとの親和性

- **Next.js 16 App Router + Server Actions**: Stripe Checkout Session の作成は Server Action で実装可能（API ルート不要）
- **Supabase (PostgreSQL + Cookie SSR)**: Stripe webhook で受信したイベントを Supabase に同期する 2026 年の SaaS 標準スタック
- **Discord Bot (`packages/bot`, discord.js v14)**: Discord App Subscriptions の Entitlement Gateway イベントを購読可能
- **既存の `service_role` バイパスパターン**: Bot 側で Entitlement を直接更新するのに利用可能
- **Sentry / PostHog 導入済み**: 決済関連エラー監視・コンバージョン計測に流用

### 1.3 制約・前提

- **個人開発・少人数運営**: 適格請求書発行事業者登録の事務負担を最小化したい → Stripe Tax / Stripe Invoicing の自動化を活用
- **日本語ユーザーが大半**: 円建て決済・JCB 対応・コンビニ決済が望ましい
- **Discord 認証ベース**: メールアドレス（Stripe Customer 作成時に必要）は Discord OAuth から取得済み
- **Web と Bot の二系統**: 課金状態は両方から参照される。**Single Source of Truth は Supabase の `subscriptions` / `entitlements` テーブル**

---

## 2. 決済プラットフォーム比較

### 2.1 サブスクリプション系

| プラットフォーム | 手数料 | 強み | 弱み | 推奨度 |
|----------------|-------|------|------|-------|
| **Stripe Billing** (JP) | 3.6% + Billing 0.7% | 円建て・JCB・コンビニ・適格請求書対応・Customer Portal・Webhook 完備・Server Actions と相性良い | 個別実装が必要、税務処理は自前 | ★★★★★ |
| **Discord App Subscriptions** | 15%（$1M まで）+ 決済手数料 | Discord 内で完結、ユーザー摩擦最小、Bot との統合容易 | 月額のみ（年額不可）、SKU 上限 50、Web 導線が弱い | ★★★★☆（補助） |
| **Paddle** | 5% + $0.50 | Merchant of Record（消費税・インボイス代行） | 円建て対応の限定、日本語サポート薄 | ★★☆☆☆ |
| **LemonSqueezy** | 5% + $0.50 | MoR、開発者フレンドリー | 日本市場対応がまだ限定的 | ★★☆☆☆ |
| **Pay.jp / Komoju** | 3.0〜3.6% | 国産・日本語サポート | エコシステムが小さい、Subscription 機能が Stripe より弱い | ★★★☆☆ |

> **MoR (Merchant of Record)**: Paddle / LemonSqueezy はインボイス・消費税徴収を代行するため、税務処理を簡素化したい個人開発者には魅力。ただし Discord ユーザー向けのコミュニティサービスとしては、**Stripe + 適格請求書発行事業者登録** の方が長期的にトータルコストが低い。

### 2.2 Donate 系

| プラットフォーム | 手数料 | 強み | 弱み | 推奨度 |
|----------------|-------|------|------|-------|
| **Buy Me a Coffee** | 5% + 決済手数料 | Webhook 対応、サブスク・単発両対応、軽量 UI | 日本語 UI が弱い、円建て表記が限定 | ★★★★☆ |
| **GitHub Sponsors** | 0%（GitHub 直）/ 10%（OSC 経由） | OSS プロジェクトと相性、開発者層に訴求 | 一般ユーザーにリーチしにくい | ★★★★☆ |
| **Pixiv FANBOX** | 10% + 決済手数料 | 日本語 UI・JP ユーザー親和性高 | 配信・イラスト系が中心、Bot/SaaS 文化と乖離 | ★★☆☆☆ |
| **Patreon** | 8〜12% + 決済手数料 | グローバル認知度 | 日本市場ではマイナー、料率高 | ★★☆☆☆ |
| **Liberapay** | 0%（決済手数料のみ） | 完全非営利 | 日本ユーザー認知度ほぼゼロ | ★☆☆☆☆ |
| **Open Collective** | 5〜13%（fiscal host 依存） | OSS 透明会計 | 個人開発の用途には過剰 | ★★☆☆☆ |
| **Stripe（独自実装）** | 3.6% | 統合・データ管理が容易 | UI を内製する必要あり | ★★★☆☆ |

**ハイブリッド推奨:** **Buy Me a Coffee（メイン）+ GitHub Sponsors（OSS 訴求）** を外部リンクとして並べる。Phase 3 で Stripe 任意金額決済を内製。

---

## 3. アーキテクチャ設計

### 3.1 全体構成図

```
┌────────────────────────────────────────────────────────────────┐
│                        ユーザー導線                              │
│  ① Web Dashboard → /pricing → Stripe Checkout (Pro / Guild Pro) │
│  ② Discord 内 → /upgrade → Discord App Subscriptions            │
│  ③ Web フッター → /donate → Buy Me a Coffee / GitHub Sponsors   │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                     決済プラットフォーム                          │
│  Stripe          Discord                  外部寄付                │
│   ↓ webhook       ↓ ENTITLEMENT_*           (記録のみ)            │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                   Supabase (Single Source of Truth)              │
│  ・stripe_customers     ・stripe_subscriptions                   │
│  ・discord_entitlements ・donations (任意)                       │
│  ・plan_features (静的マスタ)                                    │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    機能ゲーティング層                             │
│  Server Component → checkPlan(userId, guildId, feature)         │
│  Server Action  → Plan 再検証 (クライアント信頼しない)           │
│  Bot Command   → Entitlement 確認 (service_role)                │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Plan 解決ロジック

ユーザーがある機能にアクセス可能か判定する単一の関数を Web/Bot 両方から呼び出せる形で用意する。

```typescript
// lib/billing/plan-resolver.ts (Web 用)
type Plan = 'free' | 'pro' | 'guild_pro' | 'enterprise';

interface PlanResolution {
  effectivePlan: Plan;        // ユーザー＋ギルドの最良プラン
  userPlan: Plan;             // ユーザー単位サブスク
  guildPlan: Plan | null;     // 当該ギルドのサブスク
  source: 'stripe' | 'discord' | 'free';
}

async function resolvePlan(
  userId: string,
  guildId: string | null
): Promise<PlanResolution> {
  // 1. Stripe ユーザーサブスクを確認
  // 2. Discord ユーザーEntitlementを確認
  // 3. ギルド指定時: Stripe ギルドサブスク + Discord ギルドEntitlement
  // 4. 最も上位のプランを effectivePlan として返す
}

function isFeatureAvailable(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}
```

**重要原則:**
- **ユーザープランとギルドプランは「論理 OR」**: どちらか高い方を採用
- **Stripe と Discord は「論理 OR」**: 同じプランを二重で支払うことはないが、Source of Truth は両方を見る
- **クライアント側の Plan 表示は参考程度**: Server Action/Route Handler で必ず再検証

### 3.3 Webhook 処理フロー

#### Stripe Webhook（`app/api/webhooks/stripe/route.ts`）

監視するイベント:
- `checkout.session.completed` — 購入確定（**注文確定はここでのみ実施**）
- `customer.subscription.created` — 新規サブスク作成
- `customer.subscription.updated` — プラン変更・更新
- `customer.subscription.deleted` — キャンセル完了
- `invoice.payment_succeeded` — 課金成功
- `invoice.payment_failed` — 支払い失敗（メール通知 + ステータス更新）

実装ポイント:
- `stripe.webhooks.constructEvent()` で署名検証必須
- 冪等性キー: `event.id` を `stripe_webhook_events` テーブルに保存して重複処理を防止
- service_role の Supabase クライアントで RLS をバイパスして書き込み

#### Discord Gateway イベント（Bot 側）

監視するイベント:
- `ENTITLEMENT_CREATE` — 新規購入
- `ENTITLEMENT_UPDATE` — 更新（renew, cancel 予約）
- `ENTITLEMENT_DELETE` — 失効

実装ポイント:
- `packages/bot/src/events/entitlements.ts` を新設
- Bot は `service_role` で Supabase に直接書き込み
- User SKU と Guild SKU の判別は `entitlement.user_id` / `entitlement.guild_id` の有無で行う

---

## 4. DB スキーマ案

`feature-expansion-plan.md §3.4` の案を拡張し、ユーザー課金・冪等性・Donate を追加する。

### 4.1 マイグレーション設計

```sql
-- Stripe 顧客マスタ（auth.users と 1:1）
CREATE TABLE stripe_customers (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe サブスクリプション（ユーザー or ギルド）
CREATE TYPE subscription_owner_type AS ENUM ('user', 'guild');
CREATE TYPE subscription_plan AS ENUM ('pro', 'guild_pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete');

CREATE TABLE stripe_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    -- 課金対象（user_id か guild_id のどちらかが必須）
    owner_type subscription_owner_type NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guild_id VARCHAR(32) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    -- プラン情報
    plan subscription_plan NOT NULL,
    price_id VARCHAR(255) NOT NULL,           -- Stripe Price ID
    status subscription_status NOT NULL,
    -- 期間
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    -- メタデータ
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 整合性: owner_type に応じた ID が設定されていること
    CONSTRAINT chk_owner_id_consistency CHECK (
        (owner_type = 'user' AND user_id IS NOT NULL AND guild_id IS NULL)
        OR (owner_type = 'guild' AND guild_id IS NOT NULL AND user_id IS NOT NULL)
        -- guild サブスクも誰が契約したか追跡するため user_id 必須
    )
);

CREATE INDEX idx_stripe_subs_user ON stripe_subscriptions(user_id) WHERE owner_type = 'user';
CREATE INDEX idx_stripe_subs_guild ON stripe_subscriptions(guild_id) WHERE owner_type = 'guild';
CREATE INDEX idx_stripe_subs_status ON stripe_subscriptions(status);

-- Discord Entitlements
CREATE TABLE discord_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_entitlement_id VARCHAR(32) UNIQUE NOT NULL,
    discord_sku_id VARCHAR(32) NOT NULL,
    -- 紐づけ
    discord_user_id VARCHAR(32),              -- User SKU の場合
    guild_id VARCHAR(32) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    -- 期間
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,                      -- NULL = アクティブ無期限（renewing）
    is_consumed BOOLEAN NOT NULL DEFAULT false, -- OTP（One-Time Purchase）用
    raw_payload JSONB NOT NULL,               -- 元イベント保存
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discord_ent_user ON discord_entitlements(discord_user_id) WHERE discord_user_id IS NOT NULL;
CREATE INDEX idx_discord_ent_guild ON discord_entitlements(guild_id) WHERE guild_id IS NOT NULL;
CREATE INDEX idx_discord_ent_active ON discord_entitlements(ends_at) WHERE ends_at IS NULL OR ends_at > NOW();

-- Webhook 冪等性（Stripe / Discord 共用）
CREATE TABLE billing_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'discord')),
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, event_id)
);

-- Donate 記録（任意・最初は無くてもよい）
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL,            -- 'buymeacoffee', 'github_sponsors', 'stripe', 'manual'
    external_id VARCHAR(255),                 -- 外部 ID
    amount_jpy INT,                           -- 円換算
    message TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false, -- 「Supporters」ページ掲載許可
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 RLS ポリシー

```sql
-- 既存の認証ポリシー方針を踏襲（クライアントは読み取りのみ、書き込みは SECURITY DEFINER 経由）
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスクのみ読み取り可
CREATE POLICY "users_read_own_subscriptions" ON stripe_subscriptions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            owner_type = 'guild'
            AND guild_id IN (SELECT user_guild_ids())
        )
    );

-- discord_entitlements も同様
CREATE POLICY "users_read_own_entitlements" ON discord_entitlements
    FOR SELECT TO authenticated
    USING (
        guild_id IN (SELECT user_guild_ids())
        OR discord_user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
    );

-- billing_webhook_events は service_role のみ
CREATE POLICY "service_role_only_webhooks" ON billing_webhook_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 4.3 プラン特性の静的マスタ

DB に持たず、TypeScript の定数として `lib/billing/plans.ts` に定義する（変更頻度低・バージョン管理しやすい）。

```typescript
export const PLAN_FEATURES = {
  free: ['calendar_basic', 'event_create_50', 'notification_1'],
  pro: ['calendar_basic', 'event_unlimited', 'notification_10', 'recurring', 'gcal_sync', 'ical_export'],
  guild_pro: [...PLAN_FEATURES.pro, 'rsvp', 'webhook', 'custom_embed', 'stats_dashboard'],
  enterprise: [...PLAN_FEATURES.guild_pro, 'custom_bot', 'sla', 'priority_support'],
} as const;

export const PLAN_LIMITS = {
  free: { events_per_month: 50, notifications_per_event: 1 },
  pro: { events_per_month: Infinity, notifications_per_event: 10 },
  guild_pro: { events_per_month: Infinity, notifications_per_event: 10 },
  enterprise: { events_per_month: Infinity, notifications_per_event: Infinity },
} as const;
```

---

## 5. 実装パターン

### 5.1 Stripe Checkout 起動（Server Action）

```typescript
// app/(billing)/pricing/actions.ts
"use server";

export async function startCheckout(input: {
  plan: 'pro' | 'guild_pro';
  guildId?: string;        // Guild Pro 時は必須
}): Promise<Result<{ url: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'unauthorized' };

  // ギルド購入時は管理者権限を再確認（既存の権限ビット判定を流用）
  if (input.plan === 'guild_pro' && input.guildId) {
    const isAdmin = await checkGuildAdmin(user.id, input.guildId);
    if (!isAdmin) return { success: false, error: 'forbidden' };
  }

  // Stripe Customer の取得 or 作成
  const customer = await getOrCreateStripeCustomer(user);

  // Checkout Session 作成
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.stripe_customer_id,
    line_items: [{ price: priceIdFor(input.plan), quantity: 1 }],
    metadata: {
      user_id: user.id,
      guild_id: input.guildId ?? '',
      plan: input.plan,
      owner_type: input.plan === 'guild_pro' ? 'guild' : 'user',
    },
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    // 適格請求書のための税情報
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
  });

  return { success: true, data: { url: session.url! } };
}
```

### 5.2 Webhook ハンドラ（Route Handler）

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';            // Edge ではなく Node 必須（生 body 必要）
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature')!;
  const body = await req.text();             // raw body
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // 冪等性チェック
  const supabase = createServiceRoleClient();
  const { error: dupErr } = await supabase
    .from('billing_webhook_events')
    .insert({ provider: 'stripe', event_id: event.id, event_type: event.type, payload: event });
  if (dupErr?.code === '23505') return new Response('OK (duplicate)', { status: 200 });

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscriptionFromStripe(event.data.object);
      break;
    case 'invoice.payment_failed':
      await notifyPaymentFailure(event.data.object);
      break;
  }
  return new Response('OK', { status: 200 });
}
```

### 5.3 Bot 側の Entitlement ハンドリング

```typescript
// packages/bot/src/events/entitlement-create.ts
import { Events, type Entitlement } from 'discord.js';
import { syncDiscordEntitlement } from '../services/billing-service';

export const event = {
  name: Events.EntitlementCreate,
  async execute(entitlement: Entitlement) {
    await syncDiscordEntitlement(entitlement);
  },
};
```

```typescript
// packages/bot/src/services/billing-service.ts
import { supabaseService } from '../lib/supabase';

export async function syncDiscordEntitlement(e: Entitlement) {
  await supabaseService.from('discord_entitlements').upsert({
    discord_entitlement_id: e.id,
    discord_sku_id: e.skuId,
    discord_user_id: e.userId ?? null,
    guild_id: e.guildId ?? null,
    plan: skuIdToPlan(e.skuId),
    starts_at: e.startsAt?.toISOString() ?? new Date().toISOString(),
    ends_at: e.endsAt?.toISOString() ?? null,
    raw_payload: e.toJSON(),
  }, { onConflict: 'discord_entitlement_id' });
}
```

### 5.4 機能ゲーティング UI

```typescript
// components/billing/upgrade-gate.tsx
"use client";

interface Props {
  feature: FeatureKey;
  currentPlan: Plan;
  guildId?: string;
  children: ReactNode;
}

export function UpgradeGate({ feature, currentPlan, guildId, children }: Props) {
  if (isFeatureAvailable(currentPlan, feature)) return <>{children}</>;
  return (
    <UpgradePromptDialog
      requiredPlan={requiredPlanFor(feature)}
      guildId={guildId}
    />
  );
}
```

Server Action 側でも必ず再検証:
```typescript
"use server";
export async function createRecurringEvent(input: ...) {
  const plan = await resolvePlan(userId, guildId);
  if (!isFeatureAvailable(plan.effectivePlan, 'recurring')) {
    return { success: false, error: 'plan_required', requiredPlan: 'pro' };
  }
  // ...
}
```

---

## 6. Donate 実装の最小コスト案

> **設計意図**: 寄付は Phase 1 では決済を内製せず、外部リンクで開始する。実装ゼロでローンチでき、後から段階的に内製化できる。

### 6.1 Phase 1: 外部リンクのみ（実装コスト最小）

`/donate` ページを新設し、Buy Me a Coffee と GitHub Sponsors のリンクボタンを並べる。

```tsx
// app/(public)/donate/page.tsx
export default function DonatePage() {
  return (
    <article>
      <h1>Discalendar を支援する</h1>
      <p>サーバー費用・ドメイン費用に充てさせていただきます。</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <DonateCard
          provider="Buy Me a Coffee"
          description="一度きりの応援・継続メンバーシップ両対応"
          href="https://buymeacoffee.com/discalendar"
        />
        <DonateCard
          provider="GitHub Sponsors"
          description="GitHub アカウントで月額・単発スポンサー"
          href="https://github.com/sponsors/Shirataki2"
        />
      </div>
    </article>
  );
}
```

サイトフッター・ダッシュボードのユーザーメニューにリンクを追加する。

### 6.2 Phase 2: Buy Me a Coffee Webhook 連携（任意）

支援者を Web の「Supporters」ページに自動掲載したい場合に追加する。

- BMC ダッシュボードで Webhook URL を設定（`/api/webhooks/buymeacoffee`）
- `donation.created` / `membership.created` イベントを受信
- `donations` テーブルに `is_public = true` で記録（オプトイン UI を BMC メッセージに含める）
- Web で `SELECT * FROM donations WHERE is_public = true ORDER BY created_at DESC LIMIT 50` で表示

### 6.3 Phase 3: Stripe 任意金額 Donate（任意）

寄付決済を完全に内製化したくなった場合のみ実装。

- Stripe Checkout の `mode: 'payment'` + `submit_type: 'donate'` を使用
- 任意金額入力（最小 ¥100）
- Webhook で `donations` テーブルに記録
- 適格請求書発行は対応しない（寄付なので必要ない）

---

## 7. 段階的ロールアウト計画

### Phase 0: 準備（〜2週間）

| # | タスク | 担当 | 備考 |
|---|-------|------|------|
| 0.1 | Stripe アカウント開設・本人確認 | 運営 | 法人 or 個人事業主、適格請求書発行事業者登録（任意） |
| 0.2 | Discord Developer Portal で Monetization 申請 | 運営 | アプリの審査が入る場合あり |
| 0.3 | Buy Me a Coffee アカウント開設 | 運営 | プロフィール・カバー画像準備 |
| 0.4 | プラン体系・価格の最終決定 | 運営 | `feature-expansion-plan.md §3.1` を確定 |
| 0.5 | 利用規約・特定商取引法表記の更新 | 運営 + 法務 | 既存の `/terms` を改訂 |

### Phase 1: Donate（最小実装、〜1 週間）

最も摩擦が低く、実装コストが小さい寄付から開始してマネタイズの世論を立ち上げる。

| # | タスク | 依存 |
|---|-------|------|
| 1.1 | `/donate` ページを実装 | 0.3 |
| 1.2 | サイトフッター・ユーザーメニューに導線追加 | 1.1 |
| 1.3 | アナリティクス計測（PostHog）でクリック率を追跡 | 1.1 |

**KPI**: 月間 ¥3,000+（コーヒー 1〜2 杯/週）の寄付を獲得できればチャネルとして機能と判定。

### Phase 2: Stripe ユーザー Pro（〜1 ヶ月）

ユーザー単位の Pro プランを最初に提供する。ギルドプランより実装が単純（権限チェック不要）。

| # | タスク | 依存 |
|---|-------|------|
| 2.1 | DB マイグレーション（§4.1 の前半） | 0.1 |
| 2.2 | Stripe Customer 自動作成（初回ログイン時 or 初回 Checkout 時） | 2.1 |
| 2.3 | `/pricing` ページ + Checkout Server Action | 2.2 |
| 2.4 | Stripe Webhook Route Handler | 2.1 |
| 2.5 | `lib/billing/plan-resolver.ts` | 2.4 |
| 2.6 | Customer Portal リンク（プラン変更・キャンセル UI） | 2.4 |
| 2.7 | 機能ゲーティング: 繰り返しイベント・通知 10 件 | 2.5 |
| 2.8 | E2E テスト（Stripe Test Mode） | 2.7 |

**KPI**: ローンチ 1 ヶ月で Pro 加入者 5 名 / 転換率 1%

### Phase 3: Stripe ギルド Pro（〜1 ヶ月）

ユーザー Pro が安定運用できたらギルドプランを追加。

| # | タスク | 依存 |
|---|-------|------|
| 3.1 | ギルド管理者権限の再確認ロジック | 2.7 |
| 3.2 | ギルド設定画面に「ギルドをアップグレード」 UI | 3.1 |
| 3.3 | `resolvePlan` で Guild プランも考慮 | 2.5 |
| 3.4 | RSVP・カスタム Embed・統計ダッシュボード等の Guild Pro 機能ゲーティング | 3.3 |
| 3.5 | ギルド管理者変更時の解約フロー検討（リファンドポリシー） | 3.4 |

**KPI**: ローンチ 1 ヶ月で Guild Pro 加入ギルド 3 サーバー / 転換率 1%

### Phase 4: Discord App Subscriptions（〜2 週間）

Discord 内で完結したい層向けの追加チャネル。

| # | タスク | 依存 |
|---|-------|------|
| 4.1 | Discord Developer Portal で SKU 作成（User SKU + Guild SKU） | 0.2 |
| 4.2 | Bot 側 Entitlement イベントハンドラ実装 | 4.1 |
| 4.3 | Bot コマンド `/upgrade` で Premium Button 表示 | 4.2 |
| 4.4 | `resolvePlan` で Discord Entitlement も考慮 | 4.2 |
| 4.5 | テスト Entitlement で動作確認 | 4.4 |

### Phase 5: 拡張（任意）

- 年額プラン（Stripe では即対応可、Discord 側は追って対応）
- チームプラン（Enterprise）
- 紹介報酬（Stripe Coupon + 招待リンク）
- Donate 内製化（§6.3）

---

## 8. リスク・考慮事項

### 8.1 法務・税務

| リスク | 対策 |
|--------|------|
| 適格請求書（インボイス制度）対応 | Stripe Tax + Stripe Invoicing を有効化。事業者登録は売上が一定規模に達してから検討 |
| 特定商取引法表記 | `/terms` 改訂時に運営者情報・連絡先・返金ポリシーを記載 |
| 消費税の自動徴収 | Stripe `automatic_tax` を有効化、JP の場合 10% 自動 |
| ギルド管理者交代時の課金引き継ぎ | 契約者（user_id）と現管理者が異なる場合の解約・移譲フローを設計（管理者変更を Bot が検知して通知） |
| 返金対応 | Stripe Dashboard から手動返金、ポリシーは「契約後 7 日以内、未使用分のみ」等を明記 |

### 8.2 セキュリティ

| リスク | 対策 |
|--------|------|
| Webhook 署名偽装 | `stripe.webhooks.constructEvent()` で必ず署名検証 |
| 重複処理 | `billing_webhook_events` テーブルで `event_id` の冪等性を担保 |
| クライアント側プラン操作 | Server Action / Route Handler で必ず再検証、`lib/billing/plan-resolver.ts` を Single Source of Truth に |
| 環境変数漏洩 | `STRIPE_SECRET_KEY` `STRIPE_WEBHOOK_SECRET` は Vercel/Secrets Manager で管理、コードに含めない |
| Stripe Customer ID と Discord User ID の紐づけミス | Checkout Session の `metadata` に必ず `user_id` を含めて Webhook で照合 |

### 8.3 UX

| 課題 | 対策 |
|-----|------|
| 「ギルド単位かユーザー単位かわかりにくい」問題 | Pricing ページで「個人で使う」「サーバーで使う」を明示的に分岐 |
| Discord と Stripe の二重支払い回避 | `resolvePlan` で OR 評価、UI 上「すでに Discord 内で購入済み」表示 |
| 解約後の即時 vs 期間末解約 | Stripe では `cancel_at_period_end` で期間末解約をデフォルトに、即時解約は Customer Portal から選択可能 |
| 無料プランの上限到達時のメッセージ | 「Pro にアップグレード」CTA + 制限内容の明示 |

### 8.4 運用

| 課題 | 対策 |
|-----|------|
| Webhook 配信失敗 | Stripe Dashboard でリトライ可能、Sentry で 5xx を監視 |
| データ整合性ずれ | 定期バッチ（cron）で Stripe API から全サブスクを再同期 |
| トライアル / 無料延長への対応 | Stripe Coupon で対応、`stripe_subscriptions.metadata` に理由を記録 |
| マルチアカウント・退会対応 | `auth.users` 削除時は ON DELETE CASCADE、Stripe Customer は手動で deactivate（API） |

---

## 9. オープン課題・要決定事項

ローンチ前に運営側で決定が必要な事項を以下に列挙する。

### 9.1 価格設定の確定
- [ ] Pro: ¥500/月 のままでよいか（年額割引の有無）
- [ ] Guild Pro: ¥1,500/月、ギルドメンバー数連動にするか
- [ ] Enterprise: 個別見積、最小金額の目安
- [ ] 無料トライアル期間（Stripe では 7/14/30 日が一般的）

### 9.2 プラン機能の最終配分
- [ ] 繰り返しイベントは Pro 限定でよいか（無料でも基本機能なので開放するか議論あり）
- [ ] Google Calendar 連携の Pro 配置（実装コストが高いので Pro 訴求の柱に）
- [ ] RSVP は Guild Pro 限定でよいか（Pro でも使えると差別化が弱い）

### 9.3 課金主体の運営判断
- [ ] 個人開発として運営するか法人化するか
- [ ] 適格請求書発行事業者登録のタイミング
- [ ] Discord App Subscriptions の優先順位（85% revenue share でも導入するか）

### 9.4 Donate の方針
- [ ] Buy Me a Coffee アカウントを「個人」or「Discalendar」名義で作るか
- [ ] GitHub Sponsors を有効化するか（OSS としての開発を強調するか）
- [ ] サイト内で Supporters を可視化するか（透明性 vs プライバシー）

---

## 10. 関連リソース

### 公式ドキュメント
- [Stripe Billing — Subscriptions](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe Checkout — Build a subscription integration](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Stripe — 適格請求書（インボイス制度）対応](https://stripe.com/jp/guides/japan-invoice-system)
- [Discord — Implementing App Subscriptions](https://docs.discord.com/developers/monetization/implementing-app-subscriptions)
- [Discord — Premium Apps Payout (Revenue Share)](https://support-dev.discord.com/hc/en-us/articles/17299902720919-Premium-Apps-Payout)
- [discord.js — Entitlement events](https://discord.js.org/docs/packages/discord.js/main/Client:class)
- [Buy Me a Coffee — Webhooks Docs](https://studio.buymeacoffee.com/webhooks/docs)

### 社内ドキュメント
- [feature-expansion-plan.md §3 マネタイズ戦略](./feature-expansion-plan.md)
- [v2-migration-gap-analysis.md](./v2-migration-gap-analysis.md)
- [.kiro/steering/product.md](../.kiro/steering/product.md)

### 推奨参考実装
- [Stripe Subscription Lifecycle in Next.js — 2026 Guide](https://dev.to/thekarlesi/stripe-subscription-lifecycle-in-nextjs-the-complete-developer-guide-2026-4l9d)
- [The Ultimate Guide to Stripe + Next.js (2026)](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33)

---

## 付録 A: 用語集

| 用語 | 説明 |
|------|------|
| MoR | Merchant of Record。決済代行 + 税務代行を一括で行う事業者（Paddle, LemonSqueezy 等） |
| SKU | Stock Keeping Unit。Discord App Subscriptions の商品 ID |
| Entitlement | Discord でユーザー/ギルドが特定 SKU を所有していることを示す |
| Customer Portal | Stripe がホスティングするセルフサービス UI（プラン変更・キャンセル・支払い方法管理） |
| 適格請求書 | 日本のインボイス制度で必要な、登録番号・税率を含む請求書 |
| Idempotency Key | 冪等性キー。Webhook 等の重複処理を防ぐ識別子 |

## 付録 B: 推奨実装順序チェックリスト

```
[ ] Phase 0  Stripe アカウント開設
[ ] Phase 0  Discord Monetization 申請
[ ] Phase 0  Buy Me a Coffee アカウント開設
[ ] Phase 0  プラン体系・価格確定
[ ] Phase 0  特商法・利用規約改訂
[ ] Phase 1  /donate ページ実装
[ ] Phase 1  フッター/メニュー導線追加
[ ] Phase 2  DB マイグレーション
[ ] Phase 2  Stripe Customer 作成フロー
[ ] Phase 2  /pricing ページ + Checkout
[ ] Phase 2  Webhook Handler
[ ] Phase 2  plan-resolver
[ ] Phase 2  Customer Portal
[ ] Phase 2  ユーザー Pro 機能ゲーティング
[ ] Phase 3  ギルド Pro 管理者権限チェック
[ ] Phase 3  ギルド設定にアップグレード UI
[ ] Phase 3  ギルド Pro 機能ゲーティング
[ ] Phase 4  Discord SKU 作成
[ ] Phase 4  Bot Entitlement イベント
[ ] Phase 4  /upgrade Premium Button
[ ] Phase 4  resolvePlan に Discord 統合
```
