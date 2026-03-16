"use client";

import { motion } from "framer-motion";

const techs = [
  { label: "Python", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { label: "Next.js", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { label: "Claude (Anthropic)", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { label: "Gemini", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Tavily Search", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "asyncio", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Telegram Bot", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "GCP Compute", color: "bg-red-50 text-red-700 border-red-200" },
];

export default function TechStack() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {techs.map((tech, i) => (
          <motion.span
            key={tech.label}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium ${tech.color}`}
          >
            {tech.label}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
