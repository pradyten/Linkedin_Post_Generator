export interface TrendItem {
  title: string;
  summary: string;
  url: string | null;
  source: "tavily" | "hackernews" | "rss" | "twitter";
  timestamp: string | null;
}

export interface AnalyzedTrend {
  theme: string;
  title: string;
  summary: string;
  sources: string[];
  relevance_score: number;
}

export interface TopicSuggestion {
  title: string;
  hook: string;
  reasoning: string;
  source_material: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export type PipelinePhase =
  | "sources"
  | "analyze"
  | "suggest"
  | "research"
  | "draft"
  | "refine";

export type PhaseStatus = "idle" | "running" | "done" | "error";

export interface PhaseState {
  phase: PipelinePhase;
  status: PhaseStatus;
  data?: unknown;
  streamedText?: string;
  elapsed?: number;
  error?: string;
  summary?: string;
}

export type DemoMode = "demo" | "live-full" | "live-topic";
