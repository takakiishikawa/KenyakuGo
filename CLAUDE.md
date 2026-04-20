@AGENTS.md

# CLAUDE.md

このプロダクトは **Goシリーズ** の一員です。  
Goシリーズ共通のデザインシステムは `@takaki/go-design-system` リポで管理されています。

## 絶対に守るルール（最重要）

### 1. UIコンポーネントは必ず @takaki/go-design-system から import する

- ✅ 正しい：`import { Button, Card } from '@takaki/go-design-system'`
- ❌ NG：独自に `components/ui/button.tsx` を作る
- ❌ NG：shadcn/ui CLI で直接コンポーネントを追加する（このプロダクトには不要）

### 2. 必要なコンポーネントがない場合

独自に作らず、以下のいずれかを選ぶ：
- 既存コンポーネントの組み合わせで実現できないか検討
- どうしても必要な場合は、go-design-systemリポに追加する旨を明記して作業を止める

独自実装は絶対にしない。

### 3. デザイントークンの上書き禁止

許可されている上書き：
- `--color-primary`（このプロダクトのブランドカラー）
- `--color-primary-hover`

禁止されている上書き：
- 色（上記以外全て）
- 角丸（`--radius-*`）
- フォントサイズ（`--text-*`）
- 余白（`--space-*`）
- シャドウ（`--shadow-*`）

### 4. className の使用範囲

許可：
- レイアウト（`flex`, `grid`, `gap`, `justify-*`, `items-*`）
- 配置（`margin`, `padding` でトークン値を使う場合）
- レスポンシブ制御（`md:`, `lg:`）

禁止：
- 色の直接指定（`bg-red-500`, `text-blue-600` など）
- 固定値の角丸（`rounded-lg` など、トークン経由で使う）
- 独自のシャドウ
- カスタムフォントサイズ

### 5. アイコンは lucide-react に統一

- ✅ `import { Zap } from 'lucide-react'`
- ❌ 他のアイコンライブラリを追加しない

### 6. レイアウトパターンはテンプレートから派生させる

新規画面を作る時：
- ダッシュボード系 → `DashboardPage` テンプレートから派生
- サイドバー → `KenyakuGoSidebar` (`components/kenyaku-sidebar.tsx`) を更新
- 認証画面 → `LoginPage` テンプレート
- コンセプト画面 → `ConceptPage` テンプレート

ゼロからレイアウトを組まない。

## CSS の読み込み方（Tailwind v4 + Turbopack 必須）

**⚠️ CSS ファイルの `import` / `@import` は使わない。** Tailwind v4 + Turbopack では node_modules の CSS を `@import` すると PostCSS 処理が失敗する。

**正しい方法：`DesignTokens` コンポーネントを `app/layout.tsx` の `<head>` に置く**

`DesignTokens` は `tokens.css` + `globals.css` をインラインスタイルとして注入する。

## デザインシステムの更新への追従

```json
// vercel.json
{
  "buildCommand": "npm update @takaki/go-design-system && npm run build"
}
```

## このプロダクト固有のルール

- **プロダクト名**：KenyakuGo
- **プライマリカラー**：`#1A7A4A`（hover: `#145C38`）
  - 選定理由：節約・資産形成・「ダム」による蓄積というコンセプトから、「お金」「成長」「安定」を象徴するフォレストグリーンを採用。NativeGoの青（学習）、CareGoの明るい緑（介護）と差別化した深みのある緑。
- **ドメイン**：`https://kenyaku-go.vercel.app`
- **データモデル概要**：
  - `transactions`：Gmailから抽出した支出記録（store, amount, category, date）
  - `categories`：ユーザー定義の支出カテゴリ
  - `user_settings`：月間予算目標・固定費設定
  - `dam_records`：月次の貯蓄ダム記録（計算値）
- **外部連携**：
  - Google OAuth（Supabase経由） + Gmail API（取引データ抽出）
  - Anthropic Claude API（カテゴリ分類・支出分析コメント生成）
- **kg-* CSS変数**：既存ページの互換性のため `globals.css` でエイリアス定義済み
  - 新規ページでは使わず、設計システムトークン（`var(--color-primary)` 等）を直接使う
