import { createClient } from "@supabase/supabase-js";

// kenyakugo スキーマのテーブル型
export interface AiComment {
  period_key: string;
  comment: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  gmail_id: string;
  store: string;
  amount: number;
  date: string;
  category: string;
  created_at: string;
}

export interface Settings {
  id: string;
  target_monthly: number;
  fixed_costs: number;
  google_refresh_token?: string;
  updated_at: string;
}

// kenyakugo スキーマ固定のクライアント
// accessToken を渡すと RLS が認証済みユーザーとして評価される
export function createDb(accessToken?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "kenyakugo" },
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    }
  );
}
