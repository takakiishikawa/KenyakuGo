import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { category } = await req.json();

  const updated = await prisma.transaction.update({
    where: { id },
    data: { category },
  });

  return NextResponse.json(updated);
}
