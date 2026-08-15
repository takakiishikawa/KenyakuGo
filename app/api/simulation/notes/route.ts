import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { createDb } from "@/lib/supabase/db";

const CreateSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(2000),
});

// Simulationページのノートはかつて複数の"thread"に分かれていたが、
// UIをシンプルな単一リストへ統合した。simulation_notes.thread_id は
// NOT NULL の外部キーのままなので、ここで裏側に1本だけthreadを持たせて
// (無ければ作る) UI側にはthreadの概念を一切見せないようにする。
async function getOrCreateDefaultThreadId(db: ReturnType<typeof createDb>): Promise<string> {
  const { data: existing, error: findError } = await db
    .from("simulation_threads")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await db
    .from("simulation_threads")
    .insert({ title: "Notes" })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("simulation_notes")
    .select("id, body, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  let parsed;
  try {
    parsed = CreateSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  let threadId: string;
  try {
    threadId = await getOrCreateDefaultThreadId(db);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to prepare notes" },
      { status: 500 },
    );
  }

  const { data, error } = await db
    .from("simulation_notes")
    .insert({ thread_id: threadId, body: parsed.body })
    .select("id, body, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
