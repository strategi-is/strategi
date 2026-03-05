'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, BarChart3, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black overflow-x-hidden">

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
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                <Zap className="h-3.5 w-3.5" />
                GEO Analytics for B2B companies
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                Get cited by{' '}
                <span className="text-indigo-600">AI search</span>
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
          <Image
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80"
            alt="Strategi GEO Analytics Dashboard"
            height={720}
            width={1400}
            className="mx-auto rounded-2xl object-cover h-full object-top"
            draggable={false}
          />
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
                icon: <Zap className="h-6 w-6 text-indigo-600" />,
                title: 'AI Query Analysis',
                desc: 'We run your target queries through ChatGPT and Perplexity and measure exactly where your brand appears — and where it doesn\'t.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                title: 'GEO Score & Benchmarks',
                desc: 'Get scored across 8 GEO attributes — extractability, entity clarity, specificity, and more — benchmarked against your industry.',
              },
              {
                icon: <FileText className="h-6 w-6 text-indigo-600" />,
                title: 'Content That Gets Cited',
                desc: 'Auto-generated blog posts and page recommendations built specifically to be cited by AI systems at every buyer stage.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 mb-5">
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
    </main>
  );
}
