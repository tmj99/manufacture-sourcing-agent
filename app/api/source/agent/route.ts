import { NextRequest, NextResponse } from "next/server";
import { anchorSchema } from "@/app/lib/schema";
import { runSourcingAgent } from "@/app/lib/agent";

export const maxDuration = 60; // seconds — agent pipeline takes ~20–40s

// Agent pipeline — decomposes, fans out, verifies, synthesises. Resolves in ~20–40s.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = anchorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const agent = await runSourcingAgent(parsed.data);
  return NextResponse.json({ agent });
}
