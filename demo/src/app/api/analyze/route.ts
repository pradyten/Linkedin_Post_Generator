import { NextRequest, NextResponse } from "next/server";
import { analyzeTrends } from "@/lib/agents";
import { TrendItem } from "@/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { items } = (await req.json()) as { items: TrendItem[] };
  const trends = await analyzeTrends(items, apiKey);

  return NextResponse.json({ trends });
}
