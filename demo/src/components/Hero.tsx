"use client";

import { motion } from "framer-motion";
import { Play, Zap, Github } from "lucide-react";

interface HeroProps {
  onWatchDemo: () => void;
  onTryLive: () => void;
}

export default function Hero({ onWatchDemo, onTryLive }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Multi-Agent AI Pipeline
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight"
        >
          LinkedIn Post{" "}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Generator
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
        >
          An AI-powered pipeline that fetches trending tech news, analyzes trends with Claude,
          and generates engaging LinkedIn posts through a 6-phase agent chain.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={onWatchDemo}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
          >
            <Play className="w-4 h-4" />
            Watch Demo
          </button>
          <button
            onClick={onTryLive}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Zap className="w-4 h-4" />
            Try Live
          </button>
          <a
            href="https://github.com/pradyten/Linkedin_Post_Generator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            <Github className="w-4 h-4" />
            Source Code
          </a>
        </motion.div>
      </div>
    </section>
  );
}
