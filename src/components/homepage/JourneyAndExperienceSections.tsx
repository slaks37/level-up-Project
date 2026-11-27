import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  Clock,
  Flame,
  GraduationCap,
  HeartPulse,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  EXPERIENCE_FEATURES,
  LEARNING_CYCLE_STEPS,
  SAMPLE_DEMO_QUESTS,
  SIX_GROWTH_DIMENSIONS,
  TRANSFORMATION_STAGES,
} from '../../data/homepageContent';
import { trackHomepageEvent } from '../../services/homepageEvents';

interface JourneyAndExperienceSectionsProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenPartnership: () => void;
}

const DIMENSION_ACCENTS: Record<string, { bar: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  amber: { bar: 'border-t-amber-600', badge: 'text-amber-800', icon: Sparkles },
  emerald: { bar: 'border-t-emerald-600', badge: 'text-emerald-800', icon: HeartPulse },
  sky: { bar: 'border-t-sky-600', badge: 'text-sky-800', icon: TrendingUp },
  indigo: { bar: 'border-t-indigo-600', badge: 'text-indigo-800', icon: Wallet },
  orange: { bar: 'border-t-orange-600', badge: 'text-orange-800', icon: Briefcase },
  teal: { bar: 'border-t-teal-600', badge: 'text-teal-800', icon: Users },
};

type PreviewTab = 'quest' | 'academy' | 'studio' | 'agnes';

const ACADEMY_TRACK_NAMES = [
  'Personal Development Academy',
  'Sociopreneur Academy',
  'Business Academy',
  'AI & Digital Academy',
  'Career & Future Skills Academy',
  'Agriculture & Local Business Academy',
  'Global Business & Export Academy',
] as const;

const AGNES_MODE_NAMES = [
  'Personal Coach',
  'Career Coach',
  'Learning Tutor',
  'Business Mentor',
  'Marketing Advisor',
  'Financial Assistant',
  'Wellness Companion',
  'Export Assistant',
  'Impact Advisor',
  'Daily Planner',
] as const;

export const JourneyAndExperienceSections: React.FC<JourneyAndExperienceSectionsProps> = ({
  onOpenAuth,
  onOpenPartnership,
}) => {
  const [activeStage, setActiveStage] = useState(0);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('quest');
  const [checkedQuests, setCheckedQuests] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [unitCost, setUnitCost] = useState(18000);
  const [marginPct, setMarginPct] = useState(35);

  const toggleQuest = (idx: number) => {
    setCheckedQuests((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const completedCount = SAMPLE_DEMO_QUESTS.filter((_, i) => checkedQuests[i]).length;
  const demoExp = SAMPLE_DEMO_QUESTS.reduce((sum, q, i) => sum + (checkedQuests[i] ? q.xp : 0), 0);
  const sellingPrice = Math.round(unitCost / Math.max(0.1, 1 - marginPct / 100));
  const profitPerUnit = sellingPrice - unitCost;

  return (
    <>
      {/* ===================================================================== */}
      {/* SECTION 06 — YOUR TRANSFORMATION JOURNEY (LEVEL 01 → LEVEL 05)        */}
      {/* ===================================================================== */}
      <section
        id="perjalanan"
        aria-labelledby="journey-heading"
        className="bg-slate-950 text-white border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-14">
          <div className="max-w-3xl space-y-4" data-reveal>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              YOUR TRANSFORMATION JOURNEY
            </p>
            <h2
              id="journey-heading"
              className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.14]"
            >
              Dari siapa kamu hari ini, menuju siapa kamu bisa menjadi.
            </h2>
          </div>

          {/* Connected 5-Stage Progression Pathway (Horizontal Desktop / Vertical Mobile) */}
          <div className="relative" data-reveal>
            {/* Desktop Horizontal Connecting Line */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-6 left-10 right-10 h-px bg-gradient-to-r from-amber-500/40 via-sky-400/60 to-emerald-400/70"
            />
            {/* Mobile Vertical Connecting Line */}
            <div
              aria-hidden="true"
              className="lg:hidden absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b from-amber-500/50 via-sky-400/50 to-emerald-400/70"
            />

            <ol className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-5 relative z-10">
              {TRANSFORMATION_STAGES.map((stage, idx) => {
                const isSelected = activeStage === idx;
                return (
                  <li key={stage.level} className="relative pl-14 lg:pl-0">
                    {/* Node Marker */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStage(idx);
                        trackHomepageEvent('journey_cta_clicked', {
                          location: 'transformation_journey',
                          level: stage.level,
                        });
                      }}
                      className={`w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg transition`}
                    >
                      <span
                        className={`absolute left-2.5 top-1 lg:static lg:mb-5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.45)]'
                            : 'bg-slate-900 text-slate-300 border-white/25 group-hover:border-amber-400/70'
                        }`}
                      >
                        0{idx + 1}
                      </span>

                      <div
                        className={`rounded-lg border p-5 space-y-2.5 transition ${
                          isSelected
                            ? 'bg-white/[0.07] border-amber-400/50'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
                          {stage.level} · {stage.code}
                        </p>
                        <h3 className="font-hud text-lg font-bold text-white">{stage.headline}</h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Closing Statement + CTA */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6" data-reveal>
            <p className="text-base sm:text-lg text-slate-200 font-medium max-w-2xl">
              Setiap perubahan besar dimulai dari satu langkah kecil yang dilakukan secara konsisten.
            </p>
            <button
              type="button"
              onClick={() => {
                trackHomepageEvent('journey_cta_clicked', {
                  location: 'journey_footer',
                  cta: 'Mulai Perjalananmu',
                });
                onOpenAuth('register');
              }}
              className="px-5 py-3 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs sm:text-sm uppercase tracking-wider inline-flex items-center gap-2 shrink-0 transition btn-anime self-start md:self-auto"
            >
              <span>Mulai Perjalananmu</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 07 — SIX DIMENSIONS OF GROWTH (EDITORIAL BENTO GRID)          */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="dimensions-heading"
        className="bg-[#faf9f5] text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-12">
          <div className="max-w-3xl space-y-4" data-reveal>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              SIX DIMENSIONS OF GROWTH
            </p>
            <h2
              id="dimensions-heading"
              className="font-hud text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-[1.14]"
            >
              Naik kelas dalam setiap aspek kehidupanmu.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Pertumbuhan tidak hanya diukur dari besarnya penghasilan atau tingginya jabatan.
              Pertumbuhan juga terlihat dari karakter, kesehatan, kemampuan, kemandirian, dan
              kontribusi yang kamu berikan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5" data-reveal>
            {SIX_GROWTH_DIMENSIONS.map((dim) => {
              const style = DIMENSION_ACCENTS[dim.accent];
              const Icon = style.icon;
              const colSpan = dim.span === 'wide' ? 'lg:col-span-3' : 'lg:col-span-3';
              return (
                <article
                  key={dim.number}
                  className={`${colSpan} rounded-lg border border-stone-200 border-t-2 ${style.bar} bg-white p-6 sm:p-7 flex flex-col justify-between gap-5`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-mono text-[11px] font-bold tracking-wider ${style.badge}`}>
                      {dim.number} — {dim.title}
                    </span>
                    <Icon className={`w-5 h-5 ${style.badge} shrink-0`} aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-hud text-xl font-bold text-slate-950">{dim.headline}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{dim.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 08 — THE LEVEL UP EXPERIENCE (HONEST FEATURES + LIVE PREVIEW) */}
      {/* ===================================================================== */}
      <section
        id="fitur"
        aria-labelledby="experience-heading"
        className="bg-white text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-14">
          <div className="max-w-3xl space-y-4" data-reveal>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-800">
              THE LEVEL UP EXPERIENCE
            </p>
            <h2
              id="experience-heading"
              className="font-hud text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-[1.14]"
            >
              Semua yang kamu butuhkan untuk memulai perjalanan perubahan.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Kenali berbagai pengalaman dan fasilitas yang membantu kamu mengembangkan potensi,
              merancang masa depan, dan menghasilkan perubahan nyata.
            </p>
          </div>

          {/* Interactive Real Product Preview Band */}
          <div
            className="rounded-xl border border-stone-300 bg-[#faf9f5] overflow-hidden"
            data-reveal
          >
            <div className="px-4 sm:px-6 py-3.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Pratinjau Interaktif · Modul Aktual Level Up
              </span>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pratinjau Modul">
                {(
                  [
                    { key: 'quest' as const, label: 'Daily Quest', icon: Target },
                    { key: 'academy' as const, label: 'LevelUp Academy', icon: GraduationCap },
                    { key: 'studio' as const, label: 'Business Studio', icon: Briefcase },
                    { key: 'agnes' as const, label: 'Agnes AI', icon: Bot },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = previewTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setPreviewTab(tab.key);
                        trackHomepageEvent('feature_clicked', {
                          location: 'interactive_preview',
                          feature: tab.label,
                        });
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-hud font-bold flex items-center gap-1.5 transition ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {previewTab === 'quest' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 space-y-3">
                    <p className="font-mono text-xs font-bold text-amber-800 uppercase">
                      Simulasi Daily Quest
                    </p>
                    <h3 className="font-hud text-xl font-bold text-slate-950">
                      Coba centang kebiasaan harianmu
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Setiap langkah kecil tercatat menjadi EXP, streak disiplin, dan dokumentasi
                      progres nyata. Masuk untuk menyimpan seluruh progresmu secara permanen.
                    </p>
                    <div className="flex items-center gap-4 pt-1 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded bg-slate-900 text-amber-400 font-bold">
                        +{demoExp} EXP
                      </span>
                      <span className="text-slate-700 font-semibold">
                        {completedCount}/{SAMPLE_DEMO_QUESTS.length} selesai
                      </span>
                    </div>
                  </div>
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SAMPLE_DEMO_QUESTS.map((q, idx) => {
                      const done = Boolean(checkedQuests[idx]);
                      return (
                        <button
                          key={q.time}
                          type="button"
                          onClick={() => toggleQuest(idx)}
                          className={`text-left p-3 rounded-lg border transition flex items-start gap-2.5 ${
                            done
                              ? 'bg-emerald-50/80 border-emerald-400/70'
                              : 'bg-white border-stone-200 hover:border-amber-500/60'
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              done
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-stone-400 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-bold text-amber-800">
                              {q.time} · {q.tag} · +{q.xp} EXP
                            </p>
                            <p
                              className={`text-xs font-medium mt-0.5 ${
                                done ? 'line-through text-slate-500' : 'text-slate-900'
                              }`}
                            >
                              {q.title}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {previewTab === 'academy' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-hud text-xl font-bold text-slate-950">
                        7 Jalur Pembelajaran di LevelUp Academy
                      </h3>
                      <p className="text-sm text-slate-600">
                        Terhubung langsung dengan Dream Map, Daily Quest, kuis kompetensi, dan bukti
                        karya di portofolio.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {ACADEMY_TRACK_NAMES.map((track, i) => (
                      <div
                        key={track}
                        className="rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-800 flex items-center gap-2.5"
                      >
                        <span className="font-mono text-[10px] font-bold text-indigo-700">
                          0{i + 1}
                        </span>
                        <span>{track}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'studio' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-6 space-y-2.5">
                    <p className="font-mono text-xs font-bold text-emerald-800 uppercase">
                      Simulasi Kalkulator HPP & Margin (1 dari 16 Tools Business Studio)
                    </p>
                    <h3 className="font-hud text-xl font-bold text-slate-950">
                      Perhitungan deterministik, bukan sekadar tebakan
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Business Studio menyediakan 16 kanvas & kalkulator bisnis mulai dari Social
                      Problem Canvas, BMC, HPP, Cash Flow, Break-Even Analysis, Legal Readiness,
                      hingga Export Readiness.
                    </p>
                  </div>
                  <div className="lg:col-span-6 rounded-lg border border-stone-200 bg-white p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1 block">
                        <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                          HPP per Unit (Rp)
                        </span>
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          value={unitCost}
                          onChange={(e) => setUnitCost(Math.max(1000, Number(e.target.value) || 0))}
                          className="w-full rounded border border-stone-300 px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                          Target Margin ({marginPct}%)
                        </span>
                        <input
                          type="range"
                          min={10}
                          max={70}
                          value={marginPct}
                          onChange={(e) => setMarginPct(Number(e.target.value))}
                          className="w-full accent-amber-600 mt-2"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                      <div>
                        <p className="font-mono text-[10px] text-slate-500">Rekomendasi Harga Jual</p>
                        <p className="font-hud text-lg font-bold text-slate-950">
                          Rp {sellingPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-slate-500">Margin Kotor / Unit</p>
                        <p className="font-hud text-lg font-bold text-emerald-700">
                          Rp {profitPerUnit.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'agnes' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-hud text-xl font-bold text-slate-950">
                        Agnes AI 2.0 — 10 Mode Pendampingan dengan Batas Privasi Ketat
                      </h3>
                      <p className="text-sm text-slate-600">
                        Jurnal pribadi dan data kesehatan tetap privat (Privacy by Default) kecuali
                        kamu izinkan secara eksplisit.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-mono text-[10px] font-bold text-emerald-900">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      Privacy by Default
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {AGNES_MODE_NAMES.map((mode) => (
                      <div
                        key={mode}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-hud font-bold text-slate-800 text-center"
                      >
                        {mode}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 9 Feature Cards — Honest Availability Verification */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-reveal>
            {EXPERIENCE_FEATURES.map((feat) => {
              const isComingSoon = feat.status === 'coming_soon';
              return (
                <article
                  key={feat.number}
                  className={`rounded-lg border p-6 flex flex-col justify-between gap-5 transition-colors ${
                    isComingSoon
                      ? 'border-dashed border-stone-300 bg-[#faf9f5]/80'
                      : 'border-stone-200 bg-[#faf9f5] hover:border-amber-500/60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-800">
                        {feat.number} — {feat.name}
                      </span>
                      {isComingSoon ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-200 text-slate-700 font-mono text-[10px] font-bold">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Segera Hadir
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-[160px]">
                          {feat.officialModule}
                        </span>
                      )}
                    </div>

                    <h3 className="font-hud text-lg font-bold text-slate-950">{feat.headline}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feat.description}</p>
                  </div>

                  <div className="pt-3 border-t border-stone-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        trackHomepageEvent('feature_clicked', {
                          location: 'experience_grid',
                          feature: feat.name,
                          status: feat.status,
                        });
                        if (isComingSoon) {
                          onOpenPartnership();
                        } else {
                          onOpenAuth('register');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-hud font-bold uppercase tracking-wider text-slate-950 hover:text-amber-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                    >
                      <span>{feat.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 09 — LEARNING BY DOING (CONTINUOUS 5-STEP CYCLE)              */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="methodology-heading"
        className="bg-[#faf9f5] text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end" data-reveal>
            <div className="lg:col-span-6 space-y-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
                LEARNING BY DOING
              </p>
              <h2
                id="methodology-heading"
                className="font-hud text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-[1.15]"
              >
                Pengetahuan menjadi bernilai ketika digunakan untuk menciptakan perubahan.
              </h2>
            </div>
            <div className="lg:col-span-6 space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                Di Level Up, perjalanan belajar tidak berhenti ketika sebuah materi selesai
                dipelajari.
              </p>
              <p>
                Kamu didorong untuk mengamati dunia di sekitarmu, memahami kebutuhan manusia, mencoba
                ide baru, menghasilkan karya, dan mengevaluasi dampak yang kamu ciptakan.
              </p>
            </div>
          </div>

          {/* Continuous Learning Cycle Visual */}
          <div className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8 space-y-8" data-reveal>
            <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-2 font-bold text-slate-800">
                <RefreshCw className="w-4 h-4 text-amber-700" aria-hidden="true" />
                SIKLUS PEMBELAJARAN BERKELANJUTAN
              </span>
              <span className="hidden sm:inline">LEARN → THINK → CREATE → ACT → REFLECT</span>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {LEARNING_CYCLE_STEPS.map((item, idx) => (
                <li
                  key={item.key}
                  className="relative rounded-lg border border-stone-200 bg-[#faf9f5] p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-amber-800">
                      {item.step}
                    </span>
                    {idx < LEARNING_CYCLE_STEPS.length - 1 ? (
                      <ArrowRight
                        className="w-4 h-4 text-stone-400 hidden lg:block"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw
                        className="w-3.5 h-3.5 text-emerald-700 hidden lg:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <h3 className="font-hud text-xl font-bold text-slate-950 tracking-wide">
                    {item.key}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>

            {/* Closing Statement */}
            <div className="pt-6 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <p className="font-hud text-base sm:text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                <Layers className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                Belajar untuk berkarya.
              </p>
              <p className="font-hud text-base sm:text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
                Berkarya untuk menciptakan nilai.
              </p>
              <p className="font-hud text-base sm:text-lg font-bold text-amber-800 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                Menciptakan nilai untuk membawa perubahan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
