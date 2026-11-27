import React, { useState } from 'react';
import { ArrowRight, Cpu, Menu, X } from 'lucide-react';
import type { Language } from '../../types';
import { PUBLIC_NAV_LINKS } from '../../data/homepageContent';
import { trackHomepageEvent } from '../../services/homepageEvents';

interface PublicNavbarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  lang,
  onChangeLang,
  onOpenAuth,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePrimaryClick = () => {
    setMobileOpen(false);
    trackHomepageEvent('hero_cta_clicked', { location: 'navbar', action: 'register' });
    onOpenAuth('register');
  };

  const handleLoginClick = () => {
    setMobileOpen(false);
    trackHomepageEvent('hero_cta_clicked', { location: 'navbar', action: 'login' });
    onOpenAuth('login');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/10 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo (preserving approved Level Up emblem) */}
        <a
          href="#beranda"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 min-w-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          <div className="w-8 h-8 rounded bg-slate-900 border border-white/15 flex items-center justify-center text-orange-400 shadow-xs shrink-0">
            <Cpu className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-hud text-sm sm:text-base font-bold tracking-wider text-white leading-none">
              LEVEL UP
            </p>
            <p className="text-[10px] font-mono tracking-wider text-slate-400 leading-tight mt-0.5">
              By Sociopreneur
            </p>
          </div>
        </a>

        {/* Desktop Anchor Navigation */}
        <nav aria-label="Navigasi Utama" className="hidden lg:flex items-center gap-6">
          {PUBLIC_NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1 py-0.5"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <div
            className="flex items-center bg-white/5 border border-white/15 rounded p-0.5 font-mono text-[10px] font-bold"
            role="group"
            aria-label="Pilihan Bahasa"
          >
            <button
              type="button"
              onClick={() => onChangeLang('id')}
              className={`px-2 py-1 rounded transition ${
                lang === 'id' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-2 py-1 rounded transition ${
                lang === 'en' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoginClick}
            className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={handlePrimaryClick}
            className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition btn-anime focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span>Mulai Perjalananmu</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile & Tablet Menu Toggle */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryClick}
            className="md:hidden px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-[11px] uppercase tracking-wider"
          >
            Mulai
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-nav"
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="p-2 rounded-md border border-white/15 text-slate-200 hover:bg-white/10 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="public-mobile-nav"
          className="lg:hidden border-t border-white/10 bg-slate-950/98 backdrop-blur-lg px-4 py-4 space-y-4"
        >
          <nav aria-label="Navigasi Mobile" className="grid grid-cols-2 gap-2">
            {PUBLIC_NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Bahasa Aplikasi</span>
              <div className="flex items-center bg-white/5 border border-white/15 rounded p-0.5 font-mono text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => onChangeLang('id')}
                  className={`px-2.5 py-1 rounded ${lang === 'id' ? 'bg-white text-slate-950' : 'text-slate-400'}`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`px-2.5 py-1 rounded ${lang === 'en' ? 'bg-white text-slate-950' : 'text-slate-400'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleLoginClick}
                className="py-2.5 rounded-md border border-white/20 text-white font-hud font-bold text-xs uppercase tracking-wider"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="py-2.5 rounded-md bg-amber-500 text-slate-950 font-hud font-bold text-xs uppercase tracking-wider"
              >
                Mulai Perjalananmu
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
