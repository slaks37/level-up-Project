import React, { useMemo } from 'react';
import { Award, Briefcase, Compass, Sparkles, TrendingUp } from 'lucide-react';
import type { Language, PlayerProfile } from '../types';
import { DEVELOPMENT_DIMENSIONS, inferQuestDimension, type DevelopmentDimension } from '../engine/v2/dimensions';
import { DEVELOPMENT_PATHWAYS } from '../engine/v2/pathways';

interface DimensionsHudPanelProps {
  player: PlayerProfile;
  lang: Language;
  showUpgradeBanner: boolean;
  onOpenAwakeningV2: () => void;
}

const BUSINESS_STAGE_LABELS: Record<string, Record<Language, string>> = {
  idea: { id: 'Tahap Ide', en: 'Idea Stage' },
  discover: { id: 'Discover', en: 'Discover' },
  prototype: { id: 'Prototipe', en: 'Prototype' },
  validate: { id: 'Validasi', en: 'Validate' },
  launch: { id: 'Launch', en: 'Launch' },
  grow: { id: 'Grow', en: 'Grow' },
  impact: { id: 'Impact', en: 'Impact' },
};

export const DimensionsHudPanel: React.FC<DimensionsHudPanelProps> = ({
  player,
  lang,
  showUpgradeBanner,
  onOpenAwakeningV2,
}) => {
  const id = lang === 'id';
  const pathway = DEVELOPMENT_PATHWAYS.find((p) => p.id === (player.pathwayId || 'personal_growth')) ?? DEVELOPMENT_PATHWAYS[0];
  const competencyLevel = player.competencyLevel ?? 1;
  const businessLevel = player.businessLevel ?? 0;
  const businessStage = player.businessStage ?? 'idea';

  const dimensionCounts = useMemo(() => {
    const counts: Record<DevelopmentDimension, number> = {
      PURPOSE: player.purposeStatement ? 2 : player.goal ? 1 : 0,
      HEALTH: (player.workoutStreak || 0) > 0 ? 2 : player.gym ? 1 : 0,
      SKILLS: Math.min(4, (player.shadows?.length || 0)),
      CAREER: player.career?.project ? 2 : 1,
      BUSINESS: businessLevel > 0 ? Math.min(4, businessLevel) : 0,
      FINANCIAL: 0,
      IMPACT: 0,
    };
    for (const q of player.quests || []) {
      const dim = inferQuestDimension(q);
      counts[dim] = Math.min(5, counts[dim] + (q.completed ? 2 : 1));
    }
    for (const step of (player.dreamSteps || []).filter((s) => !s.archived)) {
      if (step.dimension) {
        counts[step.dimension] = Math.min(5, counts[step.dimension] + (step.completed ? 2 : 1));
      }
    }
    return counts;
  }, [player, businessLevel]);

  return (
    <section className="anime-panel overflow-hidden border border-sky-200 bg-white">
      <div className="blender-bar px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-600" />
          {id ? 'LEVELUP 2.0 · 7 DIMENSI & 3 POROS PROGRES' : 'LEVELUP 2.0 · 7 DIMENSIONS & 3-AXIS PROGRESSION'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">
            {id ? pathway.nameId : pathway.nameEn}
          </span>
          <button
            type="button"
            onClick={onOpenAwakeningV2}
            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 hover:bg-sky-700 text-white transition flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>{player.awakeningV2Completed ? (id ? 'Atur Pathway' : 'Edit Pathway') : 'Awakening 2.0'}</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        {showUpgradeBanner && !player.awakeningV2Completed && (
          <div className="rounded border border-orange-200 bg-orange-50/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-orange-950">
              <strong className="font-bold">Awakening 2.0 (Opsional):</strong>{' '}
              {id
                ? 'Pilih jalur pengembangan (termasuk Sociopreneur 10 tahap) & misi hidupmu. Semua level, koin, dan progres lama 100% aman.'
                : 'Choose a development pathway (including the 10-stage Sociopreneur roadmap) & purpose. Existing levels, coins, and history stay 100% safe.'}
            </p>
            <button
              type="button"
              onClick={onOpenAwakeningV2}
              className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-hud font-bold text-[11px] uppercase shrink-0"
            >
              {id ? 'Mulai Awakening 2.0' : 'Start Awakening 2.0'}
            </button>
          </div>
        )}

        {/* 3-Axis Progression (Experience vs Competency vs Business — never conflated) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded border border-sky-200 bg-sky-50/60 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase text-sky-800 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {id ? 'Experience Level' : 'Experience Level'}
              </p>
              <p className="text-[10px] text-slate-600">
                {id ? 'Aktivitas harian & konsistensi' : 'Daily activity & consistency'}
              </p>
            </div>
            <span className="font-hud text-lg font-bold text-sky-900">Lv.{player.level}</span>
          </div>

          <div className="rounded border border-indigo-200 bg-indigo-50/60 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase text-indigo-800 flex items-center gap-1">
                <Award className="w-3 h-3" />
                {id ? 'Competency Level' : 'Competency Level'}
              </p>
              <p className="text-[10px] text-slate-600">
                {id ? 'Asesmen & bukti terverifikasi' : 'Verified assessments & evidence'}
              </p>
            </div>
            <span className="font-hud text-lg font-bold text-indigo-900">Lv.{competencyLevel}</span>
          </div>

          <div className="rounded border border-emerald-200 bg-emerald-50/60 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {id ? 'Business Level' : 'Business Level'}
              </p>
              <p className="text-[10px] text-slate-600">
                {BUSINESS_STAGE_LABELS[businessStage]?.[lang] || businessStage}
              </p>
            </div>
            <span className="font-hud text-lg font-bold text-emerald-900">Lv.{businessLevel}</span>
          </div>
        </div>

        {/* 7 Development Dimensions Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {DEVELOPMENT_DIMENSIONS.map((dim) => {
            const score = dimensionCounts[dim.id];
            const pct = Math.min(100, Math.round((score / 5) * 100));
            const isPrimary = pathway.primaryDimensions.includes(dim.id);
            return (
              <div
                key={dim.id}
                className={`rounded border px-2 py-1.5 ${
                  isPrimary ? 'border-sky-300 bg-sky-50/40' : 'border-slate-200 bg-slate-50/60'
                }`}
                title={id ? dim.shortDescId : dim.shortDescEn}
              >
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="font-bold text-slate-800 truncate">{id ? dim.labelId : dim.labelEn}</span>
                  <span className="font-mono text-[9px] text-slate-500">{score}/5</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isPrimary ? 'bg-sky-600' : 'bg-slate-500'}`}
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {player.purposeStatement && (
          <p className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
            <strong className="text-slate-900">{id ? 'Misi / Purpose:' : 'Purpose:'}</strong> {player.purposeStatement}
          </p>
        )}
      </div>
    </section>
  );
};
