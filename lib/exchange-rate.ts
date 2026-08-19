import { VND_PER_JPY } from "@/lib/currency";

// 以前はここで為替APIからライブレートを取得していたが、Dashboard/Transactions/
// Budget側は元から lib/currency.ts の固定レートを使っており、Simulationだけ
// 日々変わるライブレートを使っていたため、同じ円/VND金額が画面によって
// 違う数字に変換される・日をまたぐと表示がブレる、という不具合の原因になっていた。
// 全画面で lib/currency.ts の固定レート1本に統一する(呼び出し側の互換のため
// async のシグネチャは維持)。
export async function getJpyToVndRate(): Promise<number> {
  return VND_PER_JPY;
}
