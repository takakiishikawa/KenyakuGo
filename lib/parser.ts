export interface ParsedTransaction {
  store: string;
  amount: number;
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

export function parseVietcombankEmail(raw: string): ParsedTransaction {
  const text = raw.trim().startsWith("<") ? stripHtml(raw) : raw;

  // Extract store name: after "Sử dụng tại" / "At" label until next field
  const storeMatch = text.match(/Sử dụng tại\s+At\s+(.*?)\s+Số tiền/);
  let store = storeMatch ? storeMatch[1].trim() : "";
  store = store.replace(/^At\s*/i, "").trim();

  // Extract amount: after "Transaction Amount" until "VND"
  const amountMatch = text.match(/Transaction Amount\s+([\d,]+)\s*VND/);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ""), 10)
    : 0;

  // Extract date: after "Trans. Date, Time" - DD-MM-YYYY HH:mm:ss
  const dateMatch = text.match(
    /Trans\. Date, Time\s+(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/
  );
  let date = new Date();
  if (dateMatch) {
    const [datePart, timePart] = dateMatch[1].split(" ");
    const [day, month, year] = datePart.split("-");
    date = new Date(`${year}-${month}-${day}T${timePart}`);
  }

  const isValid = text.includes("Thành công");

  return { store, amount, date, isValid };
}
