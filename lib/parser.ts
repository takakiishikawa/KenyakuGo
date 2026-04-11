export interface ParsedTransaction {
  store: string;
  amount: number;
  date: Date;
  isValid: boolean;
}

export function parseVietcombankEmail(text: string): ParsedTransaction {
  // Extract store name: after "Sử dụng tại" until "Số tiền", remove leading "At"
  const storeMatch = text.match(/Sử dụng tại\s*At?(.*?)Số tiền/);
  let store = storeMatch ? storeMatch[1].trim() : "";
  // Remove leading "At" if present (case-insensitive)
  store = store.replace(/^At\s*/i, "").trim();

  // Extract amount: after "Transaction Amount" until "VND"
  const amountMatch = text.match(/Transaction Amount\s*([\d,]+)\s*VND/);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ""), 10)
    : 0;

  // Extract date: after "Trans. Date, Time" - DD-MM-YYYY HH:mm:ss
  const dateMatch = text.match(
    /Trans\. Date, Time\s*(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/
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
