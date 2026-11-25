import React from 'react';
import {
  Activity,
  Award,
  Bot,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Gift,
  Loader2,
  Newspaper,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type {
  DiscoveredPerk,
  Language,
  NutritionCondition,
  PlayerProfile,
  Quest,
  QuestFilter,
  SleepCondition,
} from '../types';
import { tr } from '../data/i18n';
import { getActiveStage, getRecoveryMultiplier } from '../engine/science';

// =========================================================================
// 1. PLAYER IDENTITY & 5 ANTI-BIAS ABILITIES
// =========================================================================
export const StatusPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
}> = ({ player, lang }) => {
  const activeStage = getActiveStage(player);
  const expPct = Math.min(100, Math.round((player.exp / Math.max(1, player.maxExp)) * 100));

  const abilities = [
    {
      key: 'str' as const,
      code: 'STR',
      name: lang === 'id' ? 'Kekuatan Otot & Fisik' : 'Muscular Strength',
      color: 'bg-rose-600',
    },
    {
      key: 'vit' as const,
      code: 'VIT',
      name: lang === 'id' ? 'Stamina & Daya Tahan' : 'Cardio Stamina & Vitality',
      color: 'bg-emerald-600',
    },
    {
      key: 'int' as const,
      code: 'INT',
      name: lang === 'id' ? 'Pengetahuan & Riset' : 'Knowledge & Deep Study',
      color: 'bg-indigo-600',
    },
    {
      key: 'agi' as const,
      code: 'AGI',
      name: lang === 'id' ? 'Kecepatan Eksekusi Kerja' : 'Execution Speed & Focus',
      color: 'bg-sky-600',
    },
    {
      key: 'cha' as const,
      code: 'CHA',
      name: lang === 'id' ? 'Komunikasi & Kepemimpinan' : 'Communication & Leadership',
      color: 'bg-amber-600',
    },
  ];

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-sky-600" />
          {tr(lang, 'profilePanelTitle')}
        </span>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-orange-400">
          {activeStage.rank}
        </span>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-hud font-bold text-xl text-slate-900 leading-tight truncate">
                {player.name}
              </h2>
              <p className="text-xs font-semibold text-sky-700 truncate">
                {player.profession} • {activeStage.title}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-mono text-[10px] text-slate-500 block">LEVEL</span>
              <span className="font-hud font-bold text-2xl text-orange-600 leading-none">
                {player.level}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between font-mono text-[10px] font-bold mb-1">
              <span className="text-slate-600">
                {lang === 'id' ? 'PROGRES LEVEL' : 'LEVEL PROGRESS'}
              </span>
              <span className="text-sky-700">
                {player.exp} / {player.maxExp} EXP
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-sm overflow-hidden border border-slate-300">
              <div
                className="h-full bg-sky-600 hud-bar-fill transition-all duration-300"
                style={{ width: `${expPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2 rounded bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900">{tr(lang, 'lblCredits')}</span>
              <span className="font-mono font-bold text-xs text-amber-700">{player.gold} CR</span>
            </div>
            <div className="p-2 rounded bg-orange-50 border border-orange-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-900">{tr(lang, 'lblStreak')}</span>
              <span className="font-mono font-bold text-xs text-orange-700">
                {player.streak} {lang === 'id' ? 'HARI' : 'DAYS'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 space-y-2">
          <span className="font-mono text-[10px] font-bold text-slate-600 uppercase block">
            {tr(lang, 'lblAbilitiesTitle')}
          </span>
          <div className="space-y-1.5 text-xs">
            {abilities.map((ab) => {
              const val = Number(player.stats[ab.key] || 10);
              const barPct = Math.min(100, Math.max(8, ((val - 10) / 15) * 100 + 12));
              return (
                <div key={ab.key}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="font-semibold text-slate-700 truncate pr-2">
                      <strong className="font-mono text-slate-900">{ab.code}</strong> • {ab.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 flex-shrink-0">
                      {val.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ab.color} transition-all duration-300`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. DAILY BODY CONDITION & RECOVERY CALIBRATION
// =========================================================================
export const BioConditionPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onChangeSleep: (sleep: SleepCondition) => void;
  onChangeNutrition: (nutrition: NutritionCondition) => void;
  onEditBio: () => void;
}> = ({ player, lang, onChangeSleep, onChangeNutrition, onEditBio }) => {
  const recMult = getRecoveryMultiplier(player.sleepCondition, player.nutritionCondition);
  const badgeCls =
    recMult >= 1.0
      ? 'bg-emerald-600 text-white'
      : recMult >= 0.9
        ? 'bg-sky-600 text-white'
        : 'bg-amber-600 text-white';

  const recAdvice =
    recMult >= 1.0
      ? lang === 'id'
        ? 'Kondisi prima! Pertumbuhan otot dan daya serap belajarmu maksimal.'
        : 'Peak condition! Muscle synthesis and learning retention are maximized.'
      : recMult >= 0.9
        ? lang === 'id'
          ? 'Tidur & nutrisi seimbang mendukung pertumbuhan otot dan fokus.'
          : 'Balanced sleep & nutrition support steady strength and focus.'
        : lang === 'id'
          ? 'Pemulihan menurun. Prioritaskan tidur cukup & protein hari ini.'
          : 'Recovery reduced. Prioritize quality sleep & protein today.';

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          {tr(lang, 'bioPanelTitle')}
        </span>
        <button
          type="button"
          onClick={onEditBio}
          className="font-mono text-[10px] font-bold text-sky-700 hover:underline"
        >
          {tr(lang, 'btnEditBio')}
        </button>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="block font-mono text-[9px] text-slate-500">IMT / BMI</span>
            <span className="font-hud font-bold text-sm text-slate-900">{player.bio.bmi}</span>
            <span className="block text-[10px] font-semibold text-emerald-700 truncate">
              {player.bio.bmiCategory}
            </span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="block font-mono text-[9px] text-slate-500">
              {lang === 'id' ? 'KALORI BASAL' : 'BASAL BMR'}
            </span>
            <span className="font-hud font-bold text-sm text-slate-900">{player.bio.bmr}</span>
            <span className="block text-[10px] text-slate-500">
              {lang === 'id' ? 'kkal/hari' : 'kcal/day'}
            </span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="block font-mono text-[9px] text-slate-500">
              {tr(lang, 'lblProteinTarget')}
            </span>
            <span className="font-hud font-bold text-sm text-sky-700">
              {player.bio.proteinTarget}g
            </span>
            <span className="block text-[10px] text-slate-500">1.6g/kg BB</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {tr(lang, 'lblSleepToday')}
            </label>
            <select
              value={player.sleepCondition}
              onChange={(e) => onChangeSleep(e.target.value as SleepCondition)}
              className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-600"
            >
              <option value="poor">{tr(lang, 'optSleepLow')}</option>
              <option value="moderate">{tr(lang, 'optSleepMid')}</option>
              <option value="optimal">{tr(lang, 'optSleepHigh')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {tr(lang, 'lblNutritionToday')}
            </label>
            <select
              value={player.nutritionCondition}
              onChange={(e) => onChangeNutrition(e.target.value as NutritionCondition)}
              className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-600"
            >
              <option value="deficit">{tr(lang, 'optNutLow')}</option>
              <option value="balanced">{tr(lang, 'optNutMid')}</option>
              <option value="high_protein">{tr(lang, 'optNutHigh')}</option>
            </select>
          </div>
        </div>

        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-emerald-900">{tr(lang, 'lblRecoveryRate')}</p>
            <p className="text-[11px] text-emerald-700 leading-snug">{recAdvice}</p>
          </div>
          <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded flex-shrink-0 ${badgeCls}`}>
            {recMult}x
          </span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. DREAM ROADMAP & AI COACH PLANNER
// =========================================================================
export const DreamRoadmapPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
  isGeneratingRoadmap: boolean;
  onGenerateRoadmap: () => void;
  onEditDream: () => void;
  onAddStep: () => void;
  onToggleStep: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
}> = ({
  player,
  lang,
  isGeneratingRoadmap,
  onGenerateRoadmap,
  onEditDream,
  onAddStep,
  onToggleStep,
  onDeleteStep,
}) => {
  const totalSteps = Math.max(1, player.dreamSteps.length);
  const completedSteps = player.dreamSteps.filter((s) => s.completed).length;
  const pct = Math.round((completedSteps / totalSteps) * 100);

  const proximityText =
    pct === 100
      ? tr(lang, 'dreamDone')
      : pct >= 70
        ? tr(lang, 'dreamNearHigh')
        : pct > 0
          ? tr(lang, 'dreamNearMid')
          : tr(lang, 'dreamNearZero');

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-orange-700 flex items-center gap-1.5 truncate">
          <Compass className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{tr(lang, 'dreamPanelTitle')}</span>
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            disabled={isGeneratingRoadmap}
            onClick={onGenerateRoadmap}
            className="font-mono text-[9px] font-bold px-2 py-1 rounded bg-slate-900 hover:bg-sky-700 disabled:opacity-60 text-white transition flex items-center gap-1 btn-anime"
          >
            {isGeneratingRoadmap ? (
              <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
            ) : (
              <Sparkles className="w-3 h-3 text-orange-400" />
            )}
            <span>{tr(lang, 'btnAiRoadmapLbl')}</span>
          </button>
          <button
            type="button"
            onClick={onEditDream}
            className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 transition"
            title={lang === 'id' ? 'Ubah Impian & Target Level' : 'Edit Dream & Target Level'}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="mb-3 bg-orange-50/70 border border-orange-200 rounded p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[10px] font-bold text-orange-700 uppercase">
                    {tr(lang, 'dreamGoalLabel')}
                  </p>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
                    TARGET: LV.{player.targetLevel}
                  </span>
                </div>
                <p className="font-hud font-bold text-slate-900 text-sm sm:text-base leading-snug mt-0.5">
                  {player.goal}
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-600 text-white flex-shrink-0">
                {pct}%
              </span>
            </div>

            <div className="mt-2 p-2 rounded bg-white/90 border border-orange-200 text-[11px] text-slate-700 flex items-start gap-1.5">
              <Bot className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
              <span>{player.coachAdvice}</span>
            </div>

            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] font-semibold mb-1 gap-2">
                <span className="text-slate-700 truncate">{proximityText}</span>
                <span className="font-mono text-orange-700 font-bold flex-shrink-0">
                  {completedSteps} / {player.dreamSteps.length}{' '}
                  {lang === 'id' ? 'Tahap' : 'Steps'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-sm overflow-hidden border border-orange-300">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 hud-bar-fill transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {player.dreamSteps.map((step) => {
              const stepPct = step.completed
                ? 100
                : Math.min(
                    100,
                    Math.round(
                      ((step.completedMinutes || 0) / Math.max(1, step.targetMinutes || 180)) * 100
                    )
                  );
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded border transition ${
                    step.completed
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleStep(step.id)}
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition ${
                        step.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-400 hover:border-orange-500 text-transparent'
                      }`}
                      title={
                        step.completed
                          ? lang === 'id'
                            ? 'Tandai belum selesai'
                            : 'Mark incomplete'
                          : lang === 'id'
                            ? 'Tandai tahap tercapai'
                            : 'Mark milestone complete'
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400 truncate">
                          {step.phase} • LV.{step.targetLevel}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-mono text-[9px] font-bold text-slate-600">
                            {step.completedMinutes}/{step.targetMinutes}m
                          </span>
                          {player.dreamSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteStep(step.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title={lang === 'id' ? 'Hapus langkah' : 'Delete step'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p
                        className={`font-hud font-bold text-xs mt-1 leading-snug ${
                          step.completed ? 'line-through text-emerald-900/75' : 'text-slate-900'
                        }`}
                      >
                        {step.title}
                      </p>

                      {step.coachTip && (
                        <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                          {step.coachTip}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-grow h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-300 ${
                              step.completed ? 'bg-emerald-600' : 'bg-orange-500'
                            }`}
                            style={{ width: `${stepPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[9px] font-bold text-sky-700 truncate max-w-[115px]">
                          ⚡ {step.skillName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={onAddStep}
            className="w-full py-2 px-3 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition btn-anime"
          >
            <PlusCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>{tr(lang, 'btnAddStepLbl')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. DAILY TASKS & SYNCED DURATION BREAKDOWN
// =========================================================================
export const DailyTasksPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
  filter: QuestFilter;
  isGeneratingQuests: boolean;
  onChangeFilter: (f: QuestFilter) => void;
  onGenerateAIQuests: () => void;
  onRequestCompleteQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onOpenAddQuest: () => void;
  onOpenCompleteDay: () => void;
}> = ({
  player,
  lang,
  filter,
  isGeneratingQuests,
  onChangeFilter,
  onGenerateAIQuests,
  onRequestCompleteQuest,
  onDeleteQuest,
  onOpenAddQuest,
  onOpenCompleteDay,
}) => {
  const bd = player.dailyBreakdown;
  const log = player.dailyDurationLog;
  const doneTotal = (log.study || 0) + (log.work || 0) + (log.fitness || 0);

  const studyPct = Math.min(100, Math.round(((log.study || 0) / Math.max(1, bd.study)) * 100));
  const workPct = Math.min(100, Math.round(((log.work || 0) / Math.max(1, bd.work)) * 100));
  const fitPct = Math.min(100, Math.round(((log.fitness || 0) / Math.max(1, bd.fitness)) * 100));

  const filteredQuests = player.quests.filter(
    (q) => filter === 'ALL' || q.category === filter
  );

  const tabs: Array<{ id: QuestFilter; label: string }> = [
    { id: 'ALL', label: tr(lang, 'tabALL') },
    { id: 'STUDY', label: tr(lang, 'tabSTUDY') },
    { id: 'CAREER', label: tr(lang, 'tabCAREER') },
    { id: 'FITNESS', label: tr(lang, 'tabFITNESS') },
  ];

  const categoryBadge = (cat: Quest['category']) => {
    if (cat === 'STUDY') return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (cat === 'FITNESS') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-sky-100 text-sky-800 border-sky-300';
  };

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-sky-800 flex items-center gap-1.5 truncate">
          <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{tr(lang, 'questBoardTitle')}</span>
        </span>
        <button
          type="button"
          disabled={isGeneratingQuests}
          onClick={onGenerateAIQuests}
          className="font-mono text-[9px] font-bold px-2 py-1 rounded bg-slate-900 hover:bg-sky-700 disabled:opacity-60 text-white transition flex items-center gap-1 flex-shrink-0 btn-anime"
        >
          {isGeneratingQuests ? (
            <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
          ) : (
            <Sparkles className="w-3 h-3 text-orange-400" />
          )}
          <span>{tr(lang, 'aiQuestBtnText')}</span>
        </button>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <p className="text-xs text-slate-600 mb-3">{tr(lang, 'questBoardHint')}</p>

          {/* Synced Daily Duration Breakdown */}
          <div className="mb-3 p-2.5 rounded bg-slate-50 border border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-hud font-bold text-[11px] text-slate-800 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {tr(lang, 'durBreakdownTitle')}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-sky-400">
                {doneTotal} / {bd.total} {lang === 'id' ? 'MNT' : 'MIN'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="flex justify-between text-[9px] font-bold mb-1">
                  <span className="text-indigo-700">{tr(lang, 'durLblStudy')}</span>
                  <span className="font-mono text-slate-700">
                    {log.study}/{bd.study}m
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${studyPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="flex justify-between text-[9px] font-bold mb-1">
                  <span className="text-sky-700">{tr(lang, 'durLblWork')}</span>
                  <span className="font-mono text-slate-700">
                    {log.work}/{bd.work}m
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${workPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="flex justify-between text-[9px] font-bold mb-1">
                  <span className="text-emerald-700">{tr(lang, 'durLblFit')}</span>
                  <span className="font-mono text-slate-700">
                    {log.fitness}/{bd.fitness}m
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${fitPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 mb-2.5 bg-slate-100 p-1 rounded border border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeFilter(tab.id)}
                className={`py-1 px-1.5 rounded font-mono text-[9px] font-bold transition ${
                  filter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quest List */}
          <div className="space-y-2 max-h-[265px] overflow-y-auto pr-1">
            {filteredQuests.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                {lang === 'id'
                  ? 'Belum ada tugas di kategori ini. Tambahkan tugas atau klik BUAT TUGAS AI.'
                  : 'No tasks in this category yet. Add one or click AI SYNCED TASKS.'}
              </div>
            ) : (
              filteredQuests.map((q) => (
                <div
                  key={q.id}
                  className={`p-2.5 rounded border transition flex items-start gap-2.5 ${
                    q.completed
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-slate-300 hover:border-sky-500'
                  }`}
                >
                  <button
                    type="button"
                    disabled={q.completed}
                    onClick={() => onRequestCompleteQuest(q)}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition ${
                      q.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white cursor-default'
                        : 'bg-white border-slate-400 hover:border-sky-600 hover:bg-sky-50 text-transparent'
                    }`}
                    title={
                      q.completed
                        ? lang === 'id'
                          ? 'Sudah selesai hari ini'
                          : 'Completed today'
                        : lang === 'id'
                          ? 'Verifikasi & selesaikan tugas'
                          : 'Verify & complete task'
                    }
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${categoryBadge(q.category)}`}
                      >
                        {q.category} •{' '}
                        {q.completed && q.completedQty ? q.completedQty : q.defaultQty}{' '}
                        {q.unitType === 'REPS' ? 'REPS' : lang === 'id' ? 'MNT' : 'MIN'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[9px] font-bold text-amber-700">
                          +{q.exp} EXP
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteQuest(q.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title={lang === 'id' ? 'Hapus tugas' : 'Delete task'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p
                      className={`font-hud font-bold text-xs mt-1 leading-snug ${
                        q.completed ? 'line-through text-emerald-900/75' : 'text-slate-900'
                      }`}
                    >
                      {q.title}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-500">
                      <span className="truncate">⚡ {q.skillTag}</span>
                      {q.completed && q.completedRpe && (
                        <span className="font-mono text-[9px] font-bold text-emerald-700 flex-shrink-0">
                          RPE {q.completedRpe}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenAddQuest}
            className="py-2 px-2.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition btn-anime"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>{tr(lang, 'btnAddQuestLbl')}</span>
          </button>
          <button
            type="button"
            onClick={onOpenCompleteDay}
            className="py-2 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition btn-anime"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{tr(lang, 'btnDailyClearLbl')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 5. AUTO SKILL ARSENAL (FORMING & PERMANENT SKILLS)
// =========================================================================
export const SkillArsenalPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onOpenAddSkill: () => void;
}> = ({ player, lang, onOpenAddSkill }) => {
  const forming = Object.values(player.skillProgress || {}).filter((s) => !s.unlocked);

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-purple-800 flex items-center gap-1.5 truncate">
          <Award className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
          <span className="truncate">{tr(lang, 'skillPanelTitle')}</span>
        </span>
        <button
          type="button"
          onClick={onOpenAddSkill}
          className="font-mono text-[9px] font-bold text-purple-800 hover:bg-purple-100 border border-purple-300 px-2 py-0.5 rounded transition flex-shrink-0"
        >
          {tr(lang, 'btnAddSkill')}
        </button>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">{tr(lang, 'skillPanelDesc')}</p>

          <div>
            <p className="font-mono text-[10px] font-bold text-sky-800 uppercase mb-1.5">
              {tr(lang, 'lblFormingSkills')}
            </p>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {forming.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  {lang === 'id'
                    ? 'Kerjakan tugas baru untuk mulai membentuk calon skill otomatis.'
                    : 'Complete any new task to start building an automatic skill.'}
                </p>
              ) : (
                forming.map((item) => {
                  const pct = Math.min(
                    100,
                    Math.round(Math.max((item.sessions / 3) * 100, (item.totalMinutes / 120) * 100))
                  );
                  return (
                    <div
                      key={item.name}
                      className="p-2 rounded bg-sky-50/70 border border-sky-200"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 truncate pr-2">{item.name}</span>
                        <span className="font-mono text-[10px] font-bold text-sky-700 flex-shrink-0">
                          {item.sessions}/3 {lang === 'id' ? 'sesi' : 'runs'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-sky-200 mt-1">
                        <div
                          className="h-full bg-sky-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="font-mono text-[10px] font-bold text-purple-800 uppercase mb-1.5">
              {tr(lang, 'lblMasteredSkills')}
            </p>
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {player.shadows.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  {lang === 'id' ? 'Belum ada skill permanen.' : 'No permanent skills unlocked yet.'}
                </p>
              ) : (
                player.shadows.map((sh, idx) => (
                  <div
                    key={`${sh.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 border-l-2 border-l-purple-600 gap-1.5"
                  >
                    <div className="min-w-0">
                      <p className="font-hud font-bold text-xs text-slate-900 truncate">
                        {sh.name}
                      </p>
                      {sh.totalMinutes > 0 && (
                        <p className="font-mono text-[9px] text-slate-500">
                          {sh.totalMinutes} {lang === 'id' ? 'mnt latihan rutin' : 'min practiced'}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 flex-shrink-0">
                      {sh.rank}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 6. ROW 3: REWARD EXCHANGE + GROWTH NEWS & OPPORTUNITIES
// =========================================================================
export const PerksAndNewsSection: React.FC<{
  player: PlayerProfile;
  lang: Language;
  isDiscoveringPerks: boolean;
  onUpdateCity: (city: string) => void;
  onUpdateInterest: (interest: string) => void;
  onDiscoverPerks: () => void;
  onClaimPerk: (perk: DiscoveredPerk) => void;
  onBuyReward: (rewardId: string) => void;
  onOpenAddReward: () => void;
  onTurnNewsIntoQuest: (newsIndex: number) => void;
}> = ({
  player,
  lang,
  isDiscoveringPerks,
  onUpdateCity,
  onUpdateInterest,
  onDiscoverPerks,
  onClaimPerk,
  onBuyReward,
  onOpenAddReward,
  onTurnNewsIntoQuest,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: Reward Exchange */}
      <div className="lg:col-span-7 anime-panel overflow-hidden flex flex-col justify-between">
        <div className="blender-bar px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-amber-800 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            {tr(lang, 'shopPanelTitle')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isDiscoveringPerks}
              onClick={onDiscoverPerks}
              className="font-mono text-[9px] font-bold bg-slate-900 hover:bg-sky-700 disabled:opacity-60 text-white px-2.5 py-1 rounded transition flex items-center gap-1 btn-anime"
            >
              {isDiscoveringPerks ? (
                <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
              ) : (
                <Search className="w-3 h-3 text-orange-400" />
              )}
              <span>{tr(lang, 'btnDiscoverPerksLbl')}</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddReward}
              className="font-mono text-[9px] font-bold text-amber-800 hover:bg-amber-100 border border-amber-400 px-2 py-1 rounded transition"
            >
              {tr(lang, 'btnAddReward')}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 flex-grow">
          {/* City & Wish Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-amber-50/60 p-2.5 rounded border border-amber-200">
            <div className="sm:col-span-4">
              <label className="block font-mono text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                {tr(lang, 'lblShopCity')}
              </label>
              <input
                type="text"
                value={player.city}
                onChange={(e) => onUpdateCity(e.target.value)}
                placeholder="Surabaya"
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-8">
              <label className="block font-mono text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                {tr(lang, 'lblShopWish')}
              </label>
              <input
                type="text"
                value={player.rewardInterest}
                onChange={(e) => onUpdateInterest(e.target.value)}
                placeholder={
                  lang === 'id'
                    ? 'Misal: Kopi, kursus sertifikat gratis, e-book, promo olahraga...'
                    : 'E.g.: Coffee, free certified courses, e-books, gym promo...'
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* AI Discovered Perks */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="font-mono text-[10px] font-bold text-amber-900 uppercase">
                {tr(lang, 'lblAiPerksSub')}
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                {player.city || 'SURABAYA'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {player.discoveredPerks.map((perk) => {
                const isFree = !perk.cost || perk.cost <= 0;
                const canAfford = isFree || player.gold >= perk.cost;
                const isLocal =
                  perk.type.toUpperCase().includes('DISKON') ||
                  perk.type.toUpperCase().includes('LOCAL');
                const badgeStyle = isLocal
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                return (
                  <div
                    key={perk.id}
                    className="p-3 rounded bg-gradient-to-br from-white to-amber-50/40 border border-amber-300 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}
                        >
                          {perk.type}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            isFree
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isFree
                            ? lang === 'id'
                              ? 'GRATIS (0 CR)'
                              : 'FREE (0 CR)'
                            : `${perk.cost} CR`}
                        </span>
                      </div>
                      <p className="font-hud font-bold text-xs text-slate-900 leading-snug">
                        {perk.title}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{perk.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onClaimPerk(perk)}
                        className={`flex-grow py-1.5 px-2 rounded font-hud font-bold text-[11px] uppercase tracking-wider transition btn-anime ${
                          canAfford
                            ? 'bg-slate-900 hover:bg-amber-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isFree
                          ? lang === 'id'
                            ? 'KLAIM INFO & CARA'
                            : 'CLAIM & HOW-TO'
                          : lang === 'id'
                            ? `TUKAR ${perk.cost} CR`
                            : `REDEEM ${perk.cost} CR`}
                      </button>
                      {perk.sourceUrl && (
                        <a
                          href={perk.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2.5 rounded border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-mono text-[10px] font-bold flex items-center gap-1"
                        >
                          <span>LINK</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal Self-Rewards */}
          <div className="pt-2.5 border-t border-slate-200">
            <p className="font-mono text-[10px] font-bold text-slate-600 uppercase mb-1.5">
              {tr(lang, 'lblPersonalRewardsSub')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {player.rewards.map((r) => {
                const canAfford = player.gold >= r.cost;
                return (
                  <div
                    key={r.id}
                    className="p-2.5 rounded bg-slate-50 border border-slate-300 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-hud font-bold text-xs text-slate-900">{r.name}</span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
                          {r.cost} CR
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{r.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBuyReward(r.id)}
                      className={`w-full py-1.5 rounded font-hud font-bold text-[11px] uppercase tracking-wider transition btn-anime ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {lang === 'id' ? 'TUKAR HADIAH' : 'REDEEM REWARD'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Growth News & Level-Up Opportunities */}
      <div className="lg:col-span-5 anime-panel overflow-hidden flex flex-col justify-between">
        <div className="blender-bar px-4 py-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-sky-800 flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-sky-600" />
            {tr(lang, 'newsPanelTitle')}
          </span>
          <button
            type="button"
            disabled={isDiscoveringPerks}
            onClick={onDiscoverPerks}
            className="font-mono text-[9px] font-bold text-sky-700 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isDiscoveringPerks ? 'animate-spin' : ''}`} />
            <span>{tr(lang, 'btnRefreshNewsLbl')}</span>
          </button>
        </div>

        <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <p className="text-xs text-slate-600">{tr(lang, 'newsPanelDesc')}</p>
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {player.growthNews.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded bg-slate-50 border border-slate-300 hover:border-sky-500 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                      {item.tag}
                    </span>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] font-bold text-sky-700 hover:underline flex items-center gap-0.5"
                      >
                        <span>{lang === 'id' ? 'Baca Sumber' : 'Source'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="font-hud font-bold text-xs text-slate-900 leading-snug">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.summary}</p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onTurnNewsIntoQuest(idx)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-sky-700 text-white font-mono text-[9px] font-bold transition flex items-center gap-1 btn-anime"
                    >
                      <CheckCircle2 className="w-3 h-3 text-orange-400" />
                      <span>
                        {lang === 'id'
                          ? 'JADIKAN TUGAS BELAJAR / KERJA'
                          : 'ADD TO DAILY TASKS'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {player.groundingSources.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="font-mono text-[9px] font-bold text-slate-500 uppercase mb-1">
                {lang === 'id' ? 'SUMBER REFERENSI:' : 'REFERENCE SOURCES:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {player.groundingSources.slice(0, 4).map((s) => (
                  <a
                    key={s.uri}
                    href={s.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 truncate max-w-[200px]"
                    title={s.title}
                  >
                    ↗ {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
