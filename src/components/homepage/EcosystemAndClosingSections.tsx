import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Handshake,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  ECOSYSTEM_NODES,
  HERO_YOUTUBE_ID,
  IMPACT_FRAMEWORK_INDICATORS,
  IMPACT_GOALS,
  PARTNERSHIP_CATEGORIES,
  PERSONA_PATHS,
  PUBLIC_FAQ_ITEMS,
} from '../../data/homepageContent';
import { saveSelectedPersona, trackHomepageEvent } from '../../services/homepageEvents';

interface EcosystemAndClosingSectionsProps {
  onOpenAuth: (mode: 'login' | 'register', personaId?: string) => void;
  partnershipModalOpen: boolean;
  onOpenPartnershipModal: () => void;
  onClosePartnershipModal: () => void;
}

type InfoModalType = null | 'faq' | 'privacy' | 'terms';

export const EcosystemAndClosingSections: React.FC<EcosystemAndClosingSectionsProps> = ({
  onOpenAuth,
  partnershipModalOpen,
  onOpenPartnershipModal,
  onClosePartnershipModal,
}) => {
  const [infoModal, setInfoModal] = useState<InfoModalType>(null);
  const [closingBg, setClosingBg] = useState(
    `https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/maxresdefault.jpg`
  );
  const currentYear = new Date().getFullYear();

  const handleSelectPersona = (personaId: string, title: string) => {
    saveSelectedPersona(personaId);
    trackHomepageEvent('persona_selected', { persona_id: personaId, persona_title: title });
    onOpenAuth('register', personaId);
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* SECTION 10 — YOUR JOURNEY, YOUR PATH (6 PERSONAS → ONBOARDING)        */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="personas-heading"
        className="bg-white text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-12">
          <div className="max-w-3xl space-y-4" data-reveal>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              YOUR JOURNEY, YOUR PATH
            </p>
            <h2
              id="personas-heading"
              className="font-hud text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-[1.14]"
            >
              Berbeda latar belakang. Berbeda perjalanan. Satu semangat untuk berdampak.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Tidak semua orang memulai dari tempat yang sama. Temukan perjalanan yang sesuai dengan
              kondisi, kebutuhan, dan tujuan hidupmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-reveal>
            {PERSONA_PATHS.map((persona) => (
              <article
                key={persona.id}
                className="rounded-lg border border-stone-200 bg-[#faf9f5] p-6 flex flex-col justify-between gap-6 hover:border-slate-900 transition-colors"
              >
                <div className="space-y-3">
                  <p className="font-mono text-[11px] font-bold tracking-wider text-amber-800">
                    {persona.code}
                  </p>
                  <h3 className="font-hud text-lg font-bold text-slate-950">{persona.title}</h3>
                  <blockquote className="text-sm text-slate-700 leading-relaxed border-l-2 border-stone-300 pl-3.5">
                    “{persona.quote}”
                  </blockquote>
                </div>

                <div className="pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleSelectPersona(persona.id, persona.title)}
                    className="w-full py-2.5 px-4 rounded-md bg-slate-950 hover:bg-amber-700 text-white font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-between transition btn-anime"
                  >
                    <span>{persona.cta}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 11 — THE BIGGER ECOSYSTEM                                     */}
      {/* ===================================================================== */}
      <section
        id="ekosistem"
        aria-labelledby="ecosystem-heading"
        className="bg-slate-950 text-white border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end" data-reveal>
            <div className="lg:col-span-6 space-y-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
                THE BIGGER ECOSYSTEM
              </p>
              <h2
                id="ecosystem-heading"
                className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.14]"
              >
                Perjalananmu tidak berhenti di Level Up.
              </h2>
            </div>
            <div className="lg:col-span-6 space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              <p>Pertumbuhan pribadi merupakan awal dari sebuah perjalanan yang lebih besar.</p>
              <p>
                Sociopreneur membangun ekosistem yang menghubungkan pengembangan manusia,
                kewirausahaan, akses pasar, dan pelayanan bagi masyarakat.
              </p>
            </div>
          </div>

          {/* Interconnected Ecosystem Flow Visualization */}
          <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5 sm:p-6" data-reveal>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
              <div className="flex-1">
                <p className="font-mono text-[10px] text-amber-400 uppercase tracking-widest">
                  01 · HUMAN DEVELOPMENT
                </p>
                <p className="font-hud text-lg font-bold text-white">LEVEL UP</p>
              </div>
              <ArrowDown
                className="w-5 h-5 text-amber-400 md:-rotate-90 shrink-0 ecosystem-flow-pulse"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="font-mono text-[10px] text-sky-300 uppercase tracking-widest">
                  02 · VALUE CREATION
                </p>
                <p className="font-hud text-lg font-bold text-white">SOCIOPRENEUR</p>
              </div>
              <ArrowDown
                className="w-5 h-5 text-sky-300 md:-rotate-90 shrink-0 ecosystem-flow-pulse"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="font-mono text-[10px] text-emerald-300 uppercase tracking-widest">
                  03 · MISSION &amp; CALLING
                </p>
                <p className="font-hud text-lg font-bold text-white">SOCIOLINE</p>
              </div>
            </div>
          </div>

          {/* 3 Ecosystem Pillar Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-reveal>
            {ECOSYSTEM_NODES.map((node, idx) => (
              <article
                key={node.name}
                className={`rounded-xl border p-7 flex flex-col justify-between gap-6 ${
                  idx === 0
                    ? 'border-amber-400/50 bg-white/[0.07]'
                    : 'border-white/15 bg-white/[0.03] hover:border-white/30'
                } transition-colors`}
              >
                <div className="space-y-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    {node.number} · {node.role}
                  </p>
                  <h3 className="font-hud text-2xl font-bold text-white">{node.name}</h3>
                  <p className="font-mono text-xs text-sky-300 font-semibold">{node.subtitle}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{node.description}</p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-slate-400 truncate">
                    {node.urlLabel}
                  </span>
                  {node.internalAction === 'register' ? (
                    <button
                      type="button"
                      onClick={() => {
                        trackHomepageEvent('ecosystem_clicked', { target: node.name });
                        onOpenAuth('register');
                      }}
                      className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 transition"
                    >
                      <span>{node.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      href={node.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackHomepageEvent('ecosystem_clicked', { target: node.name })}
                      className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white font-hud font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 transition"
                    >
                      <span>{node.cta}</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="pt-4 text-center space-y-1.5" data-reveal>
            <p className="font-hud text-lg sm:text-2xl font-bold text-white">
              Mulai dari pertumbuhan diri. Lanjutkan dengan menciptakan nilai.
            </p>
            <p className="font-hud text-lg sm:text-2xl font-bold text-amber-300">
              Ambil bagian dalam perubahan dunia.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 12 — OUR PURPOSE (EDITORIAL MANIFESTO + VISION & MISSION)     */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="purpose-heading"
        className="bg-[#faf9f5] text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-16">
          <div className="space-y-8" data-reveal>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
              OUR PURPOSE
            </p>
            <h2
              id="purpose-heading"
              className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.15]"
            >
              Ada tujuan yang lebih besar dari sekadar kesuksesan pribadi.
            </h2>

            <div className="space-y-4 text-lg sm:text-2xl text-slate-800 leading-relaxed font-normal">
              <p className="font-semibold text-slate-950">
                Kami percaya bahwa setiap manusia memiliki potensi, martabat, dan kesempatan untuk
                berkontribusi.
              </p>
              <p className="border-l-2 border-amber-600 pl-5 space-y-2 text-base sm:text-xl text-slate-700">
                <span className="block">Bahwa pekerjaan dapat menjadi sarana pelayanan.</span>
                <span className="block">Bahwa bisnis dapat menjadi sarana pemberdayaan.</span>
                <span className="block">
                  Bahwa teknologi dapat membantu manusia menciptakan solusi.
                </span>
                <span className="block">
                  Bahwa kesuksesan dapat menjadi kesempatan untuk membuka jalan bagi orang lain.
                </span>
              </p>
              <p className="text-base sm:text-lg text-slate-700 pt-2">
                Itulah alasan Level Up hadir. Untuk mempersiapkan lebih banyak manusia yang mampu
                bertumbuh, mandiri, menciptakan nilai, dan membawa perubahan bagi kehidupan di
                sekitarnya.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-stone-300" data-reveal>
            <div className="space-y-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
                OUR VISION
              </p>
              <p className="font-hud text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
                Membangun generasi manusia yang berdaya, berkarakter, inovatif, dan mampu
                menciptakan dampak sosial berkelanjutan.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-800">
                OUR MISSION
              </p>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                Menghubungkan pengembangan diri, pendidikan, teknologi, karier, kewirausahaan, dan
                kolaborasi untuk membuka lebih banyak kesempatan bagi manusia dan masyarakat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 13 — OUR IMPACT (HONEST IMPACT VISION & FRAMEWORK)            */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="impact-heading"
        className="bg-white text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" data-reveal>
            <div className="lg:col-span-6 space-y-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
                OUR IMPACT
              </p>
              <h2
                id="impact-heading"
                className="font-hud text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-[1.15]"
              >
                Kesuksesanmu menjadi lebih bermakna ketika orang lain ikut bertumbuh.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 pt-2">
                Perubahan yang ingin kami wujudkan:
              </p>
            </div>

            <div className="lg:col-span-6 space-y-3">
              {IMPACT_GOALS.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center gap-3.5 py-3 border-b border-stone-200"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
                  <p className="text-sm sm:text-base font-medium text-slate-900">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Measurement Framework (Zero Fake Numbers) */}
          <div className="rounded-xl border border-stone-200 bg-[#faf9f5] p-6 sm:p-8 space-y-6" data-reveal>
            <div className="max-w-3xl space-y-2">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                IMPACT VISION &amp; MEASUREMENT FRAMEWORK
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Kami ingin mengukur keberhasilan bukan hanya dari banyaknya orang yang belajar,
                tetapi juga dari keterampilan yang diterapkan, karya yang dihasilkan, peluang ekonomi
                yang tercipta, dan manfaat yang dirasakan masyarakat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {IMPACT_FRAMEWORK_INDICATORS.map((ind) => (
                <div
                  key={ind.label}
                  className="rounded-lg border border-stone-200 bg-white p-4 space-y-1.5"
                >
                  <h3 className="font-hud text-base font-bold text-slate-950">{ind.label}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ind.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 14 — PARTNERSHIP                                              */}
      {/* ===================================================================== */}
      <section
        id="kolaborasi"
        aria-labelledby="partnership-heading"
        className="bg-[#f4f1ea] text-slate-900 border-b border-stone-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-10" data-reveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
                PARTNERSHIP &amp; COLLABORATION
              </p>
              <h2
                id="partnership-heading"
                className="font-hud text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-[1.15]"
              >
                Perubahan yang lebih besar membutuhkan kolaborasi.
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Mari bersama-sama membangun ekosistem yang membuka kesempatan bagi lebih banyak orang
                untuk bertumbuh dan berdaya.
              </p>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Kami mengundang institusi pendidikan, perusahaan, pemerintah, komunitas, organisasi
                sosial, gereja, mentor, dan para sociopreneur untuk mengambil bagian. Bersama, kita
                dapat mengembangkan keterampilan, membuka peluang pekerjaan, memberdayakan
                masyarakat, dan membangun solusi yang berkelanjutan.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    trackHomepageEvent('partnership_cta_clicked', {
                      location: 'partnership_section',
                    });
                    onOpenPartnershipModal();
                  }}
                  className="px-6 py-3.5 rounded-md bg-slate-950 hover:bg-amber-700 text-white font-hud font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2 transition btn-anime"
                >
                  <Handshake className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Menjadi Mitra Level Up</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PARTNERSHIP_CATEGORIES.map((category, idx) => (
                  <div
                    key={category}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-3.5 flex items-center gap-3"
                  >
                    <span className="font-mono text-[11px] font-bold text-amber-800">
                      0{idx + 1}
                    </span>
                    <span className="font-hud font-bold text-sm text-slate-900">{category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 15 — FINAL CALL TO ACTION (CINEMATIC CLOSING)                 */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="final-cta-heading"
        className="relative overflow-hidden bg-slate-950 text-white"
      >
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <img
            src={closingBg}
            onError={() => setClosingBg(`https://i.ytimg.com/vi/${HERO_YOUTUBE_ID}/hqdefault.jpg`)}
            alt="Sosok manusia Indonesia menatap masa depan yang lebih luas di ekosistem Level Up by Sociopreneur"
            loading="lazy"
            className="w-full h-full object-cover object-center opacity-30 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/75" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center space-y-8" data-reveal>
          <h2
            id="final-cta-heading"
            className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]"
          >
            Kamu tidak harus menjadi orang hebat untuk memulai.{' '}
            <span className="text-amber-300">
              Kamu hanya perlu berani mengambil langkah pertama.
            </span>
          </h2>

          <div className="space-y-3 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            <p>
              Dari mana pun kamu berasal. Apa pun pekerjaanmu. Seberapa besar atau kecil sumber daya
              yang kamu miliki. Selalu ada kesempatan untuk belajar, bertumbuh, menciptakan nilai,
              dan membawa perubahan.
            </p>
            <p className="text-white font-medium">
              Masa depanmu tidak hanya tentang apa yang bisa kamu capai, tetapi juga tentang apa yang
              bisa kamu kontribusikan.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="font-hud text-2xl sm:text-4xl font-bold tracking-wider text-white">
              LEVEL UP YOURSELF. <span className="text-amber-400">LEVEL UP THE WORLD.</span>
            </p>
            <p className="font-mono text-xs sm:text-sm tracking-[0.22em] uppercase text-sky-300">
              Bertumbuh. Berdaya. Berdampak.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <button
              type="button"
              onClick={() => {
                trackHomepageEvent('final_cta_clicked', { cta: 'Mulai Perjalanan Level Up' });
                onOpenAuth('register');
              }}
              className="px-7 py-3.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-hud font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2 shadow-xl transition btn-anime"
            >
              <span>Mulai Perjalanan Level Up</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                trackHomepageEvent('final_cta_clicked', { cta: 'Bergabung dengan Komunitas' });
                onOpenPartnershipModal();
              }}
              className="px-7 py-3.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/25 text-white font-hud font-bold text-sm uppercase tracking-wider transition"
            >
              Bergabung dengan Komunitas
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 16 — PUBLIC FOOTER                                            */}
      {/* ===================================================================== */}
      <footer className="bg-slate-950 text-slate-300 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/favicon.svg"
                  alt="Level Up Logo"
                  className="w-8 h-8 rounded-md shrink-0"
                />
                <span className="font-hud text-sm font-bold tracking-wider text-white">
                  LEVEL UP BY SOCIOPRENEUR
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Mempersiapkan manusia untuk bertumbuh, berdaya, dan berdampak.
              </p>
              <p className="font-mono text-xs text-amber-400/90 pt-1">
                Level Up Yourself. Level Up the World.
              </p>
            </div>

            {/* Explore */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Explore
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#tentang" className="hover:text-white transition">
                    Tentang Level Up
                  </a>
                </li>
                <li>
                  <a href="#perjalanan" className="hover:text-white transition">
                    Perjalanan Level Up
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition">
                    Academy
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition">
                    Career Development
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition">
                    Business Studio
                  </a>
                </li>
                <li>
                  <a href="#kolaborasi" className="hover:text-white transition">
                    Community
                  </a>
                </li>
              </ul>
            </div>

            {/* Our Ecosystem */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Our Ecosystem
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#beranda" className="hover:text-white transition">
                    Level Up
                  </a>
                </li>
                <li>
                  <a
                    href="https://sociopreneur.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition inline-flex items-center gap-1"
                  >
                    <span>Sociopreneur.online</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://socioline.sociopreneur.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition inline-flex items-center gap-1"
                  >
                    <span>Socioline</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Get Involved */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Get Involved
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={onOpenPartnershipModal}
                    className="hover:text-white transition text-left"
                  >
                    Menjadi Mentor
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenPartnershipModal}
                    className="hover:text-white transition text-left"
                  >
                    Menjadi Mitra
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenPartnershipModal}
                    className="hover:text-white transition text-left"
                  >
                    Hubungi Kami
                  </button>
                </li>
              </ul>
            </div>

            {/* Information */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Information
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('faq')}
                    className="hover:text-white transition text-left"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('privacy')}
                    className="hover:text-white transition text-left"
                  >
                    Kebijakan Privasi
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setInfoModal('terms')}
                    className="hover:text-white transition text-left"
                  >
                    Syarat dan Ketentuan
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {currentYear} Level Up by Sociopreneur.</p>
            <p className="font-mono text-[11px] text-slate-500">
              Bertumbuh. Berdaya. Berdampak.
            </p>
          </div>
        </div>
      </footer>

      {/* Verified Partnership & Community Channel Modal (Zero Fake Forms) */}
      {partnershipModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partnership-modal-title"
          onClick={onClosePartnershipModal}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-stone-200 bg-white text-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <h3 id="partnership-modal-title" className="font-hud font-bold text-base">
                  Kolaborasi, Mitra &amp; Komunitas Level Up
                </h3>
              </div>
              <button
                type="button"
                onClick={onClosePartnershipModal}
                aria-label="Tutup dialog kolaborasi"
                className="p-1 rounded hover:bg-white/15 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                Untuk kolaborasi institusi, program pelatihan, kemitraan mentor, maupun bergabung
                dalam gerakan komunitas, silakan terhubung melalui portal resmi ekosistem
                Sociopreneur:
              </p>

              <div className="space-y-2.5">
                <a
                  href="https://sociopreneur.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackHomepageEvent('partnership_cta_clicked', {
                      channel: 'sociopreneur.online',
                    })
                  }
                  className="flex items-center justify-between p-3.5 rounded-lg border border-stone-200 bg-[#faf9f5] hover:border-amber-500 transition"
                >
                  <div>
                    <p className="font-hud font-bold text-slate-950">Sociopreneur.online</p>
                    <p className="text-xs text-slate-600">
                      Portal utama ekosistem, kemitraan institusi &amp; program pemberdayaan
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                </a>

                <a
                  href="https://socioline.sociopreneur.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackHomepageEvent('partnership_cta_clicked', {
                      channel: 'socioline.sociopreneur.online',
                    })
                  }
                  className="flex items-center justify-between p-3.5 rounded-lg border border-stone-200 bg-[#faf9f5] hover:border-emerald-500 transition"
                >
                  <div>
                    <p className="font-hud font-bold text-slate-950">Socioline</p>
                    <p className="text-xs text-slate-600">
                      Platform pelayanan misi, kolaborasi gereja &amp; panggilan dampak
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                </a>
              </div>

              <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Ingin mulai sebagai peserta dulu?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClosePartnershipModal();
                    onOpenAuth('register');
                  }}
                  className="px-4 py-2 rounded-md bg-slate-950 hover:bg-amber-700 text-white font-hud font-bold text-xs uppercase tracking-wider transition"
                >
                  Mulai Perjalananmu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Disclosure Modal (FAQ / Privacy / Terms — Zero Broken Footer Links) */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-modal-title"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-stone-200 bg-white text-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-5 py-4 bg-slate-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <h3 id="info-modal-title" className="font-hud font-bold text-base">
                  {infoModal === 'faq' && 'Pertanyaan Umum (FAQ) — Level Up'}
                  {infoModal === 'privacy' && 'Kebijakan Privasi — Level Up by Sociopreneur'}
                  {infoModal === 'terms' && 'Syarat & Ketentuan — Level Up by Sociopreneur'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                aria-label="Tutup informasi"
                className="p-1 rounded hover:bg-white/15 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              {infoModal === 'faq' && (
                <div className="space-y-4">
                  {PUBLIC_FAQ_ITEMS.map((item) => (
                    <div key={item.q} className="pb-4 border-b border-stone-200 last:border-0">
                      <h4 className="font-hud font-bold text-base text-slate-950">{item.q}</h4>
                      <p className="mt-1.5 text-slate-600">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {infoModal === 'privacy' && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-950">
                    Prinsip Privacy by Default (Selaras UU PDP)
                  </p>
                  <p>
                    Level Up menjaga kerahasiaan data pribadi setiap peserta. Catatan jurnal harian,
                    refleksi, mood, tidur, dan jadwal kalender hanya dapat diakses oleh pemilik akun
                    dan tidak dibagikan secara otomatis kepada mentor, admin, maupun platform lain.
                  </p>
                  <p>
                    Penggunaan fitur Agnes AI mengikuti batas akses data yang dapat diatur kapan
                    saja pada menu <strong>Pengaturan → Privasi</strong> setelah masuk ke akunmu.
                  </p>
                </div>
              )}

              {infoModal === 'terms' && (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-950">
                    Ketentuan Penggunaan Ekosistem Level Up
                  </p>
                  <p>
                    Level Up by Sociopreneur adalah ekosistem pengembangan diri, keterampilan,
                    karier, dan kewirausahaan sosial. Pengguna bertanggung jawab atas keakuratan
                    informasi akun serta bukti karya yang diunggah pada portofolio.
                  </p>
                  <p>
                    LevelUp Coins dan poin aktivitas merupakan instrumen gamifikasi internal dalam
                    aplikasi dan bukan merupakan instrumen keuangan ataupun uang tunai.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
