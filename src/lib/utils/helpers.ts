import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number 0–100 as a score color class */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

/** Returns a color class for a score background */
export function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

/** Formats a severity label into a color */
export function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400 border-red-500/40";
    case "HIGH":
      return "text-orange-400 border-orange-500/40";
    case "MEDIUM":
      return "text-amber-400 border-amber-500/40";
    case "LOW":
      return "text-blue-400 border-blue-500/40";
    case "INFO":
      return "text-white/40 border-white/20";
    default:
      return "text-white/40 border-white/20";
  }
}

/** Returns a category label color */
export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    SEO: "text-violet-400",
    ACCESSIBILITY: "text-blue-400",
    PERFORMANCE: "text-amber-400",
    UX_UI: "text-pink-400",
    CONTENT: "text-cyan-400",
    SECURITY: "text-red-400",
    MOBILE: "text-indigo-400",
    BRANDING: "text-purple-400",
    BUGS: "text-orange-400",
    TRUST: "text-teal-400",
  };
  return map[category] ?? "text-white/40";
}

/** Formats milliseconds to a human-readable string */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Truncates a URL for display */
export function truncateUrl(url: string, max = 60): string {
  if (url.length <= max) return url;
  return url.slice(0, max - 3) + "...";
}

/** Formats a date to a readable string */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
