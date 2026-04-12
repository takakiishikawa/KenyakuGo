import { createClient } from "@supabase/supabase-js";

// kenyakugo スキーマのテーブル型
export interface Transaction {
  id: string;
  gmail_id: string;
  store: string;
  amount: number;
  date: string;
  category: string;
  raw_text: string;
  created_at: string;
}

export interface Settings {
  id: string;
  target_monthly: number;
  fixed_costs: number;
  updated_at: string;
}

// kenyakugo スキーマ固定のクライアント
export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "kenyakugo" } }
  );
}
