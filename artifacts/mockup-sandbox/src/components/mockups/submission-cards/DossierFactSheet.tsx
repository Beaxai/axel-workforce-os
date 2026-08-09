import React, { useEffect, useState, useRef } from "react";
import {
  Building2, MapPin, Users, Factory, History, ShieldCheck,
  CheckCircle2, AlertCircle, ArrowUpRight, Edit2
} from "lucide-react";
import { SECTIONS, type Section } from "./_shared/data";

const ICONS: Record<string, any> = { Building2, MapPin, Users, Factory, History, ShieldCheck };

const STATS = [
  { label: "Locations", value: "4", icon: MapPin },
  { label: "Employees", value: "80", icon: Users },
  { label: "Annual Payroll", value: "$4.83M", icon: Factory },
  { label: "Exp Mod", value: "0.92", icon: ShieldCheck },
];

export function DossierFactSheet() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].key);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans p-6 selection:bg-indigo-500/30">
      <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: Sticky Navigation & Stats */}
        <div className="w-full md:w-[280px] shrink-0 sticky top-6 flex flex-col gap-8">
          
          {/* Header */}
          <div>
            <h1 className="text-white text-xl font-medium tracking-tight mb-1">Hans & Franz Cannabis</h1>
            <p className="text-zinc-500 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Submission Dossier
            </p>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((st) => (
              <div key={st.label} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <st.icon className="w-3 h-3" />
                  {st.label}
                </div>
                <div className="text-white font-mono text-lg">{st.value}</div>
              </div>
            ))}
          </div>

          {/* Table of Contents */}
          <nav className="flex flex-col gap-1 relative">
            <div className="absolute left-[11px] top-4 bottom-4 w-px bg-zinc-800/50 -z-10"></div>
            {SECTIONS.map((s) => {
              const Icon = ICONS[s.icon];
              const isActive = activeSection === s.key;
              const isComplete = s.status === "complete";
              
              return (
                <button
                  key={s.key}
                  onClick={() => scrollToSection(s.key)}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-md text-left transition-all ${
                    isActive ? "bg-zinc-800/80 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                    isActive ? "bg-[#050505] border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "bg-[#050505] border-zinc-800"
                  }`}>
                    {isComplete ? (
                      <div className={`w-2 h-2 rounded-full ${isActive ? "bg-indigo-400" : "bg-zinc-600"}`} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  
                  <span className={`text-sm font-medium ${isActive ? "" : ""}`}>{s.label}</span>
                  
                  {!isComplete && (
                    <span className="ml-auto text-[10px] font-mono bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                      {s.missing} missing
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT COLUMN: Continuous Scroll Document */}
        <div className="flex-1 min-w-0 flex flex-col gap-12 pb-32">
          {SECTIONS.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <section 
                key={s.key} 
                id={s.key}
                ref={(el) => (sectionRefs.current[s.key] = el)}
                className="scroll-mt-8 group"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-white text-lg font-medium">{s.label}</h2>
                      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                        {s.status === "complete" ? (
                          <span className="flex items-center gap-1 text-emerald-500/80">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-500/80">
                            <AlertCircle className="w-3 h-3" /> {s.missing} missing fields
                          </span>
                        )}
                        <span className="text-zinc-700">•</span>
                        <span>{s.fields.length} data points</span>
                      </div>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2 text-sm">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>

                {/* Section Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                  {s.fields.map((f, idx) => (
                    <div key={idx} className="relative group/field">
                      <div className="text-zinc-500 text-[11px] uppercase tracking-widest font-medium mb-1.5 flex items-center gap-1.5">
                        {f.label}
                        {f.required && <span className="text-indigo-400/70 text-lg leading-none">*</span>}
                        {f.rating && (
                          <span className="px-1 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-400 ml-auto border border-zinc-700/50" title="Rating Field">
                            RTG
                          </span>
                        )}
                      </div>
                      
                      <div className="relative">
                        {f.value === "—" ? (
                          <div className="h-8 flex items-center border border-dashed border-amber-500/30 bg-amber-500/5 rounded px-3 text-sm text-amber-500/70 font-mono">
                            Missing value
                          </div>
                        ) : (
                          <div className="text-zinc-100 text-[15px] font-mono tracking-tight leading-relaxed">
                            {f.value}
                          </div>
                        )}
                        
                        {/* Hover action for individual field */}
                        <div className="absolute right-0 top-0 bottom-0 flex items-center opacity-0 group-hover/field:opacity-100 transition-opacity -mr-8">
                          <button className="text-zinc-600 hover:text-indigo-400 p-1">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}
