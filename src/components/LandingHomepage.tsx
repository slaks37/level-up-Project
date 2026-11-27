import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  Gift,
  Globe,
  GraduationCap,
  HeartHandshake,
  Layers,
  Lock,
  Maximize2,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  Users,
  Volume2,
  Wrench,
  X,
} from 'lucide-react';
import type { Language } from '../types';
import { DEVELOPMENT_DIMENSIONS } from '../engine/v2/dimensions';
import { DEVELOPMENT_PATHWAYS } from '../engine/v2/pathways';

interface LandingHomepageProps {
  lang: Language;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const SAMPLE_QUESTS = [
  {
    time: '07:00',
    tagId: 'HEALTH',
    tagEn: 'HEALTH',
    titleId: 'Workout ringan 20 menit & catat energi pagi',
    titleEn: '20-min morning workout & energy check-in',
    xp: 20,
    coin: 1,
  },
  {
    time: '10:00',
    tagId: 'ACADEMY',
    tagEn: 'ACADEMY',
    titleId: 'Pelajari modul Riset Pelanggan & validasi masalah sosial',
    titleEn: 'Study Customer Discovery & social problem validation',
    xp: 25,
    coin: 1,
  },
  {
    time: '14:00',
    tagId: 'STUDIO',
    tagEn: 'STUDIO',
    titleId: 'Hitung HPP, Harga Jual & BEP di Business Studio',
    titleEn: 'Calculate COGS, Pricing & Break-Even in Business Studio',
    xp: 30,
    coin: 1,
  },
  {
    time: '19:30',
    tagId: 'IMPACT',
    tagEn: 'IMPACT',
    titleId: 'Unggah bukti wawancara komunitas ke Evidence Vault',
    titleEn: 'Submit community interview proof to Evidence Vault',
    xp: 35,
    coin: 1,
  },
] as const;

const SOCIOPRENEUR_JOURNEY = [
  { step: '01', name: 'Awakening', id: 'Kenali diri, tujuan & arah hidup', en: 'Discover purpose & direction' },
  { step: '02', name: 'Discover', id: 'Petakan masalah sosial & potensi lokal', en: 'Map social problems & local potential' },
  { step: '03', name: 'Understand', id: 'Wawancarai pelanggan & komunitas', en: 'Interview customers & community' },
  { step: '04', name: 'Learn', id: 'Pelajari skill bisnis yang dibutuhkan', en: 'Master essential venture skills' },
  { step: '05', name: 'Design', id: 'Rancang solusi, BMC & struktur HPP', en: 'Design solution, BMC & unit economics' },
  { step: '06', name: 'Prototype', id: 'Buat produk atau layanan awal (MVP)', en: 'Build minimum viable prototype' },
  { step: '07', name: 'Validate', id: 'Uji pasar & asumsi bisnis secara nyata', en: 'Validate market demand with evidence' },
  { step: '08', name: 'Launch', id: 'Mulai transaksi, SOP & kesiapan legal', en: 'Launch sales, SOP & legal readiness' },
  { step: '09', name: 'Grow', id: 'Stabilkan arus kas & kesiapan ekspor', en: 'Scale cash flow & export readiness' },
  { step: '10', name: 'Impact', id: 'Ukur & perluas dampak sosial berkelanjutan', en: 'Measure verified social impact' },
] as const;

const ACADEMY_TRACKS = [
  { code: '01', title: 'Personal Development Academy', descId: 'Kebiasaan, fokus, manajemen energi & refleksi diri', descEn: 'Habits, focus, energy management & reflection' },
  { code: '02', title: 'Sociopreneur Academy', descId: 'Riset masalah sosial, desain dampak & inkubasi usaha sosial', descEn: 'Social problem discovery, impact design & incubation' },
  { code: '03', title: 'Business Academy', descId: 'Value proposition, BMC, HPP, arus kas, BEP & operasional', descEn: 'Value proposition, BMC, COGS, cash flow, BEP & ops' },
  { code: '04', title: 'AI & Digital Academy', descId: 'Pemanfaatan AI, pemasaran digital & produktivitas modern', descEn: 'Applied AI, digital marketing & modern execution' },
  { code: '05', title: 'Career & Future Skills Academy', descId: 'Kepemimpinan, manajemen proyek & akselerasi karier', descEn: 'Leadership, project execution & career growth' },
  { code: '06', title: 'Agriculture & Local Business Academy', descId: 'Potensi desa, agribisnis, rantai pasok & UMKM komunitas', descEn: 'Local commodities, agribusiness & community supply chains' },
  { code: '07', title: 'Global Business & Export Academy', descId: 'Legalitas, standar mutu, HS Code, MOQ & kurasi ekspor B2B', descEn: 'Compliance, quality standards, HS Code & B2B export' },
] as const;

const STUDIO_HIGHLIGHTS = [
  'Personal Development Canvas',
  'Social Problem Canvas',
  'Community Potential Mapping',
  'Customer Research',
  'Value Proposition Canvas',
  'Business Model Canvas (BMC)',
  'Product Prototyping',
  'Business Experiment Tracker',
  'HPP & Pricing Calculator',
  'Cash Flow Projection',
  'Break-Even Analysis (BEP)',
  'Marketing Plan',
  'Operational Planning',
  'Legal Readiness Checklist',
  'Export Readiness Checklist',
  'Social Impact Measurement',
] as const;

const AGNES_MODES_LIST = [
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

const HERO_YOUTUBE_ID = 'ZP_SPrmzwo0';
const HERO_YOUTUBE_WATCH_URL = `https://youtu.be/${HERO_YOUTUBE_ID}`;
const HERO_AMBIENT_EMBED_URL = `https://www.youtube.com/embed/${HERO_YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${HERO_YOUTUBE_ID}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1`;
const HERO_PLAYER_EMBED_URL = `https://www.youtube.com/embed/${HERO_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

type ShowcaseTab = 'hud' | 'academy' | 'studio' | 'agnes';

export const LandingHomepage: React.FC<LandingHomepageProps> = ({ lang, onOpenAuth }) => {
  const id = lang === 'id';
  const [checkedQuests, setCheckedQuests] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('hud');
  const [heroVideoMode, setHeroVideoMode] = useState<'ambient' | 'inline' | 'cinema'>('ambient');
  const [posterUrl, setPosterUrl] = useState(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/maxresdefault.jpg`);

  const toggleSampleQuest = (index: number) => {
    setCheckedQuests((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const completedDemoCount = SAMPLE_QUESTS.filter((_, i) => checkedQuests[i]).length;
  const demoExp = SAMPLE_QUESTS.reduce((sum, q, i) => sum + (checkedQuests[i] ? q.xp : 0), 0);
  const demoCoins = SAMPLE_QUESTS.reduce((sum, q, i) => sum + (checkedQuests[i] ? q.coin : 0), 0);
  const demoPct = Math.round((completedDemoCount / SAMPLE_QUESTS.length) * 100);

  return (
    <div className="bg-[#faf9f5] text-slate-900 -mx-3 sm:-mx-6 -my-4 sm:-my-5 border-t border-stone-200/80">
      {/* ===================================================================== */}
      {/* 1. CINEMATIC VIDEO HERO — LEVEL UP TEASER (YOUTUBE: ZP_SPrmzwo0)      */}
      {/* ===================================================================== */}
      <section className="relative overflow-hidden bg-slate-950 text-white border-b border-stone-800">
        {/* Full-bleed Ambient Video Backdrop + Poster Fallback */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <img
            src={posterUrl}
            onError={() => setPosterUrl(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/hqdefault.jpg`)}
            alt="Level UP Teaser"
            className="w-full h-full object-cover scale-105 opacity-40"
          />
          {heroVideoMode === 'ambient' && (
            <iframe
              src={HERO_AMBIENT_EMBED_URL}
              title="Level UP Teaser Background"
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full opacity-55 border-0"
            />
          )}
          {/* Cinematic Contrast Scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/50" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 backdrop-blur-xs px-3.5 py-1 text-[11px] font-mono font-bold text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>LEVELUP 2.0 · HUMAN &amp; SOCIOPRENEUR DEVELOPMENT OS</span>
              </div>

              <div className="space-y-3">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-sky-300">
                  Level Up System — Awaken Your Entrepreneurial Spirit
                </p>
                <h1 className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12] drop-shadow-sm">
                  Level Up Yourself.{' '}
                  <span className="text-amber-300">Level Up Your Business.</span>{' '}
                  <span className="text-sky-300">Level Up Your Impact.</span>
                </h1>
              </div>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl">
                {id
                  ? 'Bukan sekadar LMS konvensional. Level Up adalah sistem operasi harian untuk menjalani proses menjadi sociopreneur setiap hari — mulai dari membentuk kebiasaan, kesehatan, karier, belajar di Academy, membangun usaha di Business Studio, hingga mengakses pasar Sociopreneur.online.'
                  : 'Not a conventional LMS. Level Up is a daily operating system to live the sociopreneur journey every day — building habits, health, career skills, Academy competencies, Business Studio ventures, and real market access through Sociopreneur.online.'}
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-950/40 transition btn-anime"
                >
                  <span>{id ? 'Mulai Perjalananmu' : 'Start Your Journey'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-xs text-white font-hud font-bold text-sm uppercase tracking-wider transition btn-anime"
                >
                  {id ? 'Masuk ke Akun' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setHeroVideoMode('cinema')}
                  className="px-4 py-3 rounded-lg bg-slate-900/70 hover:bg-slate-800/90 border border-amber-400/35 text-amber-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>{id ? 'Tonton Teaser (Suara)' : 'Watch Teaser (Sound)'}</span>
                </button>
              </div>

              {/* Trust / Capability Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15 text-xs">
                <div>
                  <p className="font-hud text-xl font-bold text-white">7</p>
                  <p className="text-slate-300">{id ? 'Dimensi Pengembangan' : 'Growth Dimensions'}</p>
                </div>
                <div>
                  <p className="font-hud text-xl font-bold text-white">16</p>
                  <p className="text-slate-300">{id ? 'Tools Business Studio' : 'Business Studio Tools'}</p>
                </div>
                <div>
                  <p className="font-hud text-xl font-bold text-white">10</p>
                  <p className="text-slate-300">{id ? 'Mode Agnes AI Copilot' : 'Agnes AI Copilot Modes'}</p>
                </div>
                <div>
                  <p className="font-hud text-xl font-bold text-white">30+</p>
                  <p className="text-slate-300">{id ? 'Profesi & 6 Pathway' : 'Professions & 6 Pathways'}</p>
                </div>
              </div>
            </div>

            {/* Right Featured 16:9 Level UP Teaser Player */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-white/20 bg-slate-900/75 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden">
                {/* Player Top Chrome */}
                <div className="px-4 py-2.5 bg-slate-950/70 border-b border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="font-mono text-[11px] font-bold text-slate-200 truncate">
                      {id ? 'OFFICIAL TEASER · LEVEL UP SYSTEM' : 'OFFICIAL TEASER · LEVEL UP SYSTEM'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHeroVideoMode('cinema')}
                      className="text-[11px] font-mono font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{id ? 'Layar Penuh' : 'Cinema'}</span>
                    </button>
                    <a
                      href={HERO_YOUTUBE_WATCH_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 16:9 Stage */}
                <div className="relative aspect-video bg-black">
                  {heroVideoMode === 'inline' ? (
                    <iframe
                      src={HERO_PLAYER_EMBED_URL}
                      title="Level UP Teaser"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHeroVideoMode('inline')}
                      className="group relative w-full h-full block text-left focus:outline-none"
                      aria-label={id ? 'Putar Video Level UP Teaser dengan suara' : 'Play Level UP Teaser with sound'}
                    >
                      <img
                        src={posterUrl}
                        onError={() => setPosterUrl(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/hqdefault.jpg`)}
                        alt="Level UP Teaser"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/20 group-hover:via-slate-950/15 transition" />

                      {/* Central Play Trigger */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/95 group-hover:bg-amber-400 group-hover:scale-110 text-slate-950 flex items-center justify-center shadow-xl shadow-black/50 ring-4 ring-white/25 transition">
                          <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-slate-950 ml-1" />
                        </span>
                        <span className="px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-white/20 backdrop-blur-xs font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          {id ? 'Putar Level UP Teaser Dengan Suara' : 'Play Level UP Teaser With Sound'}
                        </span>
                      </div>

                      {/* Bottom Caption Strip */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-200">
                        <span className="truncate font-semibold">Level UP Teaser</span>
                        <span className="px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-[10px] text-amber-200 shrink-0">
                          HD 16:9
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="px-4 py-3 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">
                    {id
                      ? 'Siap berubah dari penonton menjadi pelaku nyata?'
                      : 'Ready to move from watching to taking daily action?'}
                  </span>
                  <div className="flex items-center gap-2">
                    {heroVideoMode === 'inline' && (
                      <button
                        type="button"
                        onClick={() => setHeroVideoMode('ambient')}
                        className="px-2.5 py-1 rounded-md border border-white/20 text-[11px] font-mono text-slate-300 hover:text-white transition"
                      >
                        {id ? 'Kembali ke Pratinjau' : 'Back to Preview'}
                      </button>
                    )}
                    <a
                      href="#cara-kerja"
                      className="font-mono text-[11px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4"
                    >
                      {id ? 'Lihat 10 Tahap ↓' : 'See 10 Stages ↓'}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen Cinema Video Modal */}
      {heroVideoMode === 'cinema' && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Level UP Teaser Cinema Player"
          onClick={() => setHeroVideoMode('ambient')}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-white/20 bg-black overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-2 text-white">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                <span className="font-hud font-bold text-sm">Level UP Teaser — Official Video</span>
              </div>
              <button
                type="button"
                onClick={() => setHeroVideoMode('ambient')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                aria-label={id ? 'Tutup pemutar video' : 'Close video player'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={HERO_PLAYER_EMBED_URL}
                title="Level UP Teaser Cinema"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. 7 DEVELOPMENT DIMENSIONS & 6 PATHWAYS                              */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        {/* 7 Dimensions */}
        <div className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700">
              {id ? '01 · KERANGKA PENGEMBANGAN UTUH' : '01 · HOLISTIC DEVELOPMENT FRAMEWORK'}
            </p>
            <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
              {id ? '7 Dimensi Pengembangan Diri & Usaha' : '7 Dimensions of Personal & Venture Growth'}
            </h2>
            <p className="text-sm text-slate-600">
              {id
                ? 'Ketujuh dimensi ini tidak harus dikerjakan sekaligus. Awakening 2.0 dan Agnes AI membantu menentukan prioritas berdasarkan kondisi, tujuan, dan kapasitas waktumu.'
                : 'You do not need to tackle all seven at once. Awakening 2.0 and Agnes AI help prioritize based on your current stage, goals, and daily capacity.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {DEVELOPMENT_DIMENSIONS.map((dim, idx) => (
              <div
                key={dim.id}
                className="rounded-xl border border-stone-200 bg-white p-4 space-y-1.5 hover:border-amber-300 transition"
              >
                <span className="font-mono text-[10px] font-bold text-amber-700">
                  0{idx + 1} · {dim.id}
                </span>
                <h3 className="font-hud font-bold text-base text-slate-900">
                  {id ? dim.labelId : dim.labelEn}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {id ? dim.shortDescId : dim.shortDescEn}
                </p>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-amber-800 uppercase">
                  {id ? 'DUAL-TRACK HARIAN' : 'DAILY DUAL-TRACK'}
                </span>
                <h3 className="font-hud font-bold text-base text-slate-900">
                  {id ? 'Karier Jalan, Impian Tetap Dikejar' : 'Career Moves Forward, Dreams Advance Too'}
                </h3>
                <p className="text-xs text-amber-950/80">
                  {id
                    ? 'Check-in target harian otomatis masuk ke To-Do List sambil menjaga keseimbangan peran kerja dan langkah Peta Impian.'
                    : 'Morning target check-ins auto-capture into your To-Do list while keeping both career and dream tracks active.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Optional Pathways */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-1.5">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-sky-700">
                {id ? '02 · 6 JALUR PENGEMBANGAN (DI ATAS 30+ PROFESI)' : '02 · 6 DEVELOPMENT PATHWAYS'}
              </p>
              <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
                {id ? 'Pilih Pathway Tanpa Meninggalkan Profesimu' : 'Extend Your Profession With a Focused Pathway'}
              </h2>
              <p className="text-sm text-slate-600">
                {id
                  ? 'Petani, guru, programmer, mahasiswa, maupun karyawan tetap mempertahankan profesinya sambil menambahkan jalur pertumbuhan pilihan.'
                  : 'Farmers, educators, engineers, students, and professionals keep their core profession while activating any optional growth pathway.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {DEVELOPMENT_PATHWAYS.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-stone-200 bg-white p-4 flex flex-col justify-between gap-3 hover:border-sky-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-hud font-bold text-base text-slate-900">
                      {id ? p.nameId : p.nameEn}
                    </h3>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-slate-700">
                      {p.stageCount} {id ? 'Tahap' : 'Stages'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {id ? p.taglineId : p.taglineEn}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 pt-2 border-t border-stone-100">
                  {p.primaryDimensions.map((d) => (
                    <span
                      key={d}
                      className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200/80"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. THE SOCIOPRENEUR JOURNEY — 10-STAGE DREAM MAP 2.0                  */}
      {/* ===================================================================== */}
      <section id="cara-kerja" className="border-y border-stone-200 bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700">
              {id ? '03 · DREAM MAP 2.0 · THE SOCIOPRENEUR JOURNEY' : '03 · DREAM MAP 2.0 · THE SOCIOPRENEUR JOURNEY'}
            </p>
            <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
              {id ? '10 Tahap Terstruktur dari Awakening hingga Impact' : '10 Structured Stages from Awakening to Impact'}
            </h2>
            <p className="text-sm text-slate-600">
              {id
                ? 'Peta Impian 5 tahap klasik tetap tersedia untuk tujuan umum, dan diperluas menjadi 10 tahap berbasis bukti nyata untuk jalur Sociopreneur.'
                : 'The classic 5-phase Dream Map remains available for general goals, expanded into a 10-stage evidence-backed roadmap for Sociopreneurs.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SOCIOPRENEUR_JOURNEY.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-stone-200 bg-[#faf9f5] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-700">{item.step}</span>
                  <Compass className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <h3 className="font-hud font-bold text-sm text-slate-900">{item.name}</h3>
                <p className="text-[11px] text-slate-600 leading-snug">{id ? item.id : item.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. INTEGRATED WORKSPACE SHOWCASE (HUD / ACADEMY / STUDIO / AGNES)     */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700">
            {id ? '04 · EMPAT WORKSPACE TERINTEGRASI' : '04 · FOUR INTEGRATED WORKSPACES'}
          </p>
          <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
            {id ? 'Satu Sistem Operasi untuk Belajar, Berkarya & Berdampak' : 'One Operating System for Learning, Building & Impact'}
          </h2>
        </div>

        {/* Clean Tab Switcher */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'hud' as const, icon: Target, labelId: 'Command Center & Quests', labelEn: 'Command Center & Quests' },
              { key: 'academy' as const, icon: GraduationCap, labelId: 'LevelUp Academy (7 Trek)', labelEn: 'LevelUp Academy (7 Tracks)' },
              { key: 'studio' as const, icon: Briefcase, labelId: 'Business Studio (16 Tools)', labelEn: 'Business Studio (16 Tools)' },
              { key: 'agnes' as const, icon: Bot, labelId: 'Agnes AI 2.0 (10 Mode)', labelEn: 'Agnes AI 2.0 (10 Modes)' },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeShowcase === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveShowcase(t.key)}
                className={`px-4 py-2 rounded-xl border text-xs font-hud font-bold flex items-center gap-2 transition ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-stone-300 hover:border-amber-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-amber-700'}`} />
                <span>{id ? t.labelId : t.labelEn}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7 shadow-xs">
          {activeShowcase === 'hud' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3.5 text-xs">
                <div className="rounded-xl border border-stone-200 bg-[#faf9f5] p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-700 shrink-0" />
                    <h3 className="font-hud font-bold text-sm text-slate-900">
                      {id ? 'Daily Quests & Streak Disiplin' : 'Daily Quests & Habit Streaks'}
                    </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {id
                      ? 'Streak terpisah untuk konsistensi Harian, Tugas, dan Workout, plus tangkap target harian otomatis ke To-Do List & integrasi Google Calendar.'
                      : 'Dedicated Daily, Task, and Workout streaks, automatic morning target capture, and direct Google Calendar integration.'}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-[#faf9f5] p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-700 shrink-0" />
                    <h3 className="font-hud font-bold text-sm text-slate-900">
                      {id ? 'Jurnal Energi, Tidur & Nutrisi' : 'Energy, Sleep & Nutrition Journal'}
                    </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {id
                      ? 'Check-in pagi, siang, dan malam yang adaptif terhadap kondisi fisik, lengkap dengan Coach Karier, Gym Coach, dan Refleksi Harian.'
                      : 'Morning, midday, and evening check-ins adapting workout & focus plans with Career Coach, Gym Coach, and Daily Reflection.'}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-[#faf9f5] p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="font-hud font-bold text-sm text-slate-900">
                      {id ? 'Privasi Jurnal Pribadi Terjaga' : 'Owner-Only Private Journals'}
                    </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {id
                      ? 'Jurnal pribadi, mood, tidur, dan kalender bersifat privat milik peserta (Privacy by Default / UU PDP) dan tidak dibagikan otomatis.'
                      : 'Private journals, mood, sleep logs, and personal calendar stay owner-only by default with explicit consent controls.'}
                  </p>
                </div>
              </div>

              {/* Interactive Daily Quest Preview Card */}
              <div className="lg:col-span-5 rounded-2xl border border-stone-300/90 bg-[#faf9f5] overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-700">
                    {id ? 'COBA DAILY QUESTS' : 'TRY DAILY QUESTS'}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                    +{demoExp} EXP · +{demoCoins} KOIN
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-700">{id ? 'Klik tugas untuk simulasi:' : 'Toggle quests to preview:'}</span>
                      <span className="font-mono text-amber-800 font-bold">
                        {completedDemoCount}/{SAMPLE_QUESTS.length} ({demoPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-emerald-600 transition-all duration-300"
                        style={{ width: `${demoPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {SAMPLE_QUESTS.map((q, idx) => {
                      const done = Boolean(checkedQuests[idx]);
                      return (
                        <button
                          key={q.time}
                          type="button"
                          onClick={() => toggleSampleQuest(idx)}
                          className={`w-full text-left p-2 rounded-xl border transition flex items-start gap-2 ${
                            done
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-white border-stone-200 hover:border-amber-400'
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${
                              done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-400 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <div className="min-w-0 flex-grow">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                              <span className="font-bold text-amber-800">
                                {q.time} · {id ? q.tagId : q.tagEn}
                              </span>
                              <span className="text-slate-500">+{q.xp} EXP</span>
                            </div>
                            <p className={`text-xs font-semibold mt-0.5 ${done ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {id ? q.titleId : q.titleEn}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-hud font-bold text-[11px] uppercase tracking-wider transition"
                  >
                    {id ? 'Daftar untuk Menyimpan Progres →' : 'Register to Save Progress →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeShowcase === 'academy' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {id
                  ? 'Academy terintegrasi langsung dengan Dream Map, Daily Quests, Evidence Vault, Rubrik Mentor, dan Sertifikat Terverifikasi:'
                  : 'LevelUp Academy connects directly to your Dream Map, Daily Quests, Evidence Vault, Mentor rubrics, and verifiable certificates:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ACADEMY_TRACKS.map((track) => (
                  <div key={track.code} className="rounded-xl border border-stone-200 bg-[#faf9f5] p-3.5 space-y-1">
                    <span className="font-mono text-[10px] font-bold text-indigo-700">{track.code}</span>
                    <h3 className="font-hud font-bold text-sm text-slate-900">{track.title}</h3>
                    <p className="text-[11px] text-slate-600">{id ? track.descId : track.descEn}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeShowcase === 'studio' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {id
                  ? 'Bukan sekadar kumpulan worksheet — workspace interaktif tempat kamu menyusun model bisnis, menghitung HPP/BEP/Arus Kas secara deterministik, dan membedakan Asumsi AI dari Bukti Lapangan Tervalidasi:'
                  : 'Not static worksheets — an interactive venture workspace with deterministic HPP/BEP/Cash Flow calculators and strict separation between AI Assumptions and Validated Field Evidence:'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {STUDIO_HIGHLIGHTS.map((tool, i) => (
                  <div key={tool} className="rounded-xl border border-stone-200 bg-[#faf9f5] px-3 py-2.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-emerald-700">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-semibold text-slate-800">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeShowcase === 'agnes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600 max-w-2xl">
                  {id
                    ? 'Agnes AI 2.0 hadir sebagai copilot dengan 10 mode keahlian, sensor PII otomatis, batas akses privasi eksplisit, dan tidak pernah mengubah koin atau level kompetensi secara sembarangan.'
                    : 'Agnes AI 2.0 provides 10 specialized modes with automatic PII redaction, strict privacy boundaries, and zero unauthorized mutations to coins or competency levels.'}
                </p>
                <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {id ? 'Batas Akses Data Ketat' : 'Strict Data-Access Boundaries'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                {AGNES_MODES_LIST.map((mode) => (
                  <div key={mode} className="rounded-xl border border-stone-200 bg-[#faf9f5] px-3 py-2.5 font-hud font-bold text-slate-800 text-center">
                    {mode}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. GAMIFICATION & COIN ECONOMY (MATCHING UPLOADED SCREENSHOT STYLE!)  */}
      {/* ===================================================================== */}
      <section className="border-y border-stone-200 bg-white py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700">
              {id ? '05 · SISTEM PROGRES & COIN ECONOMY' : '05 · PROGRESSION & COIN ECONOMY'}
            </p>
            <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
              {id ? 'Gamifikasi yang Jujur, Transparan & Siap Ekosistem' : 'Transparent Gamification & Sustainable Coin Economy'}
            </h2>
            <p className="text-sm text-slate-600">
              {id
                ? 'LevelUp memisahkan secara tegas antara aktivitas harian, kompetensi terverifikasi, koin loyalitas, dan pendapatan usaha nyata.'
                : 'LevelUp cleanly separates daily activity, verified competency, loyalty coins, and real venture revenue.'}
            </p>
          </div>

          {/* Clean Editorial Table matching Screenshot */}
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-[#faf9f5] text-slate-700 font-semibold">
                  <th className="py-3 px-4">{id ? 'Sistem' : 'System'}</th>
                  <th className="py-3 px-4">{id ? 'Fungsi' : 'Purpose'}</th>
                  <th className="py-3 px-4">{id ? 'Dapat dibelanjakan?' : 'Spendable?'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">EXP</td>
                  <td className="py-3 px-4">{id ? 'Mengukur pengalaman, disiplin & aktivitas harian' : 'Measures daily experience & habit consistency'}</td>
                  <td className="py-3 px-4 text-slate-500">{id ? 'Tidak' : 'No'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Skill Rank &amp; Competency</td>
                  <td className="py-3 px-4">{id ? 'Mengukur kompetensi terverifikasi dari asesmen & rubrik' : 'Measures verified competency from rubrics & evidence'}</td>
                  <td className="py-3 px-4 text-slate-500">{id ? 'Tidak' : 'No'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Business Level</td>
                  <td className="py-3 px-4">{id ? 'Mengukur kemajuan usaha nyata berbasis bukti lapangan' : 'Measures real venture milestones & validated outcomes'}</td>
                  <td className="py-3 px-4 text-slate-500">{id ? 'Tidak' : 'No'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">LevelUp Coins</td>
                  <td className="py-3 px-4">{id ? 'Reward disiplin (1 koin/aksi) dan loyalitas ekosistem' : 'Disciplined reward (1 coin/action) & ecosystem loyalty'}</td>
                  <td className="py-3 px-4 text-amber-800 font-medium">{id ? 'Sesuai aturan program' : 'Per program rules'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Revenue</td>
                  <td className="py-3 px-4">{id ? 'Pendapatan usaha sebenarnya dari penjualan produk' : 'Actual venture revenue from real customer sales'}</td>
                  <td className="py-3 px-4 text-emerald-800 font-medium">{id ? 'Ya, melalui sistem transaksi terpisah' : 'Yes, via separate commerce system'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6 Reward Cards matching exact visual tone of uploaded screenshot */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-900">
              {id ? 'Penggunaan LevelUp Coins yang Dikembangkan' : 'LevelUp Coins Utility Roadmap'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                [
                  { icon: GraduationCap, label: 'Course Discount' },
                  { icon: Users, label: 'Mentoring Session' },
                  { icon: Ticket, label: 'Partner Voucher' },
                  { icon: ShoppingBag, label: 'Product Reward' },
                  { icon: Wrench, label: 'Business Toolkit' },
                  { icon: HeartHandshake, label: 'Community Support' },
                ] as const
              ).map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-stone-200 bg-[#faf9f5] px-4 py-5 flex flex-col items-center justify-center gap-2.5 text-center hover:border-amber-300 transition"
                >
                  <Icon className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
                  <span className="text-xs sm:text-sm font-medium text-slate-800">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {id
                ? 'Catatan keamanan: penukaran koin bernilai uang/partner (seperti MyValue) dilindungi arsitektur server-authoritative, ledger immutable, idempotency, dan rekonsiliasi saldo sebelum diaktifkan.'
                : 'Security note: monetary/partner coin redemption (e.g. MyValue) is gated behind server-authoritative issuance, immutable ledger, idempotency, and balance reconciliation.'}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. THREE-PILLAR ECOSYSTEM (SOCIOPRENEUR · LEVELUP · SOCIOLINE)        */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-sky-700">
            {id ? '06 · EKOSISTEM SOCIOPRENEUR' : '06 · THE SOCIOPRENEUR ECOSYSTEM'}
          </p>
          <h2 className="font-hud text-2xl sm:text-3xl font-bold text-slate-900">
            {id ? 'Tiga Platform Independen yang Saling Menguatkan' : 'Three Independent Platforms Working Together'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://sociopreneur.online"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2.5 hover:border-amber-400 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-800">SOCIOPRENEUR</span>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-amber-700" />
            </div>
            <h3 className="font-hud text-lg font-bold text-slate-900">The Marketplace of Opportunities</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {id
                ? 'Brand utama, katalog produk terkurasi, penjualan kelas, transaksi marketplace, kemitraan & peluang ekspor B2B global.'
                : 'Public brand, curated product catalog, course commerce, marketplace orders, partnerships & global B2B inquiries.'}
            </p>
            <p className="font-mono text-[11px] text-amber-700 pt-1">sociopreneur.online</p>
          </a>

          <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 text-white p-5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-400">LEVELUP · YOU ARE HERE</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-hud text-lg font-bold">The Development of People</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {id
                ? 'Pengembangan diri, karier, kesehatan, skill, LevelUp Academy, Business Studio, portofolio bukti nyata, inkubasi & Agnes AI coaching.'
                : 'Personal growth, career, health, skills, LevelUp Academy, Business Studio, verified portfolio, incubation & Agnes AI coaching.'}
            </p>
            <p className="font-mono text-[11px] text-sky-300 pt-1">levelup.sociopreneur.online</p>
          </div>

          <a
            href="https://socioline.sociopreneur.online"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2.5 hover:border-emerald-400 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-800">SOCIOLINE</span>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-emerald-700" />
            </div>
            <h3 className="font-hud text-lg font-bold text-slate-900">The Journey of Mission</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {id
                ? 'The Word, The World, The Work — gerakan kesadaran misi, kolaborasi komunitas & pelaporan dampak sosial kolektif.'
                : 'The Word, The World, The Work — mission awareness, community engagement & collective social impact.'}
            </p>
            <p className="font-mono text-[11px] text-emerald-700 pt-1">socioline.sociopreneur.online</p>
          </a>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. FINAL CTA & FOOTER                                                 */}
      {/* ===================================================================== */}
      <section className="border-t border-stone-200 bg-slate-900 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] font-bold text-amber-300">
            <Globe className="w-3.5 h-3.5" />
            <span>LEVEL UP SYSTEM · AWAKEN YOUR ENTREPRENEURIAL SPIRIT</span>
          </div>
          <h2 className="font-hud text-2xl sm:text-4xl font-bold leading-tight">
            {id
              ? 'Bangun Kebiasaan, Tumbuhkan Usaha, Ciptakan Dampak Nyata.'
              : 'Build Daily Habits, Grow Your Venture, Create Real Impact.'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
            {id
              ? 'Masuk dengan akun Email atau Google untuk sinkronisasi otomatis di HP & laptop (termasuk install PWA ke layar utama).'
              : 'Sign in with Email or Google for real-time sync across phone and laptop (including Home Screen PWA install).'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-hud font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition btn-anime"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{id ? 'Daftar Akun Gratis' : 'Create Free Account'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-hud font-bold text-sm uppercase tracking-wider transition btn-anime"
            >
              {id ? 'Sudah Punya Akun? Masuk' : 'Already Registered? Sign In'}
            </button>
          </div>
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> LevelUp 2.0 OS
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" /> LevelUp Academy
            </span>
            <span className="flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-emerald-400" /> Sociopreneur Ecosystem
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
