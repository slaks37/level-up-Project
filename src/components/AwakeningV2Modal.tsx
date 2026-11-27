import React, { useState } from 'react';
import { CheckCircle2, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import type { Language, PlayerProfile } from '../types';
import { ModalShell } from './Modals';
import { createPathwayDreamSteps, DEVELOPMENT_PATHWAYS, type PathwayId } from '../engine/v2/pathways';

export interface AwakeningV2Result {
  pathwayId: PathwayId;
  purposeStatement: string;
  availableResources: string[];
  preferredActiveDays: number[];
  skillSelfRatings: Record<string, number>;
  applyPathwayRoadmap: boolean;
}

interface AwakeningV2ModalProps {
  player: PlayerProfile;
  lang: Language;
  onSave: (result: AwakeningV2Result) => void;
  onClose: () => void;
}

const RESOURCE_OPTIONS_ID = [
  'Laptop / HP & Internet',
  'Waktu luang 1-2 jam/hari',
  'Jaringan komunitas lokal',
  'Keahlian produksi / kerajinan',
  'Akses mentor / pembimbing',
  'Potensi produk lokal / pertanian',
];

const RESOURCE_OPTIONS_EN = [
  'Laptop / Phone & Internet',
  '1-2 hrs/day dedicated time',
  'Local community network',
  'Production / craft skills',
  'Mentor / coach access',
  'Local / agricultural product potential',
];

const SELF_SKILL_KEYS = [
  { key: 'communication', id: 'Komunikasi & Presentasi', en: 'Communication & Pitching' },
  { key: 'problem_solving', id: 'Riset Masalah & Pelanggan', en: 'Problem & Customer Research' },
  { key: 'product_execution', id: 'Eksekusi Produk / Proyek', en: 'Product / Project Execution' },
  { key: 'finance_literacy', id: 'Literasi Keuangan & HPP', en: 'Financial & Pricing Literacy' },
  { key: 'social_impact', id: 'Kolaborasi & Dampak Sosial', en: 'Collaboration & Social Impact' },
];

const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AwakeningV2Modal: React.FC<AwakeningV2ModalProps> = ({
  player,
  lang,
  onSave,
  onClose,
}) => {
  const id = lang === 'id';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [purposeStatement, setPurposeStatement] = useState(player.purposeStatement || '');
  const [pathwayId, setPathwayId] = useState<PathwayId>(player.pathwayId || 'sociopreneur');
  const [availableResources, setAvailableResources] = useState<string[]>(player.availableResources || []);
  const [preferredActiveDays, setPreferredActiveDays] = useState<number[]>(
    player.preferredActiveDays?.length ? player.preferredActiveDays : [1, 2, 3, 4, 5]
  );
  const [skillSelfRatings, setSkillSelfRatings] = useState<Record<string, number>>(
    player.skillSelfRatings || {
      communication: 3,
      problem_solving: 3,
      product_execution: 3,
      finance_literacy: 2,
      social_impact: 3,
    }
  );
  const [applyPathwayRoadmap, setApplyPathwayRoadmap] = useState(
    !player.awakeningV2Completed && pathwayId !== (player.pathwayId || 'personal_growth')
  );

  const selectedPathway = DEVELOPMENT_PATHWAYS.find((p) => p.id === pathwayId) ?? DEVELOPMENT_PATHWAYS[0];
  const previewSteps = createPathwayDreamSteps(
    pathwayId,
    player.goal,
    player.profession,
    player.targetLevel,
    player.dailyBreakdown,
    lang
  );

  const toggleResource = (label: string) => {
    setAvailableResources((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label].slice(0, 20)
    );
  };

  const toggleDay = (dayIdx: number) => {
    setPreferredActiveDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort((a, b) => a - b)
    );
  };

  const handleFinish = () => {
    onSave({
      pathwayId,
      purposeStatement: purposeStatement.trim().slice(0, 500),
      availableResources,
      preferredActiveDays,
      skillSelfRatings,
      applyPathwayRoadmap,
    });
  };

  return (
    <ModalShell
      title={id ? 'AWAKENING 2.0 · JALUR PENGEMBANGAN & MISI' : 'AWAKENING 2.0 · PATHWAY & PURPOSE'}
      icon={<Compass className="w-4 h-4 text-sky-600" />}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {id
                ? 'Progres lama 100% aman (Level, EXP, Koin, Skill, Jurnal & Profesi tetap dipertahankan). Kami tidak meminta data medis atau rekening pribadi.'
                : 'Existing progress is 100% preserved (Level, EXP, Coins, Skills, Journal & Profession stay intact). No sensitive medical or bank data required.'}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold shrink-0">
            {step} / 3
          </span>
        </div>

        {/* STEP 1: PURPOSE, RESOURCES & SCHEDULE */}
        {step === 1 && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="font-bold text-slate-900">
                {id ? '1. Tujuan & Makna Hidup (Purpose Discovery — Opsional)' : '1. Purpose Statement (Optional)'}
              </span>
              <textarea
                rows={3}
                maxLength={500}
                value={purposeStatement}
                onChange={(e) => setPurposeStatement(e.target.value)}
                placeholder={
                  id
                    ? 'Contoh: Membantu petani lokal mendapatkan harga panen lebih adil sambil membangun usaha kopi yang sehat.'
                    : 'Example: Empower local farmers with fair farm-gate pricing while building a sustainable specialty coffee venture.'
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
              />
            </label>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900">
                {id ? '2. Sumber Daya yang Sudah Dimiliki (Non-Sensitif)' : '2. Available Resources (Non-Sensitive)'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(id ? RESOURCE_OPTIONS_ID : RESOURCE_OPTIONS_EN).map((item) => {
                  const active = availableResources.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleResource(item)}
                      className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900">
                {id ? '3. Hari Aktif Pengembangan Mingguan' : '3. Preferred Active Development Days'}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {(id ? DAY_LABELS_ID : DAY_LABELS_EN).map((lbl, idx) => {
                  const active = preferredActiveDays.includes(idx);
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`py-1.5 rounded border font-mono text-[11px] font-bold transition ${
                        active
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PATHWAY SELECTION */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-slate-700">
              {id
                ? `Profesi aktifmu (${player.profession}) tetap dipertahankan. Pilih Pathway pengembangan untuk memperluas Peta Impianmu:`
                : `Your profession (${player.profession}) stays preserved. Choose a development pathway to extend your Dream Map:`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEVELOPMENT_PATHWAYS.map((p) => {
                const selected = p.id === pathwayId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPathwayId(p.id);
                      if (p.id !== (player.pathwayId || 'personal_growth')) {
                        setApplyPathwayRoadmap(true);
                      }
                    }}
                    className={`text-left p-3 rounded border transition ${
                      selected
                        ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-200'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-hud font-bold text-sm text-slate-900">
                        {id ? p.nameId : p.nameEn}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
                        {p.stageCount} {id ? 'Tahap' : 'Stages'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{id ? p.taglineId : p.taglineEn}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: SELF-ASSESSMENT & ROADMAP PREVIEW */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">
                  {id ? 'Penilaian Diri Awal (Skala 1–5)' : 'Initial Skill Self-Assessment (1–5)'}
                </p>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                  {id ? 'Bukan Kompetensi Terverifikasi' : 'Self-Rated Only (Not Verified)'}
                </span>
              </div>
              {SELF_SKILL_KEYS.map((item) => {
                const val = skillSelfRatings[item.key] ?? 3;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">{id ? item.id : item.en}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSkillSelfRatings((prev) => ({ ...prev, [item.key]: n }))}
                          className={`w-6 h-6 rounded font-mono text-[11px] font-bold border ${
                            val === n
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded border border-sky-200 bg-sky-50/70 p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyPathwayRoadmap}
                  onChange={(e) => setApplyPathwayRoadmap(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] text-slate-800">
                  <strong>
                    {id
                      ? `Terapkan template Peta Impian ${selectedPathway.nameId} (${previewSteps.length} tahap)`
                      : `Apply ${selectedPathway.nameEn} Dream Map template (${previewSteps.length} stages)`}
                  </strong>
                  <span className="block text-slate-600">
                    {id
                      ? 'Tahap lama yang sudah selesai tetap diarsipkan aman dan tidak dihapus.'
                      : 'Previously completed milestones are safely archived and preserved.'}
                  </span>
                </span>
              </label>

              {applyPathwayRoadmap && (
                <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-sky-200">
                  {previewSteps.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-700">
                      <span className="font-mono font-bold text-sky-900 shrink-0">{s.phase}</span>
                      <span className="truncate flex-grow">{s.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NAVIGATION FOOTER */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s === 3 ? 2 : 1)))}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
          >
            {step === 1 ? (id ? 'Nanti Saja' : 'Cancel') : (id ? 'Kembali' : 'Back')}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold uppercase flex items-center gap-1.5"
            >
              <span>{id ? 'Lanjut' : 'Next'}</span>
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold uppercase flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{id ? 'Simpan Awakening 2.0' : 'Save Awakening 2.0'}</span>
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
