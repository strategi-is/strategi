'use client';
import { LogoIcon } from '@/components/ui/logo';

import Link from 'next/link';
import Image from 'next/image';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <AuroraBackground className="min-h-screen overflow-x-hidden" showRadialGradient>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900">
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Strategi
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">
              Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero with Scroll Animation ───────────────────────────────── */}
      <div className="pt-16">
        <ContainerScroll
          titleComponent={
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-950 px-4 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-300 border border-orange-100 dark:border-orange-800">
                <LogoIcon className="h-3.5 w-3.5" />
                GEO Analytics for B2B companies
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                Get cited by{' '}
                <span className="text-orange-500">AI search</span>
                <br />before your competitors do
              </h1>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                Strategi scrapes your site, queries ChatGPT & Perplexity, scores your
                GEO readiness, and generates the content that gets you cited.
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link href="/register">
                  <Button size="lg" className="px-8">
                    Start free analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="lg">Log in</Button>
                </Link>
              </div>
            </div>
          }
        >
          <div className="h-full w-full bg-zinc-900 rounded-2xl flex flex-col text-white overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <div className="ml-3 flex-1 bg-zinc-800 rounded h-5 max-w-xs flex items-center px-2">
                <span className="text-zinc-500 text-[10px]">app.strategi.is/analyses/acme-corp</span>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-40 border-r border-zinc-800 p-3 space-y-1 shrink-0 hidden md:flex md:flex-col">
                <div className="text-zinc-500 text-[9px] uppercase tracking-widest px-2 pt-1 pb-2">Workspace</div>
                {[
                  { label: 'Dashboard', active: false },
                  { label: 'Companies', active: false },
                  { label: 'Analyses', active: true },
                  { label: 'Content', active: false },
                  { label: 'Settings', active: false },
                ].map(({ label, active }) => (
                  <div key={label} className={`h-7 rounded-md px-2 flex items-center text-[11px] font-medium ${active ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    {label}
                  </div>
                ))}
                <div className="mt-auto pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold">A</div>
                    <div>
                      <div className="text-[10px] text-zinc-300 font-medium">Acme Corp</div>
                      <div className="text-[9px] text-zinc-500">Pro plan</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">GEO Analysis — Acme Corp</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Completed · 2 hours ago</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-green-500/20 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">COMPLETED</div>
                  </div>
                </div>

                {/* Score cards */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'GEO Score', value: '72', sub: '/100', color: 'text-green-400' },
                    { label: 'AI Queries', value: '24', sub: 'run', color: 'text-blue-400' },
                    { label: 'Mentioned', value: '14', sub: 'times', color: 'text-orange-400' },
                    { label: 'Share of Voice', value: '38%', sub: 'avg', color: 'text-yellow-400' },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className="bg-zinc-800 rounded-lg p-2.5">
                      <div className="text-zinc-500 text-[9px] mb-1">{label}</div>
                      <div className={`text-lg font-bold leading-none ${color}`}>{value}<span className="text-[10px] text-zinc-500 ml-0.5">{sub}</span></div>
                    </div>
                  ))}
                </div>

                {/* GEO attribute bars */}
                <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-300 mb-2">GEO Attributes</div>
                  {[
                    { label: 'Extractability', score: 4, max: 5, pct: 80 },
                    { label: 'Entity Clarity', score: 3, max: 5, pct: 60 },
                    { label: 'Specificity', score: 4.5, max: 5, pct: 90 },
                    { label: 'Corroboration', score: 2, max: 5, pct: 40 },
                    { label: 'Coverage', score: 3.5, max: 5, pct: 70 },
                    { label: 'Freshness', score: 2.5, max: 5, pct: 50 },
                  ].map(({ label, score, pct }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="text-[9px] text-zinc-400 w-20 shrink-0">{label}</div>
                      <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[9px] text-zinc-400 w-6 text-right">{score}</div>
                    </div>
                  ))}
                </div>

                {/* AI engine results */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-zinc-300 mb-2">ChatGPT Results</div>
                    {[
                      { query: 'best B2B analytics tools', mentioned: true },
                      { query: 'GEO optimization software', mentioned: false },
                      { query: 'AI search visibility tools', mentioned: true },
                    ].map(({ query, mentioned }) => (
                      <div key={query} className="flex items-center gap-1.5 mb-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${mentioned ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        <div className="text-[9px] text-zinc-400 truncate">{query}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-zinc-300 mb-2">Blog Posts Generated</div>
                    {[
                      { title: 'What is GEO?', stage: 'AWARENESS', score: 88 },
                      { title: 'GEO vs SEO Guide', stage: 'CONSIDERATION', score: 82 },
                      { title: 'How to rank in AI', stage: 'DECISION', score: 91 },
                    ].map(({ title, stage, score }) => (
                      <div key={title} className="mb-1.5">
                        <div className="text-[9px] text-zinc-300 font-medium truncate">{title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px] text-orange-400">{stage}</span>
                          <span className="text-[8px] text-zinc-500">· GEO {score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </div>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            The full GEO pipeline, automated
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
            From website scrape to published blog post — every step that improves your AI visibility, done for you.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <LogoIcon className="h-6 w-6" />,
                title: 'AI Query Analysis',
                desc: 'We run your target queries through ChatGPT and Perplexity and measure exactly where your brand appears — and where it doesn\'t.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-orange-500" />,
                title: 'GEO Score & Benchmarks',
                desc: 'Get scored across 8 GEO attributes — extractability, entity clarity, specificity, and more — benchmarked against your industry.',
              },
              {
                icon: <FileText className="h-6 w-6 text-orange-500" />,
                title: 'Content That Gets Cited',
                desc: 'Auto-generated blog posts and page recommendations built specifically to be cited by AI systems at every buyer stage.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950 mb-5">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Ready to show up in AI search?
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Add your company, run your first analysis, and get your GEO score in minutes.
          </p>
          <Link href="/register">
            <Button size="lg" className="px-10">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-900 py-8 px-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Strategi. All rights reserved.
      </footer>
    </AuroraBackground>
  );
}
