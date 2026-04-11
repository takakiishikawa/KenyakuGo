import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchVietcombankEmails } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = await fetchVietcombankEmails(session.accessToken);
  let synced = 0;

  for (const email of emails) {
    const parsed = parseVietcombankEmail(email.body);
    if (!parsed.isValid) continue;

    const existing = await prisma.transaction.findUnique({
      where: { gmailId: email.id },
    });
    if (existing) continue;

    await prisma.transaction.create({
      data: {
        gmailId: email.id,
        store: parsed.store,
        amount: parsed.amount,
        date: parsed.date,
        category: "その他",
        rawText: email.body,
      },
    });
    synced++;
  }

  // AI categorize transactions with "その他"
  const uncategorized = await prisma.transaction.findMany({
    where: { category: "その他" },
  });

  for (const tx of uncategorized) {
    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL}/api/ai/categorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store: tx.store }),
        }
      );
      if (res.ok) {
        const { category } = await res.json();
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { category },
        });
      }
    } catch {
      // Skip if AI categorization fails
    }
  }

  return NextResponse.json({ synced });
}
