export interface ParsedTransaction {
  store: string;
  amount: number; // 元通貨での金額
  currency: string; // ISO 4217（'VND', 'JPY', 'USD' など）
  date: Date;
  isValid: boolean;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Type 1: カード決済メール（"Thành công" を含む）
function parseCardTransaction(text: string): ParsedTransaction {
  // Store: "Sử dụng tại At <name> Số tiền"
  const storeMatch = text.match(/Sử dụng tại\s+At\s+(.*?)\s+Số tiền/);
  let store = storeMatch ? storeMatch[1].trim() : "";
  store = store.replace(/^At\s*/i, "").trim();

  // Amount + Currency: "Transaction Amount X[,XXX][.XX] CCC"
  // - VND: 整数カンマ区切り (例: 159,840 VND)
  // - JPY: 整数カンマ区切り (例: 37,050 JPY)
  // - USD: 小数あり (例: 06.6 USD)
  const amountMatch = text.match(
    /Transaction Amount\s+([\d.,]+)\s+([A-Z]{3})/,
  );
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : 0;
  const currency = amountMatch ? amountMatch[2] : "VND";

  // Date: "Trans. Date, Time DD-MM-YYYY HH:mm:ss"
  const dateMatch = text.match(
    /Trans\. Date, Time\s+(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/,
  );
  let date = new Date();
  if (dateMatch) {
    const [datePart, timePart] = dateMatch[1].split(" ");
    const [day, month, year] = datePart.split("-");
    date = new Date(`${year}-${month}-${day}T${timePart}`);
  }

  return { store, amount, currency, date, isValid: amount > 0 };
}

// Type 2: 口座振込メール（"Biên lai chuyển tiền qua tài khoản"）
function parseTransferReceipt(text: string): ParsedTransaction {
  const beneficiaryMatch = text.match(
    /Beneficiary Name\s+(.*?)\s+(?:Tên ngân hàng|Beneficiary Bank)/,
  );
  const store = beneficiaryMatch ? beneficiaryMatch[1].trim() : "Transfer";

  // Amount: "Số tiền Amount 9,000,000 VND" — 振込は VND 固定
  const amountMatch = text.match(/Số tiền\s+Amount\s+([\d,]+)\s*VND/);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ""), 10)
    : 0;

  // Date: "Trans. Date, Time HH:MM DayName DD/MM/YYYY"
  const dateMatch = text.match(
    /Trans\. Date, Time\s+(\d{2}:\d{2})\s+\S+\s+(\d{2}\/\d{2}\/\d{4})/,
  );
  let date = new Date();
  if (dateMatch) {
    const [hours, minutes] = dateMatch[1].split(":");
    const [day, month, year] = dateMatch[2].split("/");
    date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
  }

  return { store, amount, currency: "VND", date, isValid: amount > 0 };
}

export function parseVietcombankEmail(raw: string): ParsedTransaction {
  const text = raw.trim().startsWith("<") ? stripHtml(raw) : raw;

  if (text.includes("Thành công")) {
    return parseCardTransaction(text);
  }

  if (text.includes("Biên lai chuyển tiền")) {
    return parseTransferReceipt(text);
  }

  return {
    store: "",
    amount: 0,
    currency: "VND",
    date: new Date(),
    isValid: false,
  };
}
