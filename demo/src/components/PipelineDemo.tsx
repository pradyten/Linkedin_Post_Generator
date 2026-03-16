"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import PhaseCard from "./PhaseCard";
import TopicPicker from "./TopicPicker";
import LinkedInPostPreview from "./LinkedInPostPreview";
import RateLimitBanner, { useRateLimit } from "./RateLimitBanner";
import {
  PipelinePhase,
  PhaseState,
  TopicSuggestion,
  TrendItem,
  AnalyzedTrend,
  WebSource,
  DemoMode,
} from "@/types";
import {
  PREBAKED_SOURCES,
  PREBAKED_TRENDS,
  PREBAKED_TOPICS,
  PREBAKED_RESEARCH,
  PREBAKED_DRAFT,
  PREBAKED_REFINED,
} from "@/lib/prebaked-data";
import { HARDCODED_TOPICS } from "@/lib/hardcoded-topics";

const PHASES: PipelinePhase[] = [
  "sources",
  "analyze",
  "suggest",
  "research",
  "draft",
  "refine",
];

const initialPhases = (): Record<PipelinePhase, PhaseState> => ({
  sources: { phase: "sources", status: "idle" },
  analyze: { phase: "analyze", status: "idle" },
  suggest: { phase: "suggest", status: "idle" },
  research: { phase: "research", status: "idle" },
  draft: { phase: "draft", status: "idle" },
  refine: { phase: "refine", status: "idle" },
});

interface PipelineDemoProps {
  mode: DemoMode;
  autoStart?: boolean;
  onActivePhaseChange?: (phase: PipelinePhase | null) => void;
}

export default function PipelineDemo({
  mode: initialMode,
  autoStart = false,
  onActivePhaseChange,
}: PipelineDemoProps) {
  const [phases, setPhases] = useState(initialPhases);
  const [mode, setMode] = useState<DemoMode>(initialMode);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);
  const [finalPost, setFinalPost] = useState<string | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [topicsForPicker, setTopicsForPicker] = useState<TopicSuggestion[]>([]);
  const { remaining, refresh } = useRateLimit();

  const pauseRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Live pipeline data passed between phases
  const pipelineDataRef = useRef<{
    items: TrendItem[];
    trends: AnalyzedTrend[];
    topics: TopicSuggestion[];
    research: string;
    webSources: WebSource[];
    draft: string;
  }>({
    items: [],
    trends: [],
    topics: [],
    research: "",
    webSources: [],
    draft: "",
  });

  const updatePhase = useCallback(
    (phase: PipelinePhase, update: Partial<PhaseState>) => {
      setPhases((prev) => ({
        ...prev,
        [phase]: { ...prev[phase], ...update },
      }));
    },
    []
  );

  const waitWhilePaused = useCallback(async () => {
    while (pauseRef.current) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }, []);

  const streamPrebaked = useCallback(
    async (phase: PipelinePhase, text: string, charsPerTick = 8) => {
      const start = Date.now();
      updatePhase(phase, { status: "running", streamedText: "" });
      onActivePhaseChange?.(phase);

      for (let i = 0; i < text.length; i += charsPerTick) {
        await waitWhilePaused();
        const chunk = text.slice(0, i + charsPerTick);
        updatePhase(phase, {
          streamedText: chunk,
          elapsed: Date.now() - start,
        });
        await new Promise((r) => setTimeout(r, 30));
      }

      updatePhase(phase, {
        status: "done",
        streamedText: text,
        elapsed: Date.now() - start,
      });
    },
    [updatePhase, onActivePhaseChange, waitWhilePaused]
  );

  const runDemoMode = useCallback(async () => {
    setIsRunning(true);
    setFinalPost(null);

    // Phase 1: Sources
    const start1 = Date.now();
    updatePhase("sources", { status: "running" });
    onActivePhaseChange?.("sources");
    await new Promise((r) => setTimeout(r, 1200));
    await waitWhilePaused();
    updatePhase("sources", {
      status: "done",
      summary: `${PREBAKED_SOURCES.length} items from 3 sources`,
      elapsed: Date.now() - start1,
    });

    // Phase 2: Analyze
    const start2 = Date.now();
    updatePhase("analyze", { status: "running" });
    onActivePhaseChange?.("analyze");
    await new Promise((r) => setTimeout(r, 1500));
    await waitWhilePaused();
    updatePhase("analyze", {
      status: "done",
      summary: `${PREBAKED_TRENDS.length} trends identified`,
      elapsed: Date.now() - start2,
    });

    // Phase 3: Suggest
    const start3 = Date.now();
    updatePhase("suggest", { status: "running" });
    onActivePhaseChange?.("suggest");
    await new Promise((r) => setTimeout(r, 1000));
    await waitWhilePaused();
    updatePhase("suggest", {
      status: "done",
      summary: `${PREBAKED_TOPICS.length} topics suggested`,
      elapsed: Date.now() - start3,
    });

    // Auto-select first topic in demo mode
    setSelectedTopic(PREBAKED_TOPICS[0]);

    // Phase 4: Research (streaming)
    await streamPrebaked("research", PREBAKED_RESEARCH);

    // Phase 5: Draft (streaming)
    await streamPrebaked("draft", PREBAKED_DRAFT);

    // Phase 6: Refine (streaming)
    await streamPrebaked("refine", PREBAKED_REFINED);
    onActivePhaseChange?.(null);

    setFinalPost(PREBAKED_REFINED);
    setIsRunning(false);
  }, [updatePhase, onActivePhaseChange, streamPrebaked, waitWhilePaused]);

  const streamFromSSE = useCallback(
    async (
      url: string,
      body: object,
      phase: PipelinePhase
    ): Promise<{ fullText: string; sources?: WebSource[] }> => {
      const start = Date.now();
      updatePhase(phase, { status: "running", streamedText: "" });
      onActivePhaseChange?.(phase);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let sources: WebSource[] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "chunk") {
              fullText += event.text;
              updatePhase(phase, {
                streamedText: fullText,
                elapsed: Date.now() - start,
              });
            } else if (event.type === "sources") {
              sources = event.data;
            } else if (event.type === "done") {
              fullText = event.fullText;
            }
          } catch {
            // Skip
          }
        }
      }

      updatePhase(phase, {
        status: "done",
        streamedText: fullText,
        elapsed: Date.now() - start,
      });

      return { fullText, sources };
    },
    [updatePhase, onActivePhaseChange]
  );

  const runLiveFullMode = useCallback(async () => {
    setIsRunning(true);
    setFinalPost(null);
    abortRef.current = new AbortController();

    try {
      // Phase 1: Sources
      const start1 = Date.now();
      updatePhase("sources", { status: "running" });
      onActivePhaseChange?.("sources");
      const sourcesRes = await fetch("/api/sources", {
        signal: abortRef.current.signal,
      });
      const sourcesData = await sourcesRes.json();
      pipelineDataRef.current.items = sourcesData.items;
      updatePhase("sources", {
        status: "done",
        summary: `${sourcesData.count} items fetched`,
        elapsed: Date.now() - start1,
      });

      // Phase 2: Analyze
      const start2 = Date.now();
      updatePhase("analyze", { status: "running" });
      onActivePhaseChange?.("analyze");
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pipelineDataRef.current.items }),
        signal: abortRef.current.signal,
      });
      const analyzeData = await analyzeRes.json();
      pipelineDataRef.current.trends = analyzeData.trends;
      updatePhase("analyze", {
        status: "done",
        summary: `${analyzeData.trends.length} trends identified`,
        elapsed: Date.now() - start2,
      });

      // Phase 3: Suggest
      const start3 = Date.now();
      updatePhase("suggest", { status: "running" });
      onActivePhaseChange?.("suggest");
      const suggestRes = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trends: pipelineDataRef.current.trends }),
        signal: abortRef.current.signal,
      });
      const suggestData = await suggestRes.json();
      pipelineDataRef.current.topics = suggestData.topics;
      updatePhase("suggest", {
        status: "done",
        summary: `${suggestData.topics.length} topics suggested`,
        elapsed: Date.now() - start3,
      });

      // Show topic picker
      setTopicsForPicker(suggestData.topics);
      setShowTopicPicker(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const phase = PHASES.find((p) => phases[p].status === "running");
      if (phase) {
        updatePhase(phase, {
          status: "error",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
      setIsRunning(false);
    }
  }, [updatePhase, onActivePhaseChange, phases]);

  const continueAfterTopicSelection = useCallback(
    async (topic: TopicSuggestion) => {
      setSelectedTopic(topic);
      setShowTopicPicker(false);

      try {
        // Phase 4: Research
        const researchResult = await streamFromSSE(
          "/api/research",
          { topic },
          "research"
        );
        pipelineDataRef.current.research = researchResult.fullText;
        pipelineDataRef.current.webSources = researchResult.sources || [];

        // Phase 5: Draft
        const draftResult = await streamFromSSE(
          "/api/draft",
          {
            topic,
            research: pipelineDataRef.current.research,
            webSources: pipelineDataRef.current.webSources,
          },
          "draft"
        );
        pipelineDataRef.current.draft = draftResult.fullText;

        // Phase 6: Refine
        const refineResult = await streamFromSSE(
          "/api/refine",
          { draft: pipelineDataRef.current.draft },
          "refine"
        );
        onActivePhaseChange?.(null);

        setFinalPost(refineResult.fullText);
        refresh();
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        const phase = PHASES.find((p) => phases[p].status === "running");
        if (phase) {
          updatePhase(phase, {
            status: "error",
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      } finally {
        setIsRunning(false);
      }
    },
    [streamFromSSE, updatePhase, onActivePhaseChange, phases, refresh]
  );

  const runLiveTopicMode = useCallback(async () => {
    setIsRunning(true);
    setFinalPost(null);
    setTopicsForPicker(HARDCODED_TOPICS);
    setShowTopicPicker(true);
    // Mark first 3 phases as skipped
    updatePhase("sources", { status: "done", summary: "Skipped (using preset topics)", elapsed: 0 });
    updatePhase("analyze", { status: "done", summary: "Skipped (using preset topics)", elapsed: 0 });
    updatePhase("suggest", { status: "done", summary: "Skipped (using preset topics)", elapsed: 0 });
  }, [updatePhase]);

  const handleStart = useCallback(
    (newMode?: DemoMode) => {
      const m = newMode || mode;
      setMode(m);
      setPhases(initialPhases());
      setFinalPost(null);
      setSelectedTopic(null);
      setShowTopicPicker(false);
      pauseRef.current = false;
      setIsPaused(false);

      if (m === "demo") runDemoMode();
      else if (m === "live-full") runLiveFullMode();
      else runLiveTopicMode();
    },
    [mode, runDemoMode, runLiveFullMode, runLiveTopicMode]
  );

  const handlePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setPhases(initialPhases());
    setIsRunning(false);
    setIsPaused(false);
    setFinalPost(null);
    setSelectedTopic(null);
    setShowTopicPicker(false);
    onActivePhaseChange?.(null);
  };

  useEffect(() => {
    if (autoStart) {
      handleStart(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="max-w-2xl mx-auto px-6 py-16" id="pipeline-demo">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Pipeline Demo
        </h2>
        <p className="text-sm text-gray-500">
          Watch the 6-phase pipeline generate a LinkedIn post in real-time
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        {!isRunning && !finalPost && (
          <>
            <button
              onClick={() => handleStart("demo")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </button>
            <button
              onClick={() =>
                handleStart(
                  remaining && remaining > 0 ? "live-full" : "live-topic"
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {remaining && remaining > 0
                ? "Try Live (Full Pipeline)"
                : "Try with Preset Topics"}
            </button>
          </>
        )}
        {isRunning && mode === "demo" && (
          <button
            onClick={handlePause}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            )}
          </button>
        )}
        {(isRunning || finalPost) && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Rate limit banner */}
      {mode !== "demo" && (
        <div className="mb-6 flex justify-center">
          <RateLimitBanner remaining={remaining} />
        </div>
      )}

      {/* Mode badge */}
      {isRunning && (
        <div className="flex justify-center mb-6">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              mode === "demo"
                ? "bg-gray-100 text-gray-600"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {mode === "demo"
              ? "Pre-baked Demo (auto-play)"
              : mode === "live-full"
              ? "Live Pipeline (API calls)"
              : "Live with Preset Topics"}
          </span>
        </div>
      )}

      {/* Phase cards */}
      <div className="space-y-3">
        {PHASES.map((phase, i) => (
          <div key={phase}>
            <PhaseCard
              phase={phase}
              status={phases[phase].status}
              elapsed={phases[phase].elapsed}
              streamedText={phases[phase].streamedText}
              summary={phases[phase].summary as string | undefined}
            >
              {/* Topic picker after suggest phase */}
              {phase === "suggest" &&
                showTopicPicker &&
                phases.suggest.status === "done" && (
                  <TopicPicker
                    topics={topicsForPicker}
                    onSelect={continueAfterTopicSelection}
                    disabled={!!selectedTopic}
                  />
                )}
              {/* Error display */}
              {phases[phase].status === "error" && (
                <p className="text-sm text-red-600">
                  {phases[phase].error || "An error occurred"}
                </p>
              )}
            </PhaseCard>
            {/* Connector line */}
            {i < PHASES.length - 1 &&
              phases[phase].status !== "idle" && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-4 bg-gray-200 rounded-full" />
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Final post preview */}
      {finalPost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10"
        >
          <h3 className="text-lg font-bold text-gray-900 text-center mb-4">
            Generated Post
          </h3>
          <LinkedInPostPreview content={finalPost} />
        </motion.div>
      )}
    </section>
  );
}
