import { NextRequest, NextResponse } from "next/server";
import { anchorSchema } from "@/app/lib/schema";
import { runGoogle } from "@/app/lib/serper";
import { runExaRaw } from "@/app/lib/exa";

// Baseline pipeline — Google + Exa raw. Resolves in ~3–5s.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = anchorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const anchor = parsed.data;

  const [google, exa_raw] = await Promise.all([
    runGoogle(anchor),
    runExaRaw(anchor),
  ]);

  return NextResponse.json({ google, exa_raw });
}
