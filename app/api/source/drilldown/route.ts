import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { anchorSchema } from "@/app/lib/schema";
import { runDrilldown } from "@/app/lib/drilldown";

const candidateSchema = z.object({
  name: z.string(),
  domain: z.string().min(1),
  url: z.string(),
});

const bodySchema = z.object({
  anchor: anchorSchema,
  candidates: z.array(candidateSchema).min(1).max(2),
});

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const data = await runDrilldown(parsed.data.anchor, parsed.data.candidates);
  return NextResponse.json(data);
}
