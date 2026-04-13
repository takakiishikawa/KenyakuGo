import { google } from "googleapis";

type GmailClient = ReturnType<typeof google.gmail>;

// 全メッセージIDのみを取得（本文は取らない）
export async function listVietcombankMessageIds(accessToken: string): Promise<string[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const allIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      // サブドメイン全体をカバー＋成功取引のみ
      q: 'from:(@vietcombank.com.vn) "Thành công"',
      maxResults: 500,
      ...(pageToken ? { pageToken } : {}),
    });

    for (const m of res.data.messages ?? []) {
      if (m.id) allIds.push(m.id);
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return allIds;
}

// 指定IDのメール本文を取得
export async function fetchEmailBody(
  accessToken: string,
  messageId: string
): Promise<string | null> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  return fetchBodyFromGmail(gmail, messageId);
}

async function fetchBodyFromGmail(gmail: GmailClient, messageId: string): Promise<string | null> {
  const msgResponse = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const payload = msgResponse.data.payload;
  let body = "";

  if (payload?.parts) {
    for (const mimeType of ["text/html", "text/plain"]) {
      const part = payload.parts.find((p) => p.mimeType === mimeType && p.body?.data);
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      }
    }
  }

  if (!body && payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  return body || null;
}

// 後方互換（既存コードが使っている場合のため残す）
export async function fetchVietcombankEmails(
  accessToken: string
): Promise<Array<{ id: string; body: string }>> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const ids = await listVietcombankMessageIds(accessToken);
  const results: Array<{ id: string; body: string }> = [];

  for (const id of ids) {
    const body = await fetchBodyFromGmail(gmail, id);
    if (body) results.push({ id, body });
  }

  return results;
}
