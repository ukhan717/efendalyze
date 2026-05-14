"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Globe,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Deep Crawl Engine",
    description: "Automatically discovers and audits all critical pages — homepage, services, about, and more.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Analysis",
    description: "GPT-4o vision critiques your UX, design, messaging, and conversion flow with evidence-backed findings.",
  },
  {
    icon: Shield,
    title: "Accessibility Audit",
    description: "WCAG 2.1 compliance checks with specific remediation steps for every detected issue.",
  },
  {
    icon: Zap,
    title: "Performance Metrics",
    description: "Core Web Vitals, load times, and performance bottlenecks analysed across all pages.",
  },
  {
    icon: BarChart3,
    title: "Score Dashboard",
    description: "Category scores across SEO, UX, content, trust, and mobile with prioritised quick wins.",
  },
  {
    icon: Globe,
    title: "Client-Ready Reports",
    description: "Professional PDF reports suitable for client delivery, with annotated screenshots.",
  },
];

const SCORE_CATEGORIES = [
  { label: "SEO", score: 72, color: "bg-violet-500" },
  { label: "Accessibility", score: 45, color: "bg-blue-500" },
  { label: "Performance", score: 88, color: "bg-amber-500" },
  { label: "UX/UI", score: 61, color: "bg-pink-500" },
  { label: "Content", score: 79, color: "bg-cyan-500" },
  { label: "Mobile", score: 53, color: "bg-indigo-500" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <Image src="/logo.jpg" alt="Efendy Partners" width={120} height={40} className="object-contain" priority />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pb-24 pt-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3 w-3" />
              AI-powered · Instant results
            </span>

            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your website audit,{" "}
              <span className="text-white/50">done in minutes</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl text-white/50 leading-relaxed">
              Enter any URL and get a professional-grade audit covering SEO, accessibility,
              UX, performance, content quality, and conversion — with AI-generated
              recommendations ready to act on.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-up"
                className="w-full rounded-xl bg-white px-8 py-4 text-base font-semibold text-black hover:bg-white/90 transition-all sm:w-auto"
              >
                Start your free audit
              </Link>
              <Link
                href="/sign-in"
                className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/70 hover:bg-white/5 transition-colors sm:w-auto"
              >
                Sign in to dashboard
              </Link>
            </div>
          </motion.div>

          {/* Mock score preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-white/40">Audit complete for</p>
                <p className="font-mono text-sm font-medium text-white/80">example.com</p>
              </div>
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10">
                <span className="text-2xl font-bold text-white">66</span>
                <span className="text-[10px] text-white/40">/ 100</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SCORE_CATEGORIES.map(({ label, score, color }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/50">{label}</span>
                    <span className="text-sm font-bold text-white">{score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className={`h-1.5 rounded-full ${color} transition-all`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything in one audit
            </h2>
            <p className="mt-4 text-lg text-white/50">
              No more juggling 10 different tools. Efendalyze runs comprehensive checks
              and synthesises them into a single actionable report.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                A complete picture of your website health
              </h2>
              <p className="mt-4 text-lg text-white/50">
                Each audit analyses 7 critical dimensions and produces specific,
                evidence-backed findings — not generic advice.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Technical SEO & Core Web Vitals",
                  "WCAG accessibility compliance",
                  "AI UX/UI visual critique",
                  "Content & brand messaging quality",
                  "Bug & inconsistency detection",
                  "Trust & credibility signals",
                  "Mobile responsiveness",
                  "Conversion flow analysis",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-sm font-semibold text-white/60 uppercase tracking-widest">Issue breakdown</div>
              <div className="space-y-3">
                {[
                  { label: "Critical Issues", count: 3, color: "bg-red-500/20 text-red-400" },
                  { label: "High Priority", count: 8, color: "bg-orange-500/20 text-orange-400" },
                  { label: "Medium Priority", count: 14, color: "bg-amber-500/20 text-amber-400" },
                  { label: "Low Priority / Info", count: 21, color: "bg-white/10 text-white/50" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <span className="text-sm text-white/70">{label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to audit your website?
          </h2>
          <p className="mt-4 text-lg text-white/50">
            Get a professional-grade audit in minutes. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-base font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Start free audit
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-white/30">
          © {new Date().getFullYear()} Efendalyze. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
