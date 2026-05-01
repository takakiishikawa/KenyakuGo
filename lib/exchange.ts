// open.er-api.com は無料・API キー不要でリアルタイム為替を返す。
// 取引日時点の historical レートではなく現在レートで近似する（家計簿用途で十分）。

interface OpenErApiResponse {
  result?: string;
  rates?: Record<string, number>;
}

const cache = new Map<string, { rate: number; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getVndRate(fromCurrency: string): Promise<number> {
  const cached = cache.get(fromCurrency);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;

  const res = await fetch(
    `https://open.er-api.com/v6/latest/${fromCurrency}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`exchange rate fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as OpenErApiResponse;
  const rate = data.rates?.VND;
  if (typeof rate !== "number" || rate <= 0) {
    throw new Error(`no VND rate for ${fromCurrency}`);
  }
  cache.set(fromCurrency, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
  return rate;
}

export async function convertToVND(
  amount: number,
  fromCurrency: string,
): Promise<number> {
  if (fromCurrency === "VND") return Math.round(amount);
  const rate = await getVndRate(fromCurrency);
  return Math.round(amount * rate);
}
