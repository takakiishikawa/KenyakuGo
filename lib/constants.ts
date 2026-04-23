/** ダム積み立て開始月 */
export const DAM_START = new Date(2026, 3, 1); // 2026年4月1日

/** 週次比較から除外する固定費カテゴリ */
export const FIXED_CATEGORIES = [
  "家賃",
  "ローン",
  "公共料金",
  "通信費",
] as const;

/** AI一括分類のバッチサイズ（店名数） */
export const AI_CATEGORIZE_BATCH_SIZE = 100;

/** Gmail同期の1回あたり最大処理件数 */
export const GMAIL_SYNC_BATCH_SIZE = 200;
