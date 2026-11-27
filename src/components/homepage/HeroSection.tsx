import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ExternalLink, Maximize2, Play, Volume2, X } from 'lucide-react';
import {
  HERO_AMBIENT_EMBED_URL,
  HERO_PLAYER_EMBED_URL,
  HERO_ROTATING_PROFESSIONS,
  HERO_YOUTUBE_ID,
  HERO_YOUTUBE_WATCH_URL,
} from '../../data/homepageContent';
import { trackHomepageEvent } from '../../services/homepageEvents';

interface HeroSectionProps {
  onStartJourney: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartJourney }) => {
  const [professionIdx, setProfessionIdx] = useState(0);
  const [heroVideoMode, setHeroVideoMode] = useState<'ambient' | 'inline' | 'cinema'>('ambient');
  const [posterUrl, setPosterUrl] = useState(
    `https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/maxresdefault.jpg`
  );

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setProfessionIdx((prev) => (prev + 1) % HERO_ROTATING_PROFESSIONS.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (heroVideoMode !== 'cinema') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeroVideoMode('ambient');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [heroVideoMode]);

  const currentProfession = HERO_ROTATING_PROFESSIONS[professionIdx];

  return (
    <section
      id="beranda"
      className="relative overflow-hidden bg-slate-950 text-white border-b border-white/10"
    >
      {/* Full-bleed Cinematic Video & Poster Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <img
          src={posterUrl}
          onError={() => setPosterUrl(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/hqdefault.jpg`)}
          alt="Level Up by Sociopreneur — perjalanan transformasi manusia Indonesia di tengah perubahan kota modern"
          fetchPriority="high"
          className="w-full h-full object-cover object-center scale-105 opacity-45"
        />
        {heroVideoMode === 'ambient' && (
          <iframe
            src={HERO_AMBIENT_EMBED_URL}
            title="Level UP Teaser Cinematic Background"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full opacity-55 border-0"
          />
        )}
        {/* Dramatic Cinematic Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-slate-950/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/55" />
      </div>

      {/* Foreground Content: Left Copy, Right Realistic Human Visual Focus */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 min-h-[78vh] flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Storytelling Copy */}
          <div className="lg:col-span-6 min-w-0 space-y-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              LEVEL UP BY SOCIOPRENEUR
            </p>

            {/* Stable Semantic H1 with zero-CLS rotating profession slot */}
            <h1 className="font-hud text-3xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-white leading-[1.12]">
              <span className="block text-slate-200 font-semibold text-2xl sm:text-3xl lg:text-4xl mb-2">
                Apakah kamu:
              </span>
              <span
                key={currentProfession}
                className="block text-amber-300 min-h-[2.4em] sm:min-h-[2.3em] hero-phrase-enter"
              >
                {currentProfession}
              </span>
              <span className="sr-only">
                {' '}— Level Up by Sociopreneur, Human Transformation dan Social Entrepreneurship Ecosystem
              </span>
            </h1>

            <p className="text-lg sm:text-xl font-medium text-white/95 leading-snug max-w-xl">
              Apa pun profesimu hari ini, kamu bisa menjadi bagian dari perubahan.
            </p>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Kembangkan potensimu, bangun masa depanmu, dan jadilah seseorang yang membawa dampak
              nyata bagi dunia di sekitarmu.
            </p>

            {/* Focused Primary & Secondary CTA */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  trackHomepageEvent('hero_cta_clicked', { location: 'hero', cta: 'Mulai Perjalananmu' });
                  onStartJourney();
                }}
                className="px-6 py-3.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-black/40 transition btn-anime focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Mulai Perjalananmu</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#tentang"
                onClick={() =>
                  trackHomepageEvent('hero_cta_clicked', { location: 'hero', cta: 'Kenali Level Up' })
                }
                className="px-6 py-3.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/25 text-white font-hud font-bold text-sm uppercase tracking-wider flex items-center gap-2 backdrop-blur-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <span>Kenali Level Up</span>
                <ArrowDown className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Right Realistic Human Cinematic Teaser Focus */}
          <div className="lg:col-span-6 min-w-0">
            <div className="rounded-xl border border-white/15 bg-slate-950/60 backdrop-blur-sm shadow-2xl shadow-black/70 overflow-hidden">
              <div className="relative aspect-video bg-black">
                {heroVideoMode === 'inline' ? (
                  <iframe
                    src={HERO_PLAYER_EMBED_URL}
                    title="Level UP Teaser — Official Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      trackHomepageEvent('hero_cta_clicked', { location: 'hero_video', cta: 'play_teaser' });
                      setHeroVideoMode('inline');
                    }}
                    className="group relative w-full h-full block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="Putar video Level UP Teaser dengan suara"
                  >
                    <img
                      src={posterUrl}
                      onError={() =>
                        setPosterUrl(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/hqdefault.jpg`)
                      }
                      alt="Cuplikan resmi Level UP Teaser — sosok profesional Indonesia berdiri di jalan kota dengan percikan cahaya kebangkitan"
                      className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />

                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                      <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/95 group-hover:bg-amber-400 group-hover:scale-105 text-slate-950 flex items-center justify-center shadow-2xl ring-4 ring-white/20 transition">
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-slate-950 ml-1" aria-hidden="true" />
                      </span>
                      <span className="px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-white/20 text-[11px] font-mono tracking-wider text-white flex items-center gap-1.5 backdrop-blur-xs">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        Putar Teaser Dengan Suara
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Minimal Video Footer Bar */}
              <div className="px-4 py-2.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between gap-3 text-[11px] font-mono text-slate-300">
                <span className="truncate">Official Film · Level UP Teaser</span>
                <div className="flex items-center gap-3 shrink-0">
                  {heroVideoMode === 'inline' && (
                    <button
                      type="button"
                      onClick={() => setHeroVideoMode('ambient')}
                      className="text-slate-400 hover:text-white transition"
                    >
                      Tutup Pemutar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHeroVideoMode('cinema')}
                    className="text-amber-300 hover:text-amber-200 flex items-center gap-1 transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Layar Penuh</span>
                  </button>
                  <a
                    href={HERO_YOUTUBE_WATCH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Cinema Modal */}
      {heroVideoMode === 'cinema' && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Pemutar Video Layar Penuh Level UP Teaser"
          onClick={() => setHeroVideoMode('ambient')}
        >
          <div
            className="w-full max-w-5xl rounded-xl border border-white/20 bg-black overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-2 text-white">
              <span className="font-hud font-bold text-sm tracking-wide">
                Level UP Teaser — Official Video
              </span>
              <button
                type="button"
                onClick={() => setHeroVideoMode('ambient')}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Tutup pemutar video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={HERO_PLAYER_EMBED_URL}
                title="Level UP Teaser Fullscreen"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
