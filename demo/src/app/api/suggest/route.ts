import { NextRequest, NextResponse } from "next/server";
import { suggestTopics } from "@/lib/agents";
import { AnalyzedTrend } from "@/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { trends } = (await req.json()) as { trends: AnalyzedTrend[] };
  const topics = await suggestTopics(trends, apiKey, 3);

  return NextResponse.json({ topics });
}
