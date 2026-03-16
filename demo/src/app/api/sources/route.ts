import { NextResponse } from "next/server";
import {
  fetchTavilySources,
  fetchHackerNewsSources,
  fetchRssSources,
} from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  const tavilyKey = process.env.TAVILY_API_KEY;

  const results = await Promise.allSettled([
    tavilyKey ? fetchTavilySources(tavilyKey) : Promise.resolve([]),
    fetchHackerNewsSources(),
    fetchRssSources(),
  ]);

  const items = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  return NextResponse.json({
    items,
    count: items.length,
  });
}
