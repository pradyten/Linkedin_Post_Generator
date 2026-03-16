import { NextRequest, NextResponse } from "next/server";
import { getRemainingRuns } from "@/lib/rate-limit";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const remaining = getRemainingRuns(ip);
  return NextResponse.json({ remaining, limit: 3 });
}
