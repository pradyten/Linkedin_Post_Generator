"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface RateLimitBannerProps {
  remaining: number | null;
  onRefresh?: () => void;
}

export default function RateLimitBanner({ remaining }: RateLimitBannerProps) {
  if (remaining === null) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
        remaining > 0
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {remaining <= 0 && <AlertCircle className="w-3.5 h-3.5" />}
      <span>
        {remaining > 0
          ? `${remaining} live generation${remaining !== 1 ? "s" : ""} remaining today`
          : "Daily live limit reached. Try the pre-baked demo instead!"}
      </span>
    </div>
  );
}

export function useRateLimit() {
  const [remaining, setRemaining] = useState<number | null>(null);

  const refresh = () => {
    fetch("/api/rate-limit")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => setRemaining(null));
  };

  useEffect(() => {
    refresh();
  }, []);

  return { remaining, refresh };
}
