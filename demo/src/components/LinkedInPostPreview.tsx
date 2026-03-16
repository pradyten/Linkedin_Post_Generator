"use client";

import { ThumbsUp, MessageCircle, Repeat2, Send } from "lucide-react";

interface LinkedInPostPreviewProps {
  content: string;
  authorName?: string;
  authorTitle?: string;
}

export default function LinkedInPostPreview({
  content,
  authorName = "Pradyumn Tendulkar",
  authorTitle = "AI Engineer | Building with LLMs",
}: LinkedInPostPreviewProps) {
  // Convert URLs in text to clickable links
  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg mx-auto overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {authorName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{authorName}</p>
          <p className="text-xs text-gray-500 truncate">{authorTitle}</p>
          <p className="text-xs text-gray-400">Just now</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {renderContent(content)}
        </div>
      </div>

      {/* Engagement bar */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-0.5">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-white" />
            </span>
            42
          </span>
          <span className="mx-1">&#183;</span>
          <span>8 comments</span>
          <span className="mx-1">&#183;</span>
          <span>3 reposts</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-2 py-1 border-t border-gray-100 flex">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
