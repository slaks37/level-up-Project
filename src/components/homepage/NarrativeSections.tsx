import React from 'react';
import { ArrowDown, ArrowRight, Briefcase, Cpu, Globe2, Sprout, Users } from 'lucide-react';
import {
  AWAKENING_REFLECTION_QUESTIONS,
  AWAKENING_ROUTINE_LINES,
  PROFESSION_STORIES,
  WORLD_CHANGES,
} from '../../data/homepageContent';
import { trackHomepageEvent } from '../../services/homepageEvents';

interface NarrativeSectionsProps {
  onExploreLevelUp?: () => void;
}

const WORLD_ICONS = [Briefcase, Users, Cpu, Globe2] as const;

export const NarrativeSections: React.FC<NarrativeSectionsProps> = () => {
  return (
    <>
      {/* ===================================================================== */}
      {/* SECTION 02 — THE AWAKENING (ACT 02: EDITORIAL TYPOGRAPHY STORYTELLING) */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="awakening-heading"
        className="bg-[#0e131b] text-slate-100 border-b border-white/10"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-16">
          {/* Opening Pause */}
          <div className="space-y-8" data-reveal>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-400/90">
              ACT 02 · THE AWAKENING
            </p>
            <h2
              id="awakening-heading"
              className="font-hud text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15] max-w-3xl"
            >
              Apakah hidupmu hanya akan berjalan seperti ini?
            </h2>

            {/* Routine Cadence — pure editorial typography */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pt-4">
              <div className="md:col-span-5 space-y-2.5 border-l border-amber-400/40 pl-5 sm:pl-6">
                {AWAKENING_ROUTINE_LINES.map((line, i) => (
                  <p
                    key={line}
                    className={`text-lg sm:text-xl leading-snug ${
                      i === AWAKENING_ROUTINE_LINES.length - 1
                        ? 'text-amber-300 font-semibold pt-2'
                        : 'text-slate-300 font-normal'
                    }`}
                  >
                    {line}
                  </p>
                ))}
                <p className="text-sm font-mono text-slate-400 pt-3">
                  Hari demi hari. Bulan demi bulan. Tahun demi tahun.
                </p>
              </div>

              <div className="md:col-span-7 flex flex-col justify-center space-y-5 text-slate-300 text-base sm:text-lg leading-relaxed">
                <p>
                  Di saat yang sama, dunia terus berubah. Teknologi berkembang, pekerjaan
                  bertransformasi, kebutuhan masyarakat semakin kompleks, dan peluang-peluang baru
                  terus bermunculan.
                </p>
              </div>
            </div>
          </div>

          {/* Reflection Questions — Quiet Human-Centered Inquiry */}
          <div className="border-t border-white/10 pt-14 space-y-8" data-reveal>
            <h3 className="font-hud text-xl sm:text-2xl font-semibold text-white">
              Pernahkah kamu bertanya kepada dirimu sendiri?
            </h3>

            <ol className="divide-y divide-white/10">
              {AWAKENING_REFLECTION_QUESTIONS.map((question, idx) => (
                <li
                  key={question}
                  className="py-4 sm:py-5 flex items-baseline gap-4 sm:gap-6"
                >
                  <span className="font-mono text-xs text-amber-400/80 shrink-0">
                    0{idx + 1}
                  </span>
                  <p className="text-base sm:text-xl text-slate-200 font-normal leading-relaxed">
                    {question}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Closing & Highlight Statement */}
          <div className="border-t border-white/10 pt-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-end" data-reveal>
            <div className="md:col-span-7 space-y-3 text-slate-300 text-base sm:text-lg leading-relaxed">
              <p>
                Kamu tidak harus meninggalkan kehidupanmu hari ini untuk menciptakan masa depan yang
                lebih baik.
              </p>
              <p className="text-white/95">
                Kamu bisa memulainya dengan bertumbuh dari tempatmu berada sekarang.
              </p>
            </div>
            <div className="md:col-span-5 md:text-right">
              <p className="font-hud text-xl sm:text-2xl font-bold text-amber-300 leading-snug">
                Perjalananmu dimulai dari sebuah kesadaran.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 03 — THE WORLD IS CHANGING                                    */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="world-changing-heading"
        className="bg-[#faf9f5] text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end" data-reveal>
            <div className="lg:col-span-6 space-y-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-800">
                REALITAS HARI INI
              </p>
              <h2
                id="world-changing-heading"
                className="font-hud text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-[1.15]"
              >
                Dunia sedang berubah. Bagaimana denganmu?
              </h2>
            </div>
            <div className="lg:col-span-6 space-y-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>Pekerjaan yang dahulu dianggap aman mulai berubah.</p>
              <p>Keterampilan yang dahulu cukup kini perlu terus dikembangkan.</p>
              <p>Teknologi membuka peluang baru yang sebelumnya tidak pernah kita bayangkan.</p>
              <p className="text-slate-900 font-medium">
                Namun, di tengah perubahan tersebut, masih banyak persoalan yang membutuhkan solusi.
              </p>
            </div>
          </div>

          {/* 4 Editorial Reality Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-stone-300" data-reveal>
            {WORLD_CHANGES.map((item, idx) => {
              const Icon = WORLD_ICONS[idx];
              return (
                <article
                  key={item.code}
                  className="p-7 sm:p-9 bg-white border-r border-b border-stone-300 flex flex-col justify-between gap-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {item.code} · {item.context}
                    </span>
                    <Icon className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="font-hud text-xl sm:text-2xl font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Highlight Statement */}
          <div className="max-w-3xl space-y-2 border-l-2 border-amber-600 pl-5 sm:pl-6" data-reveal>
            <p className="font-hud text-xl sm:text-2xl font-bold text-slate-950">
              Setiap tantangan menghadirkan kesempatan untuk menciptakan solusi.
            </p>
            <p className="text-base sm:text-lg text-amber-800 font-semibold">
              Dan kamu bisa menjadi bagian dari solusi tersebut.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 04 — INTRODUCING LEVEL UP (ACT 03: HOPEFUL TURNING POINT)     */}
      {/* ===================================================================== */}
      <section
        id="tentang"
        aria-labelledby="intro-levelup-heading"
        className="relative overflow-hidden bg-gradient-to-b from-amber-50/75 via-white to-[#faf9f5] text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center space-y-8" data-reveal>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
            THE NEXT CHAPTER OF YOUR LIFE
          </p>

          <h2
            id="intro-levelup-heading"
            className="font-hud text-4xl sm:text-6xl font-bold tracking-tight text-slate-950"
          >
            Kenalkan, <span className="text-amber-700">LEVEL UP</span>.
          </h2>

          <p className="text-xl sm:text-2xl font-medium text-slate-800 max-w-3xl mx-auto leading-snug">
            Tempat kamu bertumbuh menjadi seseorang yang lebih berdaya dan berdampak.
          </p>

          <div className="max-w-3xl mx-auto space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            <p>
              Level Up adalah ekosistem pengembangan diri, keterampilan, karier, dan kewirausahaan
              yang mempersiapkan setiap individu menjadi seorang sociopreneur.
            </p>
            <p>
              Di sini, kamu belajar mengenali potensimu, menentukan tujuan hidup, mengembangkan
              keterampilan, membangun kebiasaan, menciptakan peluang ekonomi, dan menghasilkan solusi
              bagi masyarakat.
            </p>
            <p className="text-slate-900 font-medium">
              Kami percaya bahwa perubahan dunia dapat dimulai dari perubahan dalam diri seseorang.
            </p>
          </div>

          <div className="pt-2 space-y-6">
            <p className="font-hud text-2xl sm:text-3xl font-bold tracking-wide text-slate-950">
              Bertumbuh. <span className="text-amber-700">Berdaya.</span>{' '}
              <span className="text-sky-700">Berdampak.</span>
            </p>

            <div className="flex justify-center">
              <a
                href="#perjalanan"
                onClick={() =>
                  trackHomepageEvent('journey_cta_clicked', {
                    location: 'intro_section',
                    cta: 'Jelajahi Level Up',
                  })
                }
                className="px-6 py-3.5 rounded-md bg-slate-950 hover:bg-amber-700 text-white font-hud font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2 transition btn-anime"
              >
                <span>Jelajahi Level Up</span>
                <ArrowDown className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 05 — THE SOCIOPRENEUR MINDSET                                 */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="mindset-heading"
        className="bg-white text-slate-900 border-b border-stone-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" data-reveal>
            <div className="lg:col-span-6 space-y-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                THE SOCIOPRENEUR MINDSET
              </p>
              <h2
                id="mindset-heading"
                className="font-hud text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-[1.15]"
              >
                Menjadi Sociopreneur tidak selalu berarti mendirikan perusahaan.
              </h2>
            </div>
            <div className="lg:col-span-6 space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                Sociopreneur adalah seseorang yang memiliki pola pikir kewirausahaan, mampu melihat
                peluang di balik persoalan, menciptakan nilai, dan menggunakan kemampuan serta sumber
                daya yang dimilikinya untuk menghasilkan dampak sosial secara berkelanjutan.
              </p>
              <p className="font-semibold text-slate-900">
                Kamu bisa memulainya melalui profesimu hari ini.
              </p>
            </div>
          </div>

          {/* 6 Indonesian Profession Story Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-reveal>
            {PROFESSION_STORIES.map((item, idx) => (
              <article
                key={item.role}
                className="rounded-lg border border-stone-200 bg-[#faf9f5] p-6 flex flex-col justify-between gap-6 hover:border-amber-500/60 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                    <span className="font-bold text-amber-800">0{idx + 1}</span>
                    <span>{item.tag}</span>
                  </div>
                  <h3 className="font-hud text-xl font-bold text-slate-950">{item.role}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.story}</p>
                </div>

                <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Sprout className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                    {item.impactFocus}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>

          {/* Closing & Highlight Statement */}
          <div className="pt-4 border-t border-stone-200 flex flex-col md:flex-row md:items-end justify-between gap-6" data-reveal>
            <p className="text-base sm:text-lg text-slate-700 max-w-xl">
              Apa pun peranmu, selalu ada kesempatan untuk menciptakan nilai bagi orang lain.
            </p>
            <div className="md:text-right space-y-1">
              <p className="font-hud text-lg sm:text-xl font-bold text-slate-950">
                Profesi adalah tempatmu berkarya.
              </p>
              <p className="font-hud text-lg sm:text-xl font-bold text-amber-700">
                Dampak adalah nilai yang kamu tinggalkan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
