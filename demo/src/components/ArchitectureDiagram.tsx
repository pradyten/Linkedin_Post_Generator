"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Newspaper,
  Rss,
  Brain,
  Lightbulb,
  Search,
  FileText,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { PipelinePhase } from "@/types";

interface ArchitectureDiagramProps {
  activePhase?: PipelinePhase | null;
}

interface NodeProps {
  icon: React.ElementType;
  label: string;
  sub: string;
  isActive: boolean;
  activeColor: "emerald" | "blue" | "rose";
}

const borderActive: Record<string, string> = {
  emerald: "border-emerald-300 shadow-md shadow-emerald-100 ring-1 ring-emerald-200",
  blue: "border-blue-300 shadow-md shadow-blue-100 ring-1 ring-blue-200",
  rose: "border-rose-300 shadow-md shadow-rose-100 ring-1 ring-rose-200",
};

const iconBgActive: Record<string, string> = {
  emerald: "bg-emerald-50",
  blue: "bg-blue-50",
  rose: "bg-rose-50",
};

const iconColorActive: Record<string, string> = {
  emerald: "text-emerald-600",
  blue: "text-blue-600",
  rose: "text-rose-600",
};

function Node({ icon: Icon, label, sub, isActive, activeColor }: NodeProps) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-all duration-300 ${
        isActive ? borderActive[activeColor] : "border-gray-200"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isActive ? iconBgActive[activeColor] : "bg-gray-50"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${
            isActive ? iconColorActive[activeColor] : "text-gray-500"
          }`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

export default function ArchitectureDiagram({
  activePhase,
}: ArchitectureDiagramProps) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gray-900 text-center mb-8"
      >
        Pipeline Architecture
      </motion.h2>

      {/* Desktop: horizontal 3-column layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="hidden lg:flex items-center justify-center gap-3"
      >
        {/* Sources */}
        <div className="space-y-2 w-52">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
            Sources
          </p>
          <Node icon={Globe} label="Tavily Web" sub="Web + X/Twitter" isActive={activePhase === "sources"} activeColor="emerald" />
          <Node icon={Newspaper} label="HackerNews" sub="Top AI Stories" isActive={activePhase === "sources"} activeColor="emerald" />
          <Node icon={Rss} label="RSS Feeds" sub="12 Tech Blogs" isActive={activePhase === "sources"} activeColor="emerald" />
        </div>

        <div className="flex items-center px-1 text-gray-300">
          <ArrowRight className="w-6 h-6" />
        </div>

        {/* Agents */}
        <div className="space-y-2 w-52">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
            Agents
          </p>
          <Node icon={Brain} label="Trend Analyzer" sub="Claude Sonnet" isActive={activePhase === "analyze"} activeColor="blue" />
          <Node icon={Lightbulb} label="Topic Suggester" sub="Claude Sonnet" isActive={activePhase === "suggest"} activeColor="blue" />
          <Node icon={Search} label="Researcher" sub="Tavily + Claude" isActive={activePhase === "research"} activeColor="blue" />
          <Node icon={FileText} label="Draft Writer" sub="Claude Sonnet" isActive={activePhase === "draft"} activeColor="blue" />
          <Node icon={Sparkles} label="Refiner" sub="Claude Sonnet" isActive={activePhase === "refine"} activeColor="blue" />
        </div>

        <div className="flex items-center px-1 text-gray-300">
          <ArrowRight className="w-6 h-6" />
        </div>

        {/* Output */}
        <div className="w-52">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
            Output
          </p>
          <Node icon={MessageSquare} label="LinkedIn Post" sub="Telegram Bot" isActive={activePhase === "refine"} activeColor="rose" />
        </div>
      </motion.div>

      {/* Mobile: compact layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="lg:hidden space-y-4"
      >
        {/* Sources row */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Sources (parallel)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Globe, label: "Tavily" },
              { icon: Newspaper, label: "HN" },
              { icon: Rss, label: "RSS" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-white text-center transition-all duration-300 ${
                  activePhase === "sources" ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${activePhase === "sources" ? "text-emerald-600" : "text-gray-500"}`} />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center text-gray-300">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Agents */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Agents (sequential)
          </p>
          <div className="space-y-2">
            <Node icon={Brain} label="Trend Analyzer" sub="Claude Sonnet" isActive={activePhase === "analyze"} activeColor="blue" />
            <Node icon={Lightbulb} label="Topic Suggester" sub="Claude Sonnet" isActive={activePhase === "suggest"} activeColor="blue" />
            <Node icon={Search} label="Researcher" sub="Tavily + Claude" isActive={activePhase === "research"} activeColor="blue" />
            <Node icon={FileText} label="Draft Writer" sub="Claude Sonnet" isActive={activePhase === "draft"} activeColor="blue" />
            <Node icon={Sparkles} label="Refiner" sub="Claude Sonnet" isActive={activePhase === "refine"} activeColor="blue" />
          </div>
        </div>

        <div className="flex justify-center text-gray-300">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Output */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Output
          </p>
          <Node icon={MessageSquare} label="LinkedIn Post" sub="Telegram Bot" isActive={activePhase === "refine"} activeColor="rose" />
        </div>
      </motion.div>
    </section>
  );
}
