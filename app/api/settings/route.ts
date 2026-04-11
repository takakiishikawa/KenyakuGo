import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", targetMonthly: 0, fixedCosts: 0 },
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const { targetMonthly, fixedCosts } = await req.json();

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { targetMonthly, fixedCosts },
    create: { id: "singleton", targetMonthly, fixedCosts },
  });

  return NextResponse.json(settings);
}
