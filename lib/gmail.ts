import { google } from "googleapis";

export async function fetchVietcombankEmails(
  accessToken: string
): Promise<Array<{ id: string; body: string }>> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: 'from:info@info.vietcombank.com.vn subject:"Thông báo giao dịch thẻ"',
    maxResults: 100,
  });

  const messages = listResponse.data.messages || [];
  const results: Array<{ id: string; body: string }> = [];

  for (const message of messages) {
    if (!message.id) continue;

    const msgResponse = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const payload = msgResponse.data.payload;
    let body = "";

    if (payload?.parts) {
      // Prefer text/html since Vietcombank emails are HTML-only
      for (const mimeType of ["text/html", "text/plain"]) {
        const part = payload.parts.find(
          (p) => p.mimeType === mimeType && p.body?.data
        );
        if (part?.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
          break;
        }
      }
    }

    if (!body && payload?.body?.data) {
      body = Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    if (body) {
      results.push({ id: message.id, body });
    }
  }

  return results;
}
