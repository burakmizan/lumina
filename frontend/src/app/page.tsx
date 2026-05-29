'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight, Zap, Database, Brain, Mail, Shield,
  CheckCircle2, TrendingDown, Users, FileSpreadsheet,
  Globe, Cpu, GitBranch, BarChart2, ChevronRight,
} from 'lucide-react'

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / 1200, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    const timer = setTimeout(() => requestAnimationFrame(step), 400)
    return () => clearTimeout(timer)
  }, [target])
  return <>{count.toLocaleString()}{suffix}</>
}

// ── Workflow step ──────────────────────────────────────────────────────────────
function WorkflowStep({
  number, icon, title, desc, color, delay,
}: {
  number: string; icon: React.ReactNode; title: string
  desc: string; color: string; delay: string
}) {
  return (
    <div className="flex flex-col items-center text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{ animationDelay: delay }}>
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: color + '15', border: `1.5px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[10px] font-black text-slate-600"
          style={{ borderColor: color }}>
          {number}
        </span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-[140px]">{desc}</p>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, desc, badge, color,
}: {
  icon: React.ReactNode; title: string; desc: string; badge: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: color + '12', border: `1px solid ${color}25` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
          style={{ background: color + '12', color }}>
          {badge}
        </span>
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/80 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-full min-w-[600px]">
          {/* Logo */}
          <div className="flex items-center gap-2 pl-2 pr-6">
            <img src="/lumina.png" alt="Lumina" className="h-8 w-auto object-contain" />
          </div>

          {/* Nav links - Dynamic Island orta kısım */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 rounded-full p-1 flex-1 justify-center">
            <a href="#workflow" className="px-5 py-2 text-[13px] font-medium text-slate-600 rounded-full hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all">
              Integrations
            </a>
            <a href="#features" className="px-5 py-2 text-[13px] font-medium text-slate-600 rounded-full hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all">
              Features
            </a>
            <a href="#tech" className="px-5 py-2 text-[13px] font-medium text-slate-600 rounded-full hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all">
              Technology
            </a>
          </nav>

          {/* CTA - sağ kısım */}
          <div className="flex items-center gap-3 pl-6 pr-2">
            <a
              href="https://github.com/burakmizan/lumina"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-600" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <Link href="/login"
              className="flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white rounded-full transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #29BE98, #22a085)', boxShadow: '0 2px 16px rgba(41,190,152,0.25)' }}>
              Login
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="wrapper relative w-full -mt-20">
        <div className="hero" />
        <div className="content">
          <h1 className="h1--scalingSize mt-64 leading-[0.85] -translate-y-2" data-text="Reconciliation Reinvented.">
            Reconciliation Reinvented.
          </h1>

          {/* Mevcut içerik */}
          <div className="w-full max-w-5xl mx-auto px-6 mt-12 flex flex-col items-center">
            <p className="text-xl md:text-2xl max-w-2xl leading-relaxed mb-12">
              Autonomous B2B financial discrepancy resolution — from days to seconds.
              Built with Google ADK 2.0, Gemini 3, MongoDB Atlas MCP, and a 3-agent pipeline
              with Human-in-the-Loop approval.
            </p>

          <div className="flex items-center gap-4 flex-wrap mb-20">
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 text-base font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:border-slate-300 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <Zap className="w-5 h-5" />
              Get Started
            </Link>
          </div>
          </div>
        </div>

        <style jsx global>{`
          /*houdini*/
          @property --blink-opacity {
            syntax: "<number>";
            inherits: false;
            initial-value: 1;
          }

          @keyframes blink-animation {
            0%,
            100% {
              opacity: var(--blink-opacity, 1);
            }
            50% {
              opacity: 0;
            }
          }

          /*base*/
          :root {
            font-family: Inter, sans-serif;
            --stripe-color: #fff;
            --bg: var(--stripe-color);
            --maincolor: var(--bg);
          }

          @keyframes smoothBg {
            from {
              background-position: 50% 50%, 50% 50%;
            }
            to {
              background-position: 350% 50%, 350% 50%;
            }
          }

          .wrapper {
            width: 100%;
            height: auto;
            position: relative;
          }

          .hero {
            width: 100%;
            height: 100%;
            min-height: 120vh; /* Arkadaki renkli alanı aşağıya %20 daha uzattık */
            position: relative;
            display: flex;
            place-content: center;
            place-items: center;
            --stripes: repeating-linear-gradient(
              100deg,
              var(--stripe-color) 0%,
              var(--stripe-color) 7%,
              transparent 10%,
              transparent 12%,
              var(--stripe-color) 16%
            );

            --rainbow: repeating-linear-gradient(
              100deg,
              #60a5fa 10%,
              #e879f9 15%,
              #60a5fa 20%,
              #5eead4 25%,
              #60a5fa 30%
            );
            background-image: var(--stripes), var(--rainbow);
            background-size: 300%, 200%;
            background-position: 50% 50%, 50% 50%;

            filter: blur(10px) invert(100%);

            mask-image: radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%);
          }
          
          .hero::after {
            content: "";
            position: absolute;
            inset: 0;
            background-image: var(--stripes), var(--rainbow);
            background-size: 200%, 100%;
            animation: smoothBg 60s linear infinite;
            background-attachment: fixed;
            mix-blend-mode: difference;
          }

          .content {
            position: absolute;
            inset: 0;
            width: 100%;
            min-height: 100%;
            display: flex;
            place-content: center;
            place-items: center;
            flex-flow: column;
            gap: 2rem;
            text-align: center;
            mix-blend-mode: difference;
            -webkit-mix-blend-mode: difference;
            filter: invert(1);
            padding-top: 2rem;
            padding-bottom: 2rem;
          }

          .h1--scalingSize {
            font-size: clamp(2.5rem, 5vw, 5rem);
            position: relative;
            line-height: 1.1;
            max-width: 90vw;
          }

          .h1--scalingSize::before {
            content: attr(data-text);
            position: absolute;
            inset: 0;
            background: white;
            text-shadow: 0 0 1px #ffffff;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            background-color: white;
            -webkit-mask: linear-gradient(#000 0 0) luminance;
            mask: linear-gradient(#000 0 0) luminance, alpha;
            backdrop-filter: blur(19px) brightness(12.5);
            -webkit-text-stroke: 1px white;
            display: flex;
            margin: auto;
            z-index: 1;
            pointer-events: none;
          }

          /* ── Custom Learn More Button ── */
          .learn-more-btn {
            position: relative;
            display: inline-block;
            cursor: pointer;
            outline: none;
            border: 0;
            vertical-align: middle;
            text-decoration: none;
            background: transparent;
            padding: 0;
            font-size: inherit;
            font-family: inherit;
            width: 14rem;
            height: auto;
          }

          .learn-more-btn .circle {
            transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
            position: relative;
            display: block;
            margin: 0;
            width: 3rem;
            height: 3rem;
            background: #29BE98;
            border-radius: 1.625rem;
          }

          .learn-more-btn .circle .icon {
            transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
            position: absolute;
            top: 0;
            bottom: 0;
            margin: auto;
            background: #fff;
          }

          .learn-more-btn .circle .icon.arrow {
            transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
            left: 0.625rem;
            width: 1.125rem;
            height: 0.125rem;
            background: none;
          }

          .learn-more-btn .circle .icon.arrow::before {
            position: absolute;
            content: "";
            top: -0.29rem;
            right: 0.0625rem;
            width: 0.625rem;
            height: 0.625rem;
            border-top: 0.125rem solid #fff;
            border-right: 0.125rem solid #fff;
            transform: rotate(45deg);
          }

          .learn-more-btn .button-text {
            transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 0.85rem 0;
            margin: 0 0 0 1.85rem;
            color: #0f172a;
            font-weight: 700;
            line-height: 1.6;
            text-align: center;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }

          .learn-more-btn:hover .circle {
            width: 100%;
          }

          .learn-more-btn:hover .circle .icon.arrow {
            background: #fff;
            transform: translate(1rem, 0);
          }

          .learn-more-btn:hover .button-text {
            color: #fff;
          }
        `}</style>
      </section>

      {/* ── Integrations ── */}
      <section id="workflow" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#29BE98] mb-3 block">Integrations</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Lumina integrates with all of your favorite ERP tools</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
              One-click native integrations with SAP, Oracle, NetSuite, Microsoft Dynamics, Salesforce, and more. Plus over 6,000+ ERPs.
            </p>
          </div>

          <div className="relative w-full max-w-4xl mx-auto h-[520px]">
            {/* SVG Flow Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="13" y1="18" x2="25" y2="18" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="25" y1="18" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="13" y1="72" x2="25" y2="72" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="25" y1="72" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="75" y1="18" x2="87" y2="18" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="75" y1="18" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="75" y1="72" x2="87" y2="72" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="75" y1="72" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              <line x1="50" y1="82" x2="50" y2="50" stroke="#e2e8f0" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Merkez Node – Lumina Agent */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20 border-4 border-white">
                <img src="/luminaicon.png" alt="Lumina" className="h-10 w-auto object-contain brightness-0 invert" />
              </div>
            </div>

            {/* Sol Üst: SAP */}
            <div className="absolute left-[10%] top-[13%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-blue-700">S</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">SAP</span>
            </div>
            {/* Sol Üst: Oracle */}
            <div className="absolute left-[22%] top-[13%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-red-600">O</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Oracle</span>
            </div>

            {/* Sol Alt: NetSuite */}
            <div className="absolute left-[10%] top-[67%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-emerald-600">N</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">NetSuite</span>
            </div>
            {/* Sol Alt: Workday */}
            <div className="absolute left-[22%] top-[67%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-orange-500">W</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Workday</span>
            </div>

            {/* Sağ Üst: Salesforce */}
            <div className="absolute left-[72%] top-[13%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-sky-600">S</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Salesforce</span>
            </div>
            {/* Sağ Üst: Dynamics */}
            <div className="absolute left-[84%] top-[13%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-indigo-600">D</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Dynamics</span>
            </div>

            {/* Sağ Alt: QuickBooks */}
            <div className="absolute left-[72%] top-[67%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-green-600">Q</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">QuickBooks</span>
            </div>
            {/* Sağ Alt: Sage */}
            <div className="absolute left-[84%] top-[67%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-red-500">S</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Sage</span>
            </div>

            {/* Alt Orta: Odoo */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[77%] flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center">
                <span className="text-base font-bold text-purple-600">O</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Odoo</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#29BE98] mb-3 block">
              Features
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              A 24/7 AI-Agent Reconciliation Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Kart 1 */}
            <div className="group">
              <div className="relative h-64 rounded-2xl mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #ecfdf5 100%)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Folder */}
                    <div className="w-40 h-28 rounded-xl bg-white shadow-lg border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-5 bg-emerald-400 rounded-t-xl"></div>
                      <div className="absolute top-8 left-4 right-4 flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <div className="w-4 h-4 rounded bg-blue-400"></div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                          <div className="w-4 h-4 rounded bg-slate-400"></div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          <div className="w-4 h-4 rounded bg-emerald-400"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 h-2 bg-slate-100 rounded-full"></div>
                      <div className="absolute bottom-6 left-4 right-8 h-2 bg-slate-100 rounded-full"></div>
                    </div>
                    {/* Chat bubble */}
                    <div className="absolute -top-6 -right-16 bg-white rounded-lg shadow-md border border-slate-100 px-3 py-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-800"></div>
                      <div className="w-20 h-2 bg-slate-200 rounded-full"></div>
                    </div>
                    {/* Corner brackets */}
                    <div className="absolute -top-3 -left-3 w-4 h-4 border-l-2 border-t-2 border-slate-300 rounded-tl-sm"></div>
                    <div className="absolute -bottom-3 -right-3 w-4 h-4 border-r-2 border-b-2 border-slate-300 rounded-br-sm"></div>
                    <div className="absolute -top-3 -right-3 w-4 h-4 border-r-2 border-t-2 border-slate-300 rounded-tr-sm"></div>
                    <div className="absolute -bottom-3 -left-3 w-4 h-4 border-l-2 border-b-2 border-slate-300 rounded-bl-sm"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
                Rapid discrepancy detection
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Empower your finance teams with 24/7 automatic reconciliation between current account statements, invoices, and bank statements—no need for manual cross-checking.
              </p>
            </div>

            {/* Kart 2 */}
            <div className="group">
              <div className="relative h-64 rounded-2xl mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 50%, #fef9c3 100%)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Spreadsheet */}
                    <div className="w-44 h-32 bg-white rounded-lg shadow-lg border border-slate-100 overflow-hidden">
                      <div className="flex h-6 border-b border-slate-100">
                        <div className="w-1/2 bg-amber-100/50 flex items-center px-3">
                          <div className="w-16 h-2 bg-amber-300 rounded-full"></div>
                        </div>
                        <div className="w-1/2 bg-amber-50 flex items-center px-3">
                          <div className="w-12 h-2 bg-amber-200 rounded-full"></div>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-sm bg-emerald-400 mt-0.5"></div>
                          <div className="flex-1 space-y-1.5">
                            <div className="h-1.5 bg-slate-100 rounded-full w-full"></div>
                            <div className="h-1.5 bg-slate-100 rounded-full w-3/4"></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-sm bg-amber-400 mt-0.5"></div>
                          <div className="flex-1 space-y-1.5">
                            <div className="h-1.5 bg-slate-100 rounded-full w-full"></div>
                            <div className="h-1.5 bg-slate-100 rounded-full w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Auto-fill indicator */}
                    <div className="absolute -bottom-4 -right-8 bg-white rounded-lg shadow-md border border-slate-100 px-3 py-2 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                      <div className="w-16 h-2 bg-slate-200 rounded-full"></div>
                    </div>
                    {/* Brackets */}
                    <div className="absolute -top-3 -left-3 w-4 h-4 border-l-2 border-t-2 border-amber-300 rounded-tl-sm"></div>
                    <div className="absolute -bottom-3 -right-3 w-4 h-4 border-r-2 border-b-2 border-amber-300 rounded-br-sm"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
                Automate statement matching
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Recycle historical reconciliation patterns and accelerate your matching process with high-quality AI-powered discrepancy resolution.
              </p>
            </div>

            {/* Kart 3 */}
            <div className="group">
              <div className="relative h-64 rounded-2xl mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 50%, #eef2ff 100%)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Chart */}
                    <div className="flex items-end gap-3 h-28">
                      <div className="w-6 bg-indigo-200 rounded-t-sm" style={{ height: '20%' }}></div>
                      <div className="w-6 bg-indigo-300 rounded-t-sm" style={{ height: '35%' }}></div>
                      <div className="w-6 bg-indigo-400 rounded-t-sm" style={{ height: '55%' }}></div>
                      <div className="w-6 bg-indigo-500 rounded-t-sm" style={{ height: '75%' }}></div>
                      <div className="w-6 bg-indigo-600 rounded-t-sm" style={{ height: '100%' }}></div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-md border border-slate-100 px-3 py-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">$28K</span>
                      <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                    </div>
                    {/* Label */}
                    <div className="absolute -top-2 -right-20 bg-white rounded-lg shadow-sm border border-slate-100 px-2 py-1 flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full border-2 border-indigo-400"></div>
                      <div className="w-14 h-1.5 bg-slate-200 rounded-full"></div>
                    </div>
                    {/* Brackets */}
                    <div className="absolute -top-3 -left-3 w-4 h-4 border-l-2 border-t-2 border-indigo-300 rounded-tl-sm"></div>
                    <div className="absolute -bottom-3 -right-3 w-4 h-4 border-r-2 border-b-2 border-indigo-300 rounded-br-sm"></div>
                    <div className="absolute top-1/2 -right-4 w-8 h-8 border-r-2 border-t-2 border-indigo-200 rounded-tr-sm"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
                Instant revenue protection
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Turn your existing financial data into actionable expertise across your pre- and post-reconciliation workflows. Drive better outcomes today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Sol taraf */}
            <div className="lg:col-span-4">
              <h2 className="text-5xl font-bold text-slate-900 leading-[1.1] mb-8">
                Core<br />Technology
              </h2>
              <div className="flex flex-col gap-3 items-start">
                <a 
                  href="https://github.com/burakmizan/lumina" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="learn-more-btn"
                >
                  <span className="circle" aria-hidden="true">
                    <span className="icon arrow"></span>
                  </span>
                  <span className="button-text">See the full stack</span>
                </a>
                <a 
                  href="https://github.com/burakmizan/lumina#readme"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Read the docs
                </a>
              </div>
            </div>

            {/* Sağ taraf - 2 kolonlu grid */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0">
                {[
                  { 
                    title: 'Google ADK 2.0', 
                    desc: 'Agent orchestration framework that coordinates multi-agent pipelines with built-in tool calling and state management.',
                    icon: 'adk'
                  },
                  { 
                    title: 'Gemini 3', 
                    desc: 'LLM Reasoning For semantic analysis, inconsistency detection, and vector search queries.',
                    icon: 'gemini'
                  },
                  { 
                    title: 'MongoDB Atlas', 
                    desc: 'Vector search and document storage with $vectorSearch, change streams, and serverless scaling for reconciliation data.',
                    icon: 'mongo'
                  },
                  { 
                    title: 'MCP Protocol', 
                    desc: 'Model Context Protocol standardization for tool exposure via HTTP/SSE transport with JSON-RPC handshake.',
                    icon: 'mcp'
                  },
                  { 
                    title: 'FastAPI', 
                    desc: 'Async Python backend handling concurrent agent runs, real-time SSE streams, and non-blocking database operations.',
                    icon: 'fastapi'
                  },
                  { 
                    title: 'Next.js 14', 
                    desc: 'React App Router with server components, streaming SSR, and interactive dashboard for human-in-the-loop approval.',
                    icon: 'next'
                  },
                  { 
                    title: 'Cloud Run', 
                    desc: 'Serverless container deployment with auto-scaling, zero cold starts, and pay-per-request billing on Google Cloud.',
                    icon: 'cloud'
                  },
                  { 
                    title: 'Apache 2.0', 
                    desc: 'Open source license enabling commercial use, modification, and distribution with full patent protection.',
                    icon: 'apache'
                  },
                ].map((tech) => (
                  <div key={tech.title} className="py-7 border-b border-slate-100 last:border-b-0 md:last:border-b">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        {tech.icon === 'adk' && (
                          <img 
                            src="https://cdn.simpleicons.org/google/334155" 
                            alt="Google ADK" 
                            className="w-5 h-5" 
                          />
                        )}
                        {tech.icon === 'gemini' && (
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                            <path d="M12 24C12 17.3726 6.6274 12 0 12C6.6274 12 12 6.6274 12 0C12 6.6274 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z"/>
                          </svg>
                        )}
                        {tech.icon === 'mongo' && (
                          <img 
                            src="https://cdn.simpleicons.org/mongodb/334155" 
                            alt="MongoDB" 
                            className="w-5 h-5" 
                          />
                        )}
                        {tech.icon === 'mcp' && (
                          <img 
                            src="https://cdn.jsdelivr.net/gh/modelcontextprotocol/docs@main/favicon.svg" 
                            alt="Model Context Protocol" 
                            className="w-5 h-5 opacity-80 mix-blend-multiply" 
                          />
                        )}
                        {tech.icon === 'fastapi' && (
                          <img 
                            src="https://cdn.simpleicons.org/fastapi/334155" 
                            alt="FastAPI" 
                            className="w-5 h-5" 
                          />
                        )}
                        {tech.icon === 'next' && (
                          <img 
                            src="https://cdn.simpleicons.org/nextdotjs/334155" 
                            alt="Next.js" 
                            className="w-5 h-5" 
                          />
                        )}
                        {tech.icon === 'cloud' && (
                          <img 
                            src="https://cdn.simpleicons.org/googlecloud/334155" 
                            alt="Google Cloud" 
                            className="w-5 h-5" 
                          />
                        )}
                        {tech.icon === 'apache' && (
                          <img 
                            src="https://cdn.simpleicons.org/apache/334155" 
                            alt="Apache" 
                            className="w-5 h-5" 
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">{tech.title}</h3>
                        <div className="w-full h-px bg-slate-100 mb-3"></div>
                        <p className="text-sm text-slate-500 leading-relaxed">{tech.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Center-fade grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 65%)',
            opacity: 0.6,
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-6 tracking-tight">
            Built for Enterprise. Auditable by Everyone.
          </h2>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Lumina is completely open-source because financial automation demands absolute certainty. We believe software handling enterprise ledgers should be fully inspectable, self-hostable, and secure. Audit the stack, extend the agents, and retain total custody of your financial intelligence.
          </p>

          <a
            href="https://github.com/burakmizan/lumina"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-700" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-sm font-semibold text-slate-700">@burakmizan/lumina</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-700">0</span>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-24 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          {/* Main footer grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Autonomous B2B financial discrepancy resolution. Built in the open.
              </p>
              <a
                href="https://github.com/burakmizan/lumina"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-700" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-xs font-semibold text-slate-700">Star</span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">0</span>
              </a>
            </div>

            <div></div>
            <div></div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-slate-500">Apache 2.0 License</span></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              © 2026 Lumina
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/burakmizan/lumina" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Watermark logo */}
        <img
          src="/lumina.png"
          alt=""
          className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-[24rem] w-auto object-contain opacity-[0.04] pointer-events-none select-none grayscale"
        />
      </footer>
    </div>
  )
}