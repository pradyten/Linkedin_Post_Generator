"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { TopicSuggestion } from "@/types";

interface TopicPickerProps {
  topics: TopicSuggestion[];
  onSelect: (topic: TopicSuggestion) => void;
  disabled?: boolean;
}

export default function TopicPicker({
  topics,
  onSelect,
  disabled,
}: TopicPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-600">
        Pick a topic to generate a post:
      </p>
      <div className="grid gap-3">
        {topics.map((topic, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(topic)}
            disabled={disabled}
            className="text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 group-hover:bg-blue-200 transition-colors">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {topic.title}
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">
                  &ldquo;{topic.hook}&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {topic.reasoning}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
