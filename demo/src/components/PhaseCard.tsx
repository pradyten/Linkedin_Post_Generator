"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Brain,
  Lightbulb,
  Search,
  FileText,
  Sparkles,
} from "lucide-react";
import { PhaseStatus, PipelinePhase } from "@/types";
import StreamingText from "./StreamingText";

const PHASE_CONFIG: Record<
  PipelinePhase,
  { label: string; icon: React.ElementType; color: string }
> = {
  sources: { label: "Fetch Sources", icon: Globe, color: "text-emerald-600" },
  analyze: { label: "Analyze Trends", icon: Brain, color: "text-purple-600" },
  suggest: { label: "Suggest Topics", icon: Lightbulb, color: "text-amber-600" },
  research: { label: "Research Topic", icon: Search, color: "text-blue-600" },
  draft: { label: "Draft Post", icon: FileText, color: "text-indigo-600" },
  refine: { label: "Refine Post", icon: Sparkles, color: "text-rose-600" },
};

interface PhaseCardProps {
  phase: PipelinePhase;
  status: PhaseStatus;
  elapsed?: number;
  streamedText?: string;
  summary?: string;
  children?: React.ReactNode;
}

export default function PhaseCard({
  phase,
  status,
  elapsed,
  streamedText,
  summary,
  children,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  const autoExpand = status === "running";
  const isOpen = expanded || autoExpand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border bg-white shadow-sm transition-all ${
        status === "running"
          ? "border-blue-200 shadow-blue-100/50 ring-1 ring-blue-100"
          : status === "done"
          ? "border-gray-200"
          : status === "error"
          ? "border-red-200"
          : "border-gray-100 opacity-50"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${
              status === "running"
                ? "bg-blue-50"
                : status === "done"
                ? "bg-green-50"
                : status === "error"
                ? "bg-red-50"
                : "bg-gray-50"
            }`}
          >
            <Icon className={`w-4.5 h-4.5 ${config.color}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {config.label}
            </p>
            {summary && status === "done" && (
              <p className="text-xs text-gray-500 mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {elapsed != null && (
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {(elapsed / 1000).toFixed(1)}s
            </span>
          )}
          {status === "running" && (
            <Loader2 className="w-4.5 h-4.5 text-blue-500 animate-spin" />
          )}
          {status === "done" && (
            <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="w-4.5 h-4.5 text-red-500" />
          )}
          {status !== "idle" &&
            (isOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ))}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (status === "running" || status === "done" || status === "error") && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-gray-100 pt-3">
              {streamedText && (
                <StreamingText
                  text={streamedText}
                  isStreaming={status === "running"}
                  className="max-h-64"
                />
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
