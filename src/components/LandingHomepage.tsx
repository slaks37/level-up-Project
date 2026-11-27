import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../types';
import { trackHomepageEvent } from '../services/homepageEvents';
import { PublicNavbar } from './homepage/PublicNavbar';
import { HeroSection } from './homepage/HeroSection';
import { NarrativeSections } from './homepage/NarrativeSections';
import { JourneyAndExperienceSections } from './homepage/JourneyAndExperienceSections';
import { EcosystemAndClosingSections } from './homepage/EcosystemAndClosingSections';

interface LandingHomepageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onOpenAuth: (mode: 'login' | 'register', personaId?: string) => void;
}

export const LandingHomepage: React.FC<LandingHomepageProps> = ({
  lang,
  onChangeLang,
  onOpenAuth,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [partnershipModalOpen, setPartnershipModalOpen] = useState(false);

  useEffect(() => {
    trackHomepageEvent('homepage_view', { lang });
  }, [lang]);

  // Progressive scroll-reveal respecting prefers-reduced-motion
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (nodes.length === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((el) => el.setAttribute('data-revealed', 'true'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-slate-950 text-slate-900"
    >
      <PublicNavbar lang={lang} onChangeLang={onChangeLang} onOpenAuth={(mode) => onOpenAuth(mode)} />

      <HeroSection onStartJourney={() => onOpenAuth('register')} />

      <NarrativeSections />

      <JourneyAndExperienceSections
        onOpenAuth={(mode) => onOpenAuth(mode)}
        onOpenPartnership={() => setPartnershipModalOpen(true)}
      />

      <EcosystemAndClosingSections
        onOpenAuth={onOpenAuth}
        partnershipModalOpen={partnershipModalOpen}
        onOpenPartnershipModal={() => setPartnershipModalOpen(true)}
        onClosePartnershipModal={() => setPartnershipModalOpen(false)}
      />
    </div>
  );
};
