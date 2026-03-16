"use client";

import { useEffect, useRef } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
  speed?: number;
}

export default function StreamingText({
  text,
  isStreaming,
  className = "",
}: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  return (
    <div ref={containerRef} className={`overflow-auto ${className}`}>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
        {text}
        {isStreaming && (
          <span className="inline-block w-[2px] h-4 bg-blue-600 ml-0.5 animate-blink align-text-bottom" />
        )}
      </pre>
    </div>
  );
}
