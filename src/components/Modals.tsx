import React, { useId, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Gift,
  PlusCircle,
  RotateCcw,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import type {
  DailyLogEntry,
  Language,
  PlayerProfile,
  Quest,
  QuestCategory,
  QuestUnitType,
  WorkoutFeedback,
} from '../types';
import { computeScientificStatGains } from '../engine/science';

export const ModalShell: React.FC<{
  title: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, icon, maxWidth = 'max-w-lg', onClose, children }) => {
  const titleId = useId();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`anime-panel ${maxWidth} w-full overflow-hidden shadow-2xl`}>
        <div className="blender-bar px-4 py-2 flex items-center justify-between gap-2">
          <span className="font-hud font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 truncate">
            {icon ?? <Terminal className="w-4 h-4 text-sky-600" />}
            <span id={titleId} className="truncate">{title}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-1 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 text-sm text-slate-700 space-y-3 max-h-[82vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// 1. COMPLETE QUEST WITH RPE & SCIENTIFIC PREVIEW
export const CompleteQuestModal: React.FC<{
  player: PlayerProfile;
  quest: Quest;
  lang: Language;
  onConfirm: (qty: number, rpe: number, workout?: WorkoutFeedback) => void;
  onClose: () => void;
}> = ({ player, quest, lang, onConfirm, onClose }) => {
  const [qty, setQty] = useState(quest.defaultQty);
  const [rpe, setRpe] = useState(8);
  const fitness = quest.category === 'FITNESS';
  const id = lang === 'id';
  const [fatigue, setFatigue] = useState<WorkoutFeedback['fatigue'] | ''>('');
  const [pain, setPain] = useState<'yes' | 'no' | ''>('');
  const [sets, setSets] = useState<number[]>(() => quest.workout ? Array(Math.max(1, Math.min(6, Math.round(quest.workout.sets) || 1))).fill(0) : []);
  const actual = quest.workout ? sets.reduce((sum, reps) => sum + reps, 0) : qty;


  const preview = useMemo(
    () => computeScientificStatGains(player, quest, actual, rpe),
    [player, quest, actual, rpe]
  );

  const rpeDesc =
    rpe <= 6
      ? lang === 'id'
        ? 'Ringan / Pemanasan'
        : 'Light / Warm-up'
      : rpe <= 8
        ? lang === 'id'
          ? 'Fokus Optimal (Ideal)'
          : 'Optimal Focus (Sweet Spot)'
        : lang === 'id'
          ? 'Maksimal / Intensif'
          : 'Peak / All-Out Effort';

  return (
    <ModalShell
      title={lang === 'id' ? 'VERIFIKASI TUGAS SELESAI' : 'VERIFY COMPLETED TASK'}
      icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
      onClose={onClose}
    >
      <div className="p-3 rounded bg-slate-50 border border-slate-200">
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
          {quest.category}
        </span>
        <p className="font-hud font-bold text-slate-900 text-sm mt-1">{quest.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">⚡ Skill: {quest.skillTag}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (fitness && (!fatigue || !pain || (actual <= 0 && pain !== 'yes'))) return;
          onConfirm(actual, rpe, fitness && fatigue ? { fatigue, pain: pain === 'yes', setReps: sets.join(',') } : undefined);
        }}
        className="space-y-3"
      >
        {quest.workout ? <fieldset className="space-y-2">
          <legend className="text-xs font-bold">{id ? 'Repetisi aktual per set' : 'Actual repetitions per set'}</legend>
          <p className="text-xs text-slate-600">{id ? 'Rencana' : 'Plan'} · {quest.workout.sets} set × {quest.workout.reps} reps</p>
          <div className="grid grid-cols-3 gap-2">{sets.map((reps, index) => <label key={index} className="block text-xs">
            Set {index + 1}<input type="number" min="0" max="100" inputMode="numeric" value={reps}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" onChange={(event) => {
                const value = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                setSets((current) => current.map((item, at) => at === index ? value : item));
              }} />
          </label>)}</div>
        </fieldset> : <label className="block text-xs font-bold text-slate-700">
          {quest.unitType === 'REPS' ? (id ? 'Repetisi aktual' : 'Actual repetitions') : (id ? 'Durasi aktual (menit)' : 'Actual duration (minutes)')}
          <input type="number" min={fitness ? 0 : 1} max={600} required value={qty}
            onChange={(event) => setQty(Math.max(0, Number(event.target.value) || 0))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>}
        {fitness && <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-xs font-bold">{id ? 'Bagaimana sesi latihanmu?' : 'How did the workout feel?'}</legend>
          <label className="space-y-1 text-xs"><span id="workout-fatigue">{id ? 'Seberapa capek?' : 'How tired?'}</span>
            <select aria-labelledby="workout-fatigue" required className="w-full rounded border border-slate-300 p-2" value={fatigue} onChange={(e) => setFatigue(e.target.value as typeof fatigue)}>
              <option value="">{id ? 'Pilih' : 'Select'}</option><option value="manageable">{id ? 'Masih nyaman' : 'Manageable'}</option><option value="tired">{id ? 'Cukup capek' : 'Tired'}</option><option value="very_tired">{id ? 'Sangat capek' : 'Very tired'}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs"><span id="workout-pain">{id ? 'Ada nyeri baru atau bertambah?' : 'Any new or worsening pain?'}</span>
            <select aria-labelledby="workout-pain" required className="w-full rounded border border-slate-300 p-2" value={pain} onChange={(e) => setPain(e.target.value as typeof pain)}>
              <option value="">{id ? 'Pilih' : 'Select'}</option><option value="no">{id ? 'Tidak' : 'No'}</option><option value="yes">{id ? 'Ya' : 'Yes'}</option>
            </select>
          </label>
          {pain === 'yes' && <p className="rounded bg-amber-50 p-2 text-xs text-amber-950 sm:col-span-2">{id ? 'Hentikan gerakan yang memicu nyeri. Kamu tetap bisa menyimpan catatan sesi ini.' : 'Stop the movement that causes pain. You can still save your session notes.'}</p>}
        </fieldset>}

        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
            <span>
              {lang === 'id' ? 'Tingkat Usaha / Fokus (RPE 5–10)' : 'Effort / Focus Intensity (RPE 5–10)'}
            </span>
            <span className="font-mono text-sky-700">
              RPE {rpe} • {rpeDesc}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={10}
            step={1}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full accent-sky-600"
          />
        </div>

        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
          <div className="flex justify-between font-mono text-[11px] font-bold text-emerald-900">
            <span>{lang === 'id' ? 'PREDIKSI HADIAH ILMIAH:' : 'SCIENTIFIC REWARD PREVIEW:'}</span>
            <span>
              +{preview.expEarned} EXP • +{preview.goldEarned} CR
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
            {preview.gains.str > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                STR +{preview.gains.str}
              </span>
            )}
            {preview.gains.vit > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                VIT +{preview.gains.vit}
              </span>
            )}
            {preview.gains.int > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                INT +{preview.gains.int}
              </span>
            )}
            {preview.gains.agi > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                AGI +{preview.gains.agi}
              </span>
            )}
            {preview.gains.cha > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                CHA +{preview.gains.cha}
              </span>
            )}
          </div>
          <p className="text-[10px] text-emerald-700 font-mono">
            Effort: {preview.intensityFactor}x • Log: +
            {preview.loggedMinutes}m
          </p>
        </div>

        <button
          type="submit"
          disabled={fitness && (!fatigue || !pain || (actual <= 0 && pain !== 'yes'))}
          className="disabled:opacity-50 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase tracking-wider btn-anime"
        >
          {fitness && actual <= 0 ? (id ? 'SIMPAN CATATAN LATIHAN' : 'SAVE WORKOUT NOTES') : (id ? 'KONFIRMASI & KLAIM PROGRES' : 'CONFIRM & CLAIM PROGRESS')}
        </button>
      </form>
    </ModalShell>
  );
};

// 2. SCIENCE & JOURNALS MODAL
export const ScienceModal: React.FC<{ lang: Language; onClose: () => void }> = ({
  lang,
  onClose,
}) => (
  <ModalShell
    title={
      lang === 'id'
        ? 'DASAR JURNAL ILMIAH & RUMUS ANTI-BIAS'
        : 'PEER-REVIEWED FORMULAS & ANTI-BIAS LOGIC'
    }
    icon={<BookOpenCheck className="w-4 h-4 text-sky-600" />}
    onClose={onClose}
  >
    <div className="space-y-3 text-xs leading-relaxed">
      <div className="p-3 rounded bg-slate-50 border border-slate-200">
        <p className="font-bold text-slate-900">
          1. {lang === 'id' ? 'Catatan makan' : 'Meal journal'}
        </p>
        <p className="mt-1 text-slate-600">{lang === 'id'
          ? 'Kelompok makanan, rasa, dan foto membantu kamu mengingat apa yang dimakan.'
          : 'Food groups, taste notes, and meal photos help you remember what you ate.'}</p>
      </div>
      <div className="p-3 rounded bg-slate-50 border border-slate-200">
        <p className="font-bold text-slate-900">2. {lang === 'id' ? 'Durasi tidur dan energi' : 'Sleep duration and energy'}</p>
        <p className="mt-1 text-slate-600">{lang === 'id'
          ? 'Panduan umum tidur berbeda menurut usia. Status energi merangkum catatanmu untuk membantu refleksi harian.'
          : 'General sleep guidance varies with age. Your energy status summarizes your logs for daily reflection.'}</p>
        <a href="https://www.cdc.gov/sleep/about/" target="_blank" rel="noreferrer" className="text-sky-700 underline">CDC · {lang === 'id' ? 'Panduan tidur' : 'Sleep guidance'}</a>
      </div>
      <div className="p-3 rounded bg-slate-50 border border-slate-200">
        <p className="font-bold text-slate-900">
          3. {lang === 'id' ? 'Beban Latihan Fisik & Deliberate Practice' : 'Training Load & Deliberate Practice'}
        </p>
        <p className="text-slate-600 mt-1">
          • <strong>Schoenfeld et al. (2017):</strong>{' '}
          {lang === 'id'
            ? 'Kenaikan STR & VIT dihitung dari volume repetisi, proporsi berat badan, dan tingkat usaha (RPE).'
            : 'STR & VIT growth scale with repetition volume, body weight load, and effort (RPE).'}
        </p>
        <p className="text-slate-600">
          • <strong>Ericsson et al. (1993) & Dunlosky et al. (2013):</strong>{' '}
          {lang === 'id'
            ? 'Kenaikan INT, AGI & pembentukan skill otomatis dihitung dari durasi fokus mendalam dan pengulangan rutin (≥ 3 sesi atau ≥ 120 menit).'
            : 'INT, AGI & automatic permanent skills develop through deliberate focused sessions (≥ 3 sessions or ≥ 120 mins).'}
        </p>
      </div>
    </div>
  </ModalShell>
);

// 3. EDIT BIOMETRICS MODAL
export const EditBioModal: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onSave: (age: number, height: number, weight: number) => void;
  onClose: () => void;
}> = ({ player, lang, onSave, onClose }) => {
  const [age, setAge] = useState(player.age);
  const [height, setHeight] = useState(player.height);
  const [weight, setWeight] = useState(player.weight);

  return (
    <ModalShell
      title={
        lang === 'id'
          ? 'PERBARUI DATA BIOMETRIK (UMUR, TB, BB)'
          : 'UPDATE BIOMETRICS (AGE, HEIGHT, WEIGHT)'
      }
      icon={<Activity className="w-4 h-4 text-emerald-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(age, height, weight);
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Umur' : 'Age'}
            </label>
            <input
              type="number"
              required
              min={13}
              max={85}
              value={age}
              onChange={(e) => setAge(Number(e.target.value) || player.age)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">TB (cm)</label>
            <input
              type="number"
              required
              min={120}
              max={230}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || player.height)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">BB (kg)</label>
            <input
              type="number"
              required
              min={30}
              max={220}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value) || player.weight)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'KALIBRASI ULANG' : 'RECALIBRATE METRICS'}
        </button>
      </form>
    </ModalShell>
  );
};

// 4. EDIT DREAM GOAL, TARGET LEVEL & DAILY BUDGET
export const EditDreamModal: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onSave: (goal: string, targetLevel: number, dailyBudget: number) => void;
  onClose: () => void;
}> = ({ player, lang, onSave, onClose }) => {
  const [goal, setGoal] = useState(player.goal);
  const [targetLevel, setTargetLevel] = useState(player.targetLevel);
  const [dailyBudget, setDailyBudget] = useState(player.dailyBreakdown.total);

  return (
    <ModalShell
      title={lang === 'id' ? 'UBAH IMPIAN & TARGET LEVEL' : 'EDIT DREAM GOAL & TARGET LEVEL'}
      icon={<Compass className="w-4 h-4 text-orange-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!goal.trim()) return;
          onSave(goal.trim(), targetLevel, dailyBudget);
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Impian / Tujuan Utama' : 'Main Dream / Goal'}
          </label>
          <input
            type="text"
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Target Level' : 'Target Level'}
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={targetLevel}
              onChange={(e) => setTargetLevel(Number(e.target.value) || 15)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Durasi Harian (Menit)' : 'Daily Budget (Minutes)'}
            </label>
            <input
              type="number"
              min={60}
              max={480}
              step={15}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value) || 150)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-slate-900 hover:bg-orange-600 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'SIMPAN PERUBAHAN' : 'SAVE CHANGES'}
        </button>
      </form>
    </ModalShell>
  );
};

// 5. ADD DREAM STEP MODAL
export const AddDreamStepModal: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onAdd: (title: string, skillName: string, targetMinutes: number, targetLevel: number) => void;
  onClose: () => void;
}> = ({ player, lang, onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [skillName, setSkillName] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(240);
  const [targetLevel, setTargetLevel] = useState(player.targetLevel);

  return (
    <ModalShell
      title={lang === 'id' ? 'TAMBAH LANGKAH PETA IMPIAN' : 'ADD DREAM ROADMAP STEP'}
      icon={<PlusCircle className="w-4 h-4 text-orange-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAdd(
            title.trim(),
            skillName.trim() || 'Core Mastery',
            Math.max(60, targetMinutes),
            Math.max(2, targetLevel)
          );
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Judul Langkah / Milestone' : 'Milestone Title'}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              lang === 'id'
                ? 'Contoh: Luncurkan portofolio pertama ke 5 klien'
                : 'Example: Launch first portfolio to 5 clients'
            }
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Skill Utama yang Terbentuk' : 'Core Skill Developed'}
          </label>
          <input
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder={lang === 'id' ? 'Contoh: Presentasi & Closing' : 'Example: Client Pitching'}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Target Total Menit' : 'Target Total Minutes'}
            </label>
            <input
              type="number"
              min={60}
              max={2400}
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Number(e.target.value) || 240)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Target Level' : 'Target Level'}
            </label>
            <input
              type="number"
              min={2}
              max={100}
              value={targetLevel}
              onChange={(e) => setTargetLevel(Number(e.target.value) || player.targetLevel)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'TAMBAH KE PETA IMPIAN' : 'ADD TO ROADMAP'}
        </button>
      </form>
    </ModalShell>
  );
};

// 6. ADD CUSTOM QUEST MODAL
export const AddQuestModal: React.FC<{
  player: PlayerProfile;
  lang: Language;
  onAdd: (quest: Quest) => void;
  onClose: () => void;
}> = ({ player, lang, onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<QuestCategory>('CAREER');
  const [unitType, setUnitType] = useState<QuestUnitType>('MINUTES');
  const [defaultQty, setDefaultQty] = useState(45);
  const [skillTag, setSkillTag] = useState('');

  return (
    <ModalShell
      title={lang === 'id' ? 'TAMBAH TUGAS HARIAN BARU' : 'ADD NEW DAILY TASK'}
      icon={<PlusCircle className="w-4 h-4 text-sky-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const activeStep = player.dreamSteps.find((s) => !s.completed);
          onAdd({
            id: `custom_q_${Date.now()}`,
            title: title.trim(),
            category,
            unitType,
            defaultQty: Math.max(5, defaultQty),
            estMinutes: unitType === 'REPS' ? 20 : Math.max(5, defaultQty),
            skillTag: skillTag.trim() || (category === 'FITNESS' ? 'Kebugaran Rutin' : 'Fokus Harian'),
            dreamStepId: category === 'FITNESS' ? null : activeStep?.id ?? null,
            exp: 45,
            gold: 35,
            completed: false,
          });
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Nama Tugas' : 'Task Title'}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              lang === 'id'
                ? 'Contoh: Belajar TypeScript 45 menit / Pull-Up 30 reps'
                : 'Example: Study TypeScript 45 mins / 30 Pull-Ups'
            }
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Kategori' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as QuestCategory)}
              className="w-full px-2.5 py-2 rounded border border-slate-300 text-xs font-bold"
            >
              <option value="STUDY">{lang === 'id' ? 'Belajar' : 'Study'}</option>
              <option value="CAREER">{lang === 'id' ? 'Kerja' : 'Work'}</option>
              <option value="FITNESS">{lang === 'id' ? 'Olahraga' : 'Workout'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'id' ? 'Satuan' : 'Unit'}
            </label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as QuestUnitType)}
              className="w-full px-2.5 py-2 rounded border border-slate-300 text-xs font-bold"
            >
              <option value="MINUTES">{lang === 'id' ? 'Menit' : 'Minutes'}</option>
              <option value="REPS">Reps</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target</label>
            <input
              type="number"
              min={5}
              max={360}
              value={defaultQty}
              onChange={(e) => setDefaultQty(Number(e.target.value) || 30)}
              className="w-full px-2.5 py-2 rounded border border-slate-300 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id'
              ? 'Label Calon Skill (Otomatis jadi Skill Permanen setelah 3x sesi)'
              : 'Skill Tag (Auto-unlocks as Permanent Skill after 3 sessions)'}
          </label>
          <input
            type="text"
            value={skillTag}
            onChange={(e) => setSkillTag(e.target.value)}
            placeholder={lang === 'id' ? 'Contoh: Copywriting / Calisthenics' : 'Example: Copywriting / Calisthenics'}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'SIMPAN TUGAS' : 'SAVE TASK'}
        </button>
      </form>
    </ModalShell>
  );
};

// 7. ADD MANUAL SKILL MODAL
export const AddSkillModal: React.FC<{
  lang: Language;
  onAdd: (name: string, rank: string) => void;
  onClose: () => void;
}> = ({ lang, onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [rank, setRank] = useState('Knight Grade');

  return (
    <ModalShell
      title={lang === 'id' ? 'CATAT SKILL YANG SUDAH DIKUASAI' : 'LOG MASTERED SKILL'}
      icon={<Award className="w-4 h-4 text-purple-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onAdd(name.trim(), rank);
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Nama Skill' : 'Skill Name'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              lang === 'id'
                ? 'Contoh: Public Speaking / Hidroponik NFT'
                : 'Example: Public Speaking / Python Data Analysis'
            }
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Tingkat Penguasaan' : 'Mastery Tier'}
          </label>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-bold"
          >
            <option value="Rutin Terlatih">Rutin Terlatih</option>
            <option value="Knight Grade">Knight Grade (Mahir)</option>
            <option value="Master Grade">Master Grade (Ahli)</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'SIMPAN KE KOLEKSI SKILL' : 'SAVE TO SKILL ARSENAL'}
        </button>
      </form>
    </ModalShell>
  );
};

// 8. ADD SELF-REWARD MODAL
export const AddRewardModal: React.FC<{
  lang: Language;
  onAdd: (name: string, cost: number, desc: string) => void;
  onClose: () => void;
}> = ({ lang, onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [cost, setCost] = useState(100);
  const [desc, setDesc] = useState('');

  return (
    <ModalShell
      title={lang === 'id' ? 'BUAT HADIAH DIRI BARU' : 'CREATE CUSTOM SELF-REWARD'}
      icon={<Gift className="w-4 h-4 text-amber-600" />}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onAdd(
            name.trim(),
            Math.max(10, cost),
            desc.trim() ||
              (lang === 'id' ? 'Hadiah kustom pilihanmu sendiri.' : 'Your custom self-reward.')
          );
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Nama Hadiah' : 'Reward Name'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              lang === 'id' ? 'Contoh: Main Game 1 Jam / Beli Boba' : 'Example: 1 Hr Gaming / Boba Tea'
            }
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Harga Koin (CR)' : 'Coin Cost (CR)'}
          </label>
          <input
            type="number"
            required
            min={10}
            max={5000}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value) || 100)}
            className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {lang === 'id' ? 'Catatan Singkat (Opsional)' : 'Short Description (Optional)'}
          </label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'SIMPAN HADIAH' : 'SAVE REWARD'}
        </button>
      </form>
    </ModalShell>
  );
};

// 10. COMPLETE DAY SUMMARY MODAL
export const CompleteDayModal: React.FC<{
  player: PlayerProfile;
  recentLogs: DailyLogEntry[];
  lang: Language;
  onConfirmCompleteDay: () => void;
  onClose: () => void;
}> = ({ player, recentLogs, lang, onConfirmCompleteDay, onClose }) => {
  const completedCount = player.quests.filter((q) => q.completed).length;
  const totalCount = player.quests.length;
  const qualifiesBonus = completedCount >= 2;
  const totalMinutes =
    player.dailyDurationLog.study +
    player.dailyDurationLog.work +
    player.dailyDurationLog.fitness;

  return (
    <ModalShell
      title={lang === 'id' ? 'REKAP & TUTUP HARI INI' : 'DAILY SUMMARY & COMPLETE DAY'}
      icon={<Sun className="w-4 h-4 text-emerald-600" />}
      onClose={onClose}
    >
      <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <div className="flex justify-between font-bold text-slate-800">
          <span>{lang === 'id' ? 'Tugas Tuntas Hari Ini:' : 'Tasks Completed Today:'}</span>
          <span className="font-mono text-emerald-700">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
          <div className="p-2 rounded bg-white border border-slate-200">
            <span className="text-[9px] text-indigo-700 block font-bold">STUDY</span>
            <strong>{player.dailyDurationLog.study}m</strong>
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <span className="text-[9px] text-sky-700 block font-bold">WORK</span>
            <strong>{player.dailyDurationLog.work}m</strong>
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <span className="text-[9px] text-emerald-700 block font-bold">GYM</span>
            <strong>{player.dailyDurationLog.fitness}m</strong>
          </div>
        </div>
        <p className="text-[11px] text-slate-600">
          {qualifiesBonus
            ? lang === 'id'
              ? `Mantap! Total ${totalMinutes} menit tercatat. Menutup hari ini menambah Streak +1 dan memberikan bonus +40 EXP & +40 CR, lalu menyegarkan daftar tugas untuk besok.`
              : `Awesome! ${totalMinutes} mins logged. Completing the day adds +1 Streak, +40 EXP & +40 CR bonus, and refreshes daily tasks for tomorrow.`
            : lang === 'id'
              ? 'Selesaikan minimal 2 tugas untuk mendapatkan bonus Streak +1 & +40 EXP. Kamu tetap bisa menyegarkan tugas hari ini sekarang.'
              : 'Complete at least 2 tasks to earn the +1 Streak & +40 EXP bonus. You can still reset today’s task board now.'}
        </p>
      </div>

      {recentLogs.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] font-bold text-slate-500 uppercase">
            {lang === 'id' ? 'RIWAYAT HARIAN TERAKHIR:' : 'RECENT DAILY HISTORY:'}
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.dateKey}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 font-mono text-[10px]"
              >
                <span className="font-bold text-slate-800">{log.dateKey}</span>
                <span className="text-slate-600">
                  {log.completedTasks}/{log.totalTasks} tasks •{' '}
                  {log.studyMinutes + log.workMinutes + log.fitnessMinutes}m
                </span>
                <span className="text-orange-700 font-bold">🔥 {log.streakAfter}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded border border-slate-300 text-xs font-bold text-slate-700"
        >
          {lang === 'id' ? 'BATAL' : 'CANCEL'}
        </button>
        <button
          type="button"
          onClick={onConfirmCompleteDay}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase btn-anime"
        >
          {lang === 'id' ? 'SIMPAN LOG & MULAI HARI BARU' : 'SAVE LOG & START NEXT DAY'}
        </button>
      </div>
    </ModalShell>
  );
};

// 11. RESET CONFIRM MODAL
export const ResetConfirmModal: React.FC<{
  lang: Language;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ lang, onConfirm, onClose }) => (
  <ModalShell
    title={lang === 'id' ? 'KONFIRMASI BUAT ULANG PROFIL' : 'CONFIRM PROFILE RESET'}
    icon={<RotateCcw className="w-4 h-4 text-rose-600" />}
    onClose={onClose}
  >
    <p className="text-xs text-slate-700">
      {lang === 'id'
        ? 'Reset ini menghapus progres saat ini dan foto di perangkat ini. Jika sedang login, progres di Cloud juga akan dihapus.'
        : 'This clears your current progress and the photo on this device. If signed in, it also clears your cloud progress.'}
    </p>
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700"
      >
        {lang === 'id' ? 'BATAL' : 'CANCEL'}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold btn-anime"
      >
        {lang === 'id' ? 'YA, RESET SEKARANG' : 'YES, RESET NOW'}
      </button>
    </div>
  </ModalShell>
);
