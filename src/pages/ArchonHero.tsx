import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Zap, Cpu, Layers, Layout, MessageCircle } from "lucide-react";

export default function ArchonHero() {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ agents: 64, skills: 31, tools: 242, flywheel: 12 });

    return (
        <div className="archon-hero-root min-h-screen bg-[#0b1216] text-[#e8f4f8] font-['Space_Grotesk'] overflow-x-hidden">
            {/* Background Orbs */}
            <div className="orb orb-a"></div>
            <div className="orb orb-b"></div>

            <header className="hero max-w-6xl mx-auto pt-24 px-6 md:px-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <p className="eyebrow font-['IBM_Plex_Mono'] text-[#ff9e44] tracking-[0.08em] text-sm mb-2 uppercase">
                    ARCHON-X OPERATING SYSTEM
                </p>
                <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4">
                    Mission Console
                </h1>
                <p className="sub text-[#9fbdca] text-lg max-w-2xl mb-8">
                    Real-time command surface for the 64-agent swarm, flywheel loop, and live theater feed.
                    The next evolution of autonomous agency orchestration.
                </p>
                <div className="actions flex flex-wrap gap-4">
                    <Button
                        onClick={() => navigate("/login")}
                        className="rounded-full px-8 py-6 bg-gradient-to-r from-[#ff9e44] to-[#ffbd7d] text-[#1e1308] font-bold hover:scale-105 transition-transform"
                    >
                        Enter Control Plane
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-full px-8 py-6 border-[#e8f4f8]/30 hover:bg-[#e8f4f8]/10"
                    >
                        Watch Demo
                    </Button>
                </div>
            </header>

            <main className="grid max-w-6xl mx-auto mt-16 px-6 md:px-12 grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {/* System Overview */}
                <div className="card-custom">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="text-[#ff9e44] h-5 w-5" />
                        System Overview
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <StatItem label="Agents" value={counts.agents} />
                        <StatItem label="Skills" value={counts.skills} />
                        <StatItem label="Tools" value={counts.tools} />
                        <StatItem label="Flywheel" value={counts.flywheel} />
                    </div>
                </div>

                {/* Agent Theater */}
                <div className="card-custom">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="text-[#35c2d5] h-5 w-5" />
                        Agent Theater
                    </h2>
                    <div className="space-y-3">
                        <EventItem type="RESEARCH" desc="Synthesizing repo awareness patterns" />
                        <EventItem type="CODE" desc="Optimizing CLI entrypoints for jCodeMunch" />
                        <EventItem type="DEPLOY" desc="Routing agent traffic to Vercel edge" />
                    </div>
                </div>

                {/* Pauli's Place */}
                <div className="card-custom">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageCircle className="text-[#ff6f5e] h-5 w-5" />
                        Pauli's Place
                    </h2>
                    <div className="space-y-3">
                        <EventItem type="14:00" desc="Architecture Review: Phase 2" />
                        <EventItem type="16:30" desc="Agent Onboarding: Synthia 3.0" />
                    </div>
                </div>

                {/* Live Status */}
                <div className="card-custom">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Layers className="text-primary h-5 w-5" />
                        Signal Analysis
                    </h2>
                    <div className="bg-black/40 rounded-lg p-4 font-['IBM_Plex_Mono'] text-xs text-green-400 min-h-[140px] border border-white/5">
                        [SYS] Kernel boot sequence complete...<br />
                        [SYS] 64 agents initialized in dual-crew mode...<br />
                        [SYS] Webhook listener active on port 8080...<br />
                        [SYS] Waiting for instructions...
                    </div>
                </div>
            </main>

            <footer className="max-w-6xl mx-auto px-12 py-8 flex justify-between items-center text-[#9fbdca] text-sm border-t border-white/5">
                <span>Status: <b className="text-[#35c2d5]">LIVE</b></span>
                <span>built by the pauli effect &copy; 2026</span>
            </footer>

            <style>{`
        .orb {
          position: fixed;
          border-radius: 999px;
          filter: blur(52px);
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
        }
        .orb-a {
          width: 25rem;
          height: 25rem;
          background: #ff9e44;
          top: -10rem;
          left: -10rem;
          animation: drift 15s ease-in-out infinite alternate;
        }
        .orb-b {
          width: 30rem;
          height: 30rem;
          background: #35c2d5;
          bottom: -15rem;
          right: -10rem;
          animation: drift 18s ease-in-out infinite alternate-reverse;
        }
        @keyframes drift {
          from { transform: translate(0, 0); }
          to { transform: translate(40px, 20px); }
        }
        .card-custom {
          background: rgba(17, 30, 36, 0.8);
          border: 1px solid rgba(148, 196, 219, 0.28);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(12px);
          z-index: 10;
          position: relative;
        }
      `}</style>
        </div>
    );
}

function StatItem({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="bg-black/20 border border-white/5 p-4 rounded-xl">
            <span className="text-xs text-[#9fbdca] block uppercase mb-1">{label}</span>
            <strong className="text-2xl font-bold">{value}</strong>
        </div>
    );
}

function EventItem({ type, desc }: { type: string; desc: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 text-sm">
            <span className="font-['IBM_Plex_Mono'] text-[#35c2d5] font-bold min-w-[70px]">{type}</span>
            <span className="text-[#e8f4f8]/80">{desc}</span>
        </div>
    );
}
