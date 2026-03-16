"use client";

import { useState, useCallback, useRef } from "react";
import Hero from "@/components/Hero";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import TechStack from "@/components/TechStack";
import PipelineDemo from "@/components/PipelineDemo";
import ExamplePosts from "@/components/ExamplePosts";
import { PipelinePhase, DemoMode } from "@/types";

export default function Home() {
  const [activePhase, setActivePhase] = useState<PipelinePhase | null>(null);
  const [demoMode, setDemoMode] = useState<DemoMode>("demo");
  const [demoKey, setDemoKey] = useState(0);
  const [autoStart, setAutoStart] = useState(false);
  const pipelineRef = useRef<HTMLDivElement>(null);

  const startDemo = useCallback((mode: DemoMode) => {
    setDemoMode(mode);
    setAutoStart(true);
    setDemoKey((k) => k + 1);
    setTimeout(() => {
      pipelineRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Hero
        onWatchDemo={() => startDemo("demo")}
        onTryLive={() => startDemo("live-topic")}
      />
      <ArchitectureDiagram activePhase={activePhase} />
      <TechStack />
      <div ref={pipelineRef}>
        <PipelineDemo
          key={demoKey}
          mode={demoMode}
          autoStart={autoStart}
          onActivePhaseChange={setActivePhase}
        />
      </div>
      <ExamplePosts />

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          Built by{" "}
          <a
            href="https://github.com/pradyten"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Pradyumn Tendulkar
          </a>
          {" "}with Claude, Tavily, and Next.js
        </p>
      </footer>
    </main>
  );
}
