import React from 'react';
import {
  Award,
  Bot,
  Check,
  CheckSquare,
  Clock,
  Compass,
  Edit3,
  Gift,
  Loader2,
  Plus,
  PlusCircle,
  Shield,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type {
  GrowthNewsItem,
  DreamStep,
  Language,
  PlayerProfile,
  Quest,
  QuestFilter,
} from '../types';
import { tr } from '../data/i18n';
import { getActiveStage } from '../engine/science';
import { getRoadmapActions } from '../engine/coaching';
import { PromoNewsPanel } from './PromoNewsPanel';

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
// 3. DREAM ROADMAP & AI COACH PLANNER
// =========================================================================
export const DreamRoadmapPanel: React.FC<{
  player: PlayerProfile;
  lang: Language;
  isGeneratingRoadmap: boolean;
  onGenerateRoadmap: () => void;
  onEditDream: () => void;
  onAddStep: () => void;
  onAddRoadmapTask: (step: DreamStep, action: string) => void;
  onToggleStep: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
}> = ({
  player,
  lang,
  isGeneratingRoadmap,
  onGenerateRoadmap,
  onEditDream,
  onAddStep,
  onAddRoadmapTask,
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
                    <details className="mt-2 rounded border border-slate-200 bg-white p-2 text-xs">
                      <summary className="cursor-pointer font-bold text-sky-900">{lang === 'id' ? 'Lihat langkah kecil' : 'See small steps'}</summary>
                      <ol className="mt-1 list-decimal space-y-2 break-words pl-4">
                        {getRoadmapActions(step, lang).map((action) => {
                          const linked = player.quests.find((quest) => quest.title === action.slice(0, 140) && quest.dreamStepId === step.id);
                          const done = Boolean(step.completedActions?.includes(action.slice(0, 140)) || linked?.completed);
                          return <li key={action}>{action}{!step.completed && <button type="button" disabled={Boolean(linked) || done}
                            className="ml-1 text-sky-800 underline disabled:text-slate-500" onClick={() => onAddRoadmapTask(step, action)}>
                            {done ? (lang === 'id' ? 'Selesai' : 'Done') : linked ? (lang === 'id' ? 'Masuk daftar' : 'Added') : (lang === 'id' ? 'Jadikan tugas' : 'Add task')}
                          </button>}</li>;
                        })}
                      </ol>
                    </details>

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
                        {q.workout && !q.completed ? `REPS · ${q.workout.sets} × ${q.workout.reps}` : q.unitType === 'REPS' ? 'REPS' : lang === 'id' ? 'MNT' : 'MIN'}
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
            <div className="space-y-2">
              {player.shadows.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  {lang === 'id' ? 'Belum ada skill permanen.' : 'No permanent skills unlocked yet.'}
                </p>
              ) : (
                player.shadows.map((skill, index) => {
                  const examples = player.quests.filter((quest) => quest.skillTag.trim().toLowerCase() === skill.name.trim().toLowerCase());
                  return (
                    <details key={skill.name + index} className="rounded border border-slate-200 border-l-2 border-l-purple-600 bg-slate-50">
                      <summary className="cursor-pointer rounded p-2 text-xs font-bold text-slate-900 hover:bg-purple-50 focus-visible:outline-purple-600">
                        <span className="break-words">{skill.name}</span>
                        <span className="ml-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[9px] text-purple-800">{skill.rank}</span>
                      </summary>
                      <div className="space-y-1.5 border-t border-slate-200 p-2 text-xs text-slate-700">
                        <p className="font-bold">{lang === 'id' ? 'Skill yang sudah dimiliki' : 'Skill in your collection'}</p>
                        <p>{skill.sessions} {lang === 'id' ? 'sesi' : 'sessions'} · {skill.totalMinutes} {lang === 'id' ? 'menit tercatat' : 'logged minutes'}</p>
                        {examples.length > 0 && <>
                          <p className="font-semibold">{lang === 'id' ? 'Tugas terkait' : 'Related tasks'}</p>
                          <ul className="list-disc space-y-1 pl-4">{examples.map((quest) => <li key={quest.id}>{quest.title}</li>)}</ul>
                        </>}
                      </div>
                    </details>
                  );
                })
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
export function RewardsAndGrowth({ player, lang, actions, onBuyReward, onAddReward, onAddAction }: {
  player: PlayerProfile;
  lang: Language;
  actions: GrowthNewsItem[];
  onBuyReward: (id: string) => void;
  onAddReward: () => void;
  onAddAction: (item: GrowthNewsItem) => void;
}) {
  const id = lang === 'id';
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <section className="anime-panel overflow-hidden">
        <div className="blender-bar flex items-center justify-between gap-2 px-3 py-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-amber-800"><Gift className="size-3.5" /> {id ? 'HADIAH DIRI' : 'SELF REWARDS'}</h2>
          <button type="button" onClick={onAddReward} className="rounded border border-amber-300 px-2 py-1 text-[10px] font-bold text-amber-900">{tr(lang, 'btnAddReward')}</button>
        </div>
        <div className="grid gap-2 p-4">
          {player.rewards.map((reward) => (
            <article key={reward.id} className="space-y-1.5 rounded border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-start justify-between gap-2 text-xs"><h3 className="font-bold">{reward.name}</h3><span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900">{reward.cost} CR</span></div>
              <p className="text-[11px] text-slate-600">{reward.desc}</p>
              <button type="button" onClick={() => onBuyReward(reward.id)}
                className="rounded bg-amber-700 px-2 py-1 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-600"
                disabled={player.gold < reward.cost}>{id ? 'Tukar hadiah' : 'Redeem reward'}</button>
            </article>
          ))}
        </div>
      </section>
      <PromoNewsPanel lang={lang} />
      <section className="anime-panel overflow-hidden">
        <div className="blender-bar px-3 py-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-sky-800"><Compass className="size-3.5" /> {id ? 'PELUANG & UPGRADE DIRI' : 'GROWTH OPPORTUNITIES'}</h2>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs leading-relaxed text-slate-600">{id ? 'Langkah berikutnya berdasarkan riwayat aktivitas, skill, dan tahap yang sudah kamu lewati.' : 'Next steps based on your activity history, skills, and completed milestones.'}</p>
          {actions.map((item) => {
            const alreadyAdded = player.quests.some((quest) => !quest.completed && quest.title === item.actionTask.slice(0, 140));
            return <article key={item.id} className="space-y-1.5 rounded border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[10px] font-bold text-sky-800">{item.tag}</p>
              <h3 className="text-xs font-bold leading-snug">{item.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600">{item.summary}</p>
              <button type="button" onClick={() => onAddAction(item)} disabled={alreadyAdded}
                className="rounded bg-slate-900 px-2 py-1.5 text-[11px] font-bold text-white disabled:bg-slate-200 disabled:text-slate-600">
                {alreadyAdded ? (id ? 'Ada di daftar tugas' : 'Already in tasks') : (id ? 'Jadikan tugas' : 'Add to tasks')}
              </button>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
