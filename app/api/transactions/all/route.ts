import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  await prisma.transaction.deleteMany();
  return NextResponse.json({ ok: true });
}
