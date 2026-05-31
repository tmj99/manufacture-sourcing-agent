import { NextRequest, NextResponse } from "next/server";
import { anchorSchema } from "@/app/lib/schema";
import { runBatch } from "@/app/lib/batch";
import { type BatchSpecResult } from "@/app/lib/types";

export const maxDuration = 30; // 5 parallel runExaRaw calls, each ~3–5s

export async function POST(req: NextRequest) {
  const body = await req.json();
  const raw: unknown[] = Array.isArray(body.anchors) ? body.anchors.slice(0, 5) : [];

  // Validate each anchor; invalid ones become inline error results.
  const anchors: Parameters<typeof runBatch>[0] = [];
  const earlyErrors: BatchSpecResult[] = [];

  for (const item of raw) {
    const parsed = anchorSchema.safeParse(item);
    if (parsed.success) {
      anchors.push(parsed.data);
    } else {
      earlyErrors.push({
        spec: typeof (item as Record<string, unknown>).spec === "string"
          ? (item as Record<string, unknown>).spec as string
          : "Invalid spec",
        geography: "",
        websetId: "",
        status: "error",
        candidates: [],
        error: "Invalid input: " + parsed.error.issues[0]?.message,
      });
    }
  }

  const results = anchors.length > 0 ? await runBatch(anchors) : [];
  return NextResponse.json({ results: [...results, ...earlyErrors] });
}
