"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search } from "lucide-react";

const schema = z.object({
  url: z.string().min(1, "Please enter a URL").max(2048),
  maxPages: z.number().min(1).max(50).default(5),
  maxDepth: z.number().min(1).max(5).default(2),
});

type FormValues = z.infer<typeof schema>;

export default function NewAuditForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { maxPages: 5, maxDepth: 2 },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to start audit");
      }

      const { id } = await res.json() as { id: string };
      router.push(`/audits/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-xs font-medium tracking-widest uppercase text-white/70 mb-1.5">
          Website URL
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-white/50" />
          </div>
          <input
            id="url"
            type="text"
            placeholder="https://example.com"
            {...register("url")}
            className="block w-full border border-white/20 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
          />
        </div>
        {errors.url && (
          <p className="mt-1.5 text-xs text-red-400">{errors.url.message}</p>
        )}
      </div>

      {/* Advanced options */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="maxPages" className="block text-xs font-medium tracking-widest uppercase text-white/70 mb-1.5">
            Max pages to crawl
          </label>
          <select
            id="maxPages"
            {...register("maxPages", { valueAsNumber: true })}
            className="block w-full border border-white/20 bg-white/5 py-3 px-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            {[1, 5, 10, 20, 50].map((n) => (
              <option key={n} value={n} className="bg-black text-white">{n} pages</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="maxDepth" className="block text-xs font-medium tracking-widest uppercase text-white/70 mb-1.5">
            Crawl depth
          </label>
          <select
            id="maxDepth"
            {...register("maxDepth", { valueAsNumber: true })}
            className="block w-full border border-white/20 bg-white/5 py-3 px-3 text-sm text-white focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n} className="bg-black text-white">Depth {n}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 bg-white px-6 py-3 text-sm font-bold tracking-widest uppercase text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting audit…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Run audit
          </>
        )}
      </button>
    </form>
  );
}
