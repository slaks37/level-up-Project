import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Activity, BookOpen, Camera, ClipboardList, ImagePlus, Moon, Sparkles, UserRound, Utensils } from 'lucide-react';
import { ModalShell } from './Modals';
import type { CoinEconomyConfig, Language, PlayerProfile } from '../types';
import type { CheckInInput, DailyEvidence, DayPhase, Mood } from '../engine/journal';
import type { DailyReflection } from '../engine/reflection';
import { buildCapturedTargetPlan } from '../engine/coaching';
import { DEFAULT_COIN_ECONOMY } from '../engine/science';
import { deleteAvatarPhoto, loadAvatarPhoto, saveAvatarPhoto } from '../services/avatarStorage';
import { imageForLocalJournal } from '../services/localPhoto';
import { tr } from '../data/i18n';

const COLUMNS = 'grid grid-cols-3 gap-2 text-center';
const INPUT = 'w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900';
const BUTTON = 'rounded border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-100';

export const MEALS = {
  '': { id: 'Belum dicatat', en: 'Not logged' },
  skipped: { id: 'Ada waktu makan yang terlewat', en: 'Missed a meal' },
  partial: { id: 'Sudah makan, porsi belum beragam', en: 'Ate, with limited variety' },
  varied: { id: 'Makanan pokok, lauk, sayur atau buah', en: 'Staple, protein, and vegetables or fruit' },
};
const ENERGY = {
  '': { id: 'Belum dicatat', en: 'Not logged' },
  fresh: { id: 'Segar', en: 'Fresh' },
  steady: { id: 'Biasa saja', en: 'Steady' },
  tired: { id: 'Lelah', en: 'Tired' },
};
const MOODS: Record<Mood, Record<Language, string>> = {
  '': { id: 'Pilih kalau ingin berbagi', en: 'Choose if you feel like sharing' },
  calm: { id: 'Tenang', en: 'Calm' },
  hopeful: { id: 'Penuh harapan', en: 'Hopeful' },
  grateful: { id: 'Bersyukur', en: 'Grateful' },
  anxious: { id: 'Cemas', en: 'Anxious' },
  overwhelmed: { id: 'Kewalahan', en: 'Overwhelmed' },
  sad: { id: 'Sedih', en: 'Sad' },
  mixed: { id: 'Campur aduk', en: 'Mixed' },
  neutral: { id: 'Biasa saja', en: 'Neutral' },
};

export function DailyReflectionCard({ reflection, lang, compact = false }: {
  reflection: DailyReflection; lang: Language; compact?: boolean;
}) {
  const id = lang === 'id';
  return <section className={compact ? 'rounded-lg border border-indigo-200 bg-indigo-50/70' : 'anime-panel overflow-hidden border-indigo-200'}>
    <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-4 py-2.5 text-indigo-950">
      <BookOpen aria-hidden="true" className="size-4 shrink-0 text-indigo-700" />
      <h2 className="font-hud text-sm font-bold">{id ? 'Renungan hari ini' : 'Today’s reflection'}</h2>
    </div>
    <div className={`grid gap-3 break-words px-4 py-3 text-xs leading-relaxed ${compact ? '' : 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-5'}`}>
      <div className="min-w-0 space-y-2">
        <p className="text-slate-800">{reflection.message}</p>
        <p className="font-semibold text-indigo-950">{reflection.question}</p>
      </div>
      <div className="min-w-0 rounded border border-indigo-100 bg-white px-3 py-2 text-slate-800">
        <h3 className="mb-1 font-bold text-indigo-950">{id ? 'Bahan doa' : 'A prayer for today'}</h3>
        <p>{reflection.prayer}</p>
      </div>
    </div>
  </section>;
}

const mealGroupLabels: Record<string, Record<Language, string>> = {
  staple: { id: 'Makanan pokok', en: 'Staple food' },
  protein: { id: 'Lauk / protein', en: 'Protein food' },
  vegetables: { id: 'Sayur', en: 'Vegetables' },
  fruit: { id: 'Buah', en: 'Fruit' },
};

export function NutritionPanel({ evidence, onOpen, lang }: { evidence: DailyEvidence; onOpen: () => void; lang: Language }) {
  const id = lang === 'id';
  return (
    <section className="anime-panel h-full overflow-hidden">
      <div className="blender-bar flex items-center justify-between gap-2 px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700">
          <Utensils className="size-3.5 text-emerald-700" /> {id ? 'CATATAN MAKAN' : 'MEAL JOURNAL'}
        </h2>
        <button type="button" onClick={onOpen} className={BUTTON}>{id ? 'Catat makan' : 'Log a meal'}</button>
      </div>
      <div className="space-y-3 p-4">
        <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">{evidence.mealNote
          ? (id ? 'Gimana makanannya tadi? Kalau mau, tambahkan foto dan pilih kelompok makanan yang kamu makan.' : 'How was your meal? You can add a photo and select what you ate.')
          : (id ? 'Jangan lupa luangkan waktu untuk makan. Sudah makan apa hari ini? Cerita rasanya juga, kalau mau.' : 'Make time to eat. What have you had today? You can note how it tasted, too.')}</p>
        {evidence.mealNote && <p className="break-words text-xs text-slate-700">{evidence.mealNote}</p>}
        {evidence.mealEnjoyment && <p className="text-xs text-slate-600">{evidence.mealEnjoyment === 'enjoyed'
          ? (id ? 'Rasanya enak' : 'Enjoyed it') : evidence.mealEnjoyment === 'did_not_enjoy'
            ? (id ? 'Kurang suka rasanya' : 'Did not enjoy it') : (id ? 'Rasanya biasa saja' : 'Taste was okay')}</p>}
        {evidence.mealGroups.length > 0 && <div className="flex flex-wrap gap-1">{evidence.mealGroups.map((group) =>
          <span key={group} className="rounded bg-slate-100 px-1.5 py-1 text-[11px] text-slate-700">{mealGroupLabels[group]?.[lang]}</span>)}</div>}
        <p className="text-xs text-slate-600">{id ? 'Tidur semalam' : 'Last night’s sleep'} · {evidence.sleep === null
          ? (id ? 'Belum dicatat' : 'Not logged') : `${evidence.sleep} ${id ? 'jam' : 'hours'}`}</p>
      </div>
    </section>
  );
}

const statusCopy = {
  rest: { icon: '😮‍💨', label: { id: 'Perlu jeda', en: 'Time for a break' }, color: 'bg-amber-50 border-amber-200 text-amber-950' },
  watch: { icon: '🌤️', label: { id: 'Perhatikan pemulihan', en: 'Check your recovery' }, color: 'bg-sky-50 border-sky-200 text-sky-950' },
  steady: { icon: '🙂', label: { id: 'Energi tampak stabil', en: 'Energy looks steady' }, color: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
  unknown: { icon: '📝', label: { id: 'Butuh catatan hari ini', en: 'Add today’s check-in' }, color: 'bg-slate-50 border-slate-200 text-slate-900' },
};

export function BodyConditionPanel({ owner, evidence, phase, lang, coreCharge, onOpen, onBonus }: {
  owner: string; evidence: DailyEvidence; phase: DayPhase; lang: Language; coreCharge: number;
  onOpen: () => void; onBonus: () => void;
}) {
  const id = lang === 'id';
  const [portrait, setPortrait] = useState<Blob>();
  const [url, setUrl] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void loadAvatarPhoto(owner).then((photo) => { if (active) setPortrait(photo); }).catch(() => {});
    return () => { active = false; };
  }, [owner]);
  useEffect(() => {
    if (!portrait) { setUrl(''); return; }
    const next = URL.createObjectURL(portrait);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [portrait]);

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const source = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!source) return;
    setBusy(true);
    setPhotoError(false);
    try {
      const photo = await imageForLocalJournal(source);
      await saveAvatarPhoto(owner, photo);
      setPortrait(photo);
    } catch {
      setPhotoError(true);
    } finally {
      setBusy(false);
    }
  };

  const status = statusCopy[evidence.status];
  const reasons = [
    evidence.energy === 'tired' && (id ? 'Kamu melaporkan rasa lelah.' : 'You reported feeling tired.'),
    evidence.shortSleep && (id ? 'Jam tidur yang dicatat berada di bawah panduan umum usiamu.' : 'Your logged sleep is below the general guidance for your age.'),
    evidence.shortPattern && (id ? 'Beberapa catatan tidur terakhir juga pendek.' : 'Several recent sleep entries were short, too.'),
    evidence.meal === 'skipped' && (id ? 'Ada waktu makan yang terlewat.' : 'You logged a missed meal.'),
    evidence.busyDay && (id ? 'Durasi aktivitas yang tercatat hari ini cukup padat.' : 'You logged a long day of activity.'),
  ].filter(Boolean);
  return (
    <section className="anime-panel flex h-full flex-col overflow-hidden">
      <div className="blender-bar flex items-center justify-between gap-2 px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700"><Activity className="size-3.5 text-orange-700" /> {id ? 'ENERGI HARI INI' : 'TODAY’S ENERGY'}</h2>
        <button type="button" onClick={onOpen} className={BUTTON}>{id ? 'Check-in' : 'Check in'}</button>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <div className={`flex items-start gap-3 rounded-lg border p-3 ${status.color}`}>
          <div className="relative grid size-16 shrink-0 place-items-center rounded-full border border-white bg-white/70 text-slate-500">
            {url ? <img src={url} alt={id ? 'Foto profil' : 'Profile photo'} className="size-full rounded-full object-cover object-top" /> : <UserRound className="size-7" />}
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 text-xl">{status.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="font-hud text-sm font-bold">{status.label[lang]}</p>
            <p className="mt-1 text-xs leading-relaxed">{reasons.join(' ') || (id ? 'Gambaran berdasarkan jam tidur, makan, laporan energi, dan aktivitas yang dicatat.' : 'Based on your logged sleep, meals, activity, and how you feel.')}</p>
          </div>
        </div>
        <div className={COLUMNS}>
          {([[id ? 'Kerja' : 'Work', evidence.work], [id ? 'Belajar' : 'Study', evidence.study], [id ? 'Olahraga' : 'Exercise', evidence.fitness]] as const).map(([label, minutes]) =>
            <div key={label} className="rounded border border-slate-200 bg-slate-50 p-2">
              <p className="text-[10px] text-slate-600">{label}</p><p className="text-xs font-bold">{minutes} {id ? 'mnt' : 'min'}</p>
            </div>)}
        </div>
        {evidence.extra > 0 && <p className="text-xs text-slate-600">{id ? 'Aktivitas tambahan' : 'Extra activity'} · {evidence.extra} {id ? 'mnt' : 'min'}</p>}
        {evidence.recentSleep.length > 0 && <p className="text-xs text-slate-600">{id ? 'Tidur sebelumnya' : 'Previous sleep'} · {evidence.recentSleep.join(' / ')} {id ? 'jam' : 'h'}</p>}
        {phase === 'evening' && evidence.completed.length > 0 && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-950">
            <p className="font-bold">{id ? 'Bagus, ini yang sudah kamu lakukan' : 'Good work, here’s what you did'}</p>
            <ul className="mt-1 list-disc space-y-1 break-words pl-4">{evidence.completed.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
            {evidence.completed.length > 4 && <button className="mt-1 underline" type="button" onClick={onOpen}>{id ? 'Lihat semua aktivitas' : 'See all activity'}</button>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`flex cursor-pointer items-center gap-1 ${BUTTON}`}>
            <ImagePlus className="size-3" />
            {url ? (id ? 'Ganti foto' : 'Change photo') : (id ? 'Pilih foto' : 'Choose photo')}
            <input type="file" accept="image/*" disabled={busy} className="sr-only" onChange={(event) => void choosePhoto(event)} />
          </label>
          <label className={`flex cursor-pointer items-center gap-1 ${BUTTON}`}>
            <Camera className="size-3" />{id ? 'Ambil foto' : 'Take photo'}
            <input type="file" accept="image/*" capture="user" disabled={busy} className="sr-only" onChange={(event) => void choosePhoto(event)} />
          </label>
          {url && <button type="button" disabled={busy} className="text-xs text-slate-700 underline" onClick={() => {
            setBusy(true);
            void deleteAvatarPhoto(owner).then(() => setPortrait(undefined)).catch(() => setPhotoError(true)).finally(() => setBusy(false));
          }}>{id ? 'Hapus foto' : 'Remove photo'}</button>}
        </div>
        {photoError && <p role="alert" className="text-xs text-red-700">{id ? 'Foto belum tersimpan. Coba JPG atau PNG di bawah 20 MB.' : 'Photo not saved. Try JPG or PNG under 20 MB.'}</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-3 text-xs">
        <span className="font-semibold">{tr(lang, 'lblCoreEnergy')} <span className="font-mono">{coreCharge} / 4</span></span>
        <button type="button" onClick={onBonus} className={BUTTON}>{tr(lang, 'btnExtractCore')}</button>
      </div>
    </section>
  );
}

export interface CheckInCaptureOptions {
  captureToTodo: boolean;
  keepDualTrack: boolean;
}

export function DailyCheckInModal({
  name,
  player,
  coinConfig = DEFAULT_COIN_ECONOMY,
  phase,
  lang,
  evidence,
  initial,
  photoKey,
  previewReflection,
  onSave,
  onClose,
}: {
  name: string;
  player: PlayerProfile;
  coinConfig?: CoinEconomyConfig;
  phase: DayPhase;
  lang: Language;
  evidence: DailyEvidence;
  initial?: CheckInInput;
  photoKey: string;
  previewReflection: (input: CheckInInput) => DailyReflection;
  onSave: (input: CheckInInput, options: CheckInCaptureOptions) => void;
  onClose: () => void;
}) {
  const id = lang === 'id';
  const symbol = coinConfig.coinSymbol || 'KOIN';
  const [sleep, setSleep] = useState(String(initial?.sleepHours ?? evidence.sleep ?? ''));
  const [meal, setMeal] = useState(initial?.meal ?? evidence.meal);
  const [mealNote, setMealNote] = useState(initial?.mealNote ?? evidence.mealNote);
  const [mealEnjoyment, setMealEnjoyment] = useState<NonNullable<CheckInInput['mealEnjoyment']>>(initial?.mealEnjoyment || '');
  const [mealGroups, setMealGroups] = useState<string[]>(initial?.mealGroups || evidence.mealGroups);
  const [mealPhoto, setMealPhoto] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [mealPhotoError, setMealPhotoError] = useState(false);
  const [storedPhoto, setStoredPhoto] = useState<Blob>();
  useEffect(() => {
    let active = true;
    void loadAvatarPhoto(photoKey).then((value) => { if (active) setStoredPhoto(value); }).catch(() => {});
    return () => { active = false; };
  }, [photoKey]);
  useEffect(() => {
    if (!storedPhoto) { setMealPhoto(''); return; }
    const url = URL.createObjectURL(storedPhoto);
    setMealPhoto(url);
    return () => URL.revokeObjectURL(url);
  }, [storedPhoto]);

  const [energy, setEnergy] = useState(initial?.energy ?? evidence.energy);
  const [mood, setMood] = useState<Mood>(initial?.mood ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [minutes, setMinutes] = useState(String(initial?.extraMinutes ?? ''));
  const hasPendingTasks = player.quests.some((q) => !q.completed);
  const [captureToTodo, setCaptureToTodo] = useState(
    phase === 'morning' || (phase === 'day' && !hasPendingTasks)
  );
  const [keepDualTrack, setKeepDualTrack] = useState(true);

  const capturedPlan = useMemo(
    () =>
      captureToTodo
        ? buildCapturedTargetPlan(note, player, lang, { includeDualTrackCompanion: keepDualTrack })
        : { userTasks: [], companionTasks: [], allQuestsToAdd: [] },
    [captureToTodo, keepDualTrack, note, player, lang]
  );

  const draft: CheckInInput = {
    sleepHours: sleep === '' ? null : Number(sleep), meal, mealNote: mealNote.trim(), mealEnjoyment, mealGroups,
    energy, mood, note: note.trim(), extraMinutes: phase === 'morning' ? 0 : Number(minutes) || 0,
  };
  const title = phase === 'morning' ? (id ? `Selamat pagi, ${name}` : `Good morning, ${name}`) :
    phase === 'day' ? (id ? `Halo, ${name}` : `Hello, ${name}`) : (id ? `Selamat malam, ${name}` : `Good evening, ${name}`);
  const prompt = phase === 'morning' ? (id ? 'Apa kabar? Apa target yang ingin kamu kerjakan hari ini?' : 'How are you? What targets would you like to complete today?') :
    phase === 'day' ? (id ? 'Bagaimana harimu sejauh ini? Apa target atau aktivitas yang ingin dicatat?' : 'How is your day going? What targets or activities would you like to log?') :
      (id ? 'Terima kasih sudah menjalani hari ini. Apa lagi yang ingin kamu catat atau siapkan?' : 'Well done for showing up today. What else would you like to record or prepare?');
  return (
    <ModalShell title={title} icon={<ClipboardList className="size-4 text-sky-700" />} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        onSave(draft, { captureToTodo, keepDualTrack });
      }}>
        <p className="text-sm text-slate-700">{prompt}</p>
        <label className="block space-y-1 text-xs font-semibold">
          {id ? 'Bagaimana mood kamu hari ini?' : 'How are you feeling today?'}
          <select className={INPUT} value={mood} onChange={(event) => setMood(event.target.value as Mood)}>
            {Object.entries(MOODS).map(([value, copy]) => <option key={value} value={value}>{copy[lang]}</option>)}
          </select>
        </label>
        <DailyReflectionCard reflection={previewReflection(draft)} lang={lang} compact />
        {phase !== 'morning' && (
          <div className="rounded border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
            <p className="font-bold">{id ? 'Yang sudah tercatat hari ini' : 'What you logged today'}</p>
            {evidence.completed.length > 0 ? <ul className="mt-1 list-disc space-y-1 break-words pl-4">{evidence.completed.map((item) => <li key={item}>{item}</li>)}</ul> :
              <p className="mt-1">{evidence.completedCount > 0 || evidence.minutesTotal > 0
                ? (id ? `${evidence.completedCount} tugas · ${evidence.minutesTotal} menit aktivitas` : `${evidence.completedCount} tasks · ${evidence.minutesTotal} active minutes`)
                : (id ? 'Belum ada aktivitas yang tercatat.' : 'No activity logged yet.')}</p>}
          </div>
        )}
        <label className="block space-y-1 text-xs font-semibold">
          <span className="flex items-center gap-1"><Moon className="size-3.5 text-sky-700" />{id ? 'Berapa jam kamu tidur semalam?' : 'How many hours did you sleep last night?'}</span>
          <input type="number" inputMode="decimal" min="0" max="24" step="any" value={sleep} onChange={(event) => setSleep(event.target.value)} className={INPUT} placeholder="7.5" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 text-xs font-semibold"><span id="journal-meal-label">{id ? 'Pola makan hari ini' : 'Meals today'}</span>
            <select aria-labelledby="journal-meal-label" value={meal} onChange={(event) => setMeal(event.target.value as CheckInInput['meal'])} className={INPUT}>
              {Object.entries(MEALS).map(([value, copy]) => <option key={value} value={value}>{copy[lang]}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-semibold"><span id="journal-energy-label">{id ? 'Bagaimana energimu?' : 'How is your energy?'}</span>
            <select aria-labelledby="journal-energy-label" value={energy} onChange={(event) => setEnergy(event.target.value as CheckInInput['energy'])} className={INPUT}>
              {Object.entries(ENERGY).map(([value, copy]) => <option key={value} value={value}>{copy[lang]}</option>)}
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-xs font-semibold">{id ? 'Yang kamu makan (opsional)' : 'What you ate (optional)'}
          <input value={mealNote} maxLength={300} onChange={(event) => setMealNote(event.target.value)} className={INPUT} placeholder={id ? 'Misalnya nasi, ikan, dan sayur' : 'For example rice, fish, and vegetables'} />
        </label>
        <fieldset className="space-y-2 rounded border border-slate-200 p-2.5 text-xs">
          <legend className="px-1 font-semibold">{id ? 'Bagaimana makannya?' : 'How was your meal?'}</legend>
          <label className="block space-y-1"><span>{id ? 'Gimana rasanya?' : 'How did it taste?'}</span>
            <select className={INPUT} value={mealEnjoyment} onChange={(e) => setMealEnjoyment(e.target.value as NonNullable<CheckInInput['mealEnjoyment']>)}>
              <option value="">{id ? 'Lewati' : 'Skip'}</option><option value="enjoyed">{id ? 'Enak' : 'Enjoyed it'}</option><option value="neutral">{id ? 'Biasa saja' : 'Okay'}</option><option value="did_not_enjoy">{id ? 'Kurang suka' : 'Did not enjoy it'}</option>
            </select>
          </label>
          <p>{id ? 'Pilih kelompok makanan yang kamu makan.' : 'Select the groups you ate.'}</p>
          <div className="flex flex-wrap gap-2">{Object.entries(mealGroupLabels).map(([group, label]) => <label key={group} className="flex items-center gap-1">
            <input type="checkbox" checked={mealGroups.includes(group)} onChange={(e) => setMealGroups((list) => e.target.checked ? [...list, group] : list.filter((item) => item !== group))} />{label[lang]}
          </label>)}</div>
          {mealPhoto && <img className="max-h-32 rounded object-contain" src={mealPhoto} alt={id ? 'Foto makanan' : 'Meal photo'} />}
          <div className="flex flex-wrap items-center gap-2">
            <label className={BUTTON + ' cursor-pointer'}>{id ? 'Tambahkan foto makanan' : 'Add meal photo'}
              <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={(e) => {
                const file = e.currentTarget.files?.[0]; e.currentTarget.value = '';
                if (!file) return;
                setPhotoBusy(true); setMealPhotoError(false);
                void imageForLocalJournal(file).then(async (photo) => { await saveAvatarPhoto(photoKey, photo); setStoredPhoto(photo); })
                  .catch(() => setMealPhotoError(true)).finally(() => setPhotoBusy(false));
              }} />
            </label>
            {mealPhoto && <button type="button" className="underline" disabled={photoBusy} onClick={() => {
              setPhotoBusy(true);
              void deleteAvatarPhoto(photoKey).then(() => setStoredPhoto(undefined)).catch(() => setMealPhotoError(true)).finally(() => setPhotoBusy(false));
            }}>{id ? 'Hapus foto makanan' : 'Remove meal photo'}</button>}
          </div>
          <p className="text-slate-600">{id ? 'Foto disimpan di perangkat. Kelompok gizi dicatat sesuai pilihanmu.' : 'Photos stay on this device. Nutrition groups are saved from your selection.'}</p>
          {mealPhotoError && <p role="alert" className="text-red-700">{id ? 'Foto belum bisa disimpan.' : 'The photo could not be saved.'}</p>}
        </fieldset>
        <div className="space-y-2 rounded border border-sky-200 bg-sky-50/70 p-2.5">
          <label className="block space-y-1 text-xs font-semibold text-slate-900">
            <span>
              {phase === 'morning'
                ? (id ? 'Target & rencana hari ini' : 'Today’s targets & plan')
                : (id ? 'Target / aktivitas tambahan di check-in ini' : 'Targets / extra activities in this check-in')}
            </span>
            <textarea
              rows={3}
              maxLength={1500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={INPUT}
              placeholder={
                phase === 'morning'
                  ? (id
                      ? 'Tulis satu target per baris, mis:\nFollow up klien 30 menit\nKerjakan laporan proyek\nWorkout 15 menit'
                      : 'One target per line, e.g.:\nFollow up with client 30m\nFinish project deck\nWorkout 15m')
                  : (id ? 'Tulis satu aktivitas atau target per baris' : 'One activity or target per line')
              }
            />
          </label>
          <div className="space-y-1.5 text-[11px] text-slate-700">
            <label className="flex items-start gap-2 cursor-pointer font-semibold text-sky-950">
              <input
                type="checkbox"
                checked={captureToTodo}
                onChange={(e) => setCaptureToTodo(e.target.checked)}
                className="mt-0.5 accent-sky-700"
              />
              <span>
                {id
                  ? `Masukkan otomatis ke Tugas Harian (To-Do List) — tetap dapat +EXP & +${coinConfig.pointPerTask} ${symbol} saat diselesaikan`
                  : `Automatically add to Daily Tasks (To-Do List) — earns +EXP & +${coinConfig.pointPerTask} ${symbol} when completed`}
              </span>
            </label>
            {captureToTodo && (
              <label className="flex items-start gap-2 cursor-pointer pl-5 text-slate-700">
                <input
                  type="checkbox"
                  checked={keepDualTrack}
                  onChange={(e) => setKeepDualTrack(e.target.checked)}
                  className="mt-0.5 accent-orange-600"
                />
                <span>
                  {id
                    ? 'Jalankan 2 jalur sekaligus: Karier tetap jalan & 1 langkah kecil Peta Impian otomatis disiapkan'
                    : 'Run both tracks together: keep Career moving & auto-pair 1 small Dream Roadmap step'}
                </span>
              </label>
            )}
          </div>
          {captureToTodo && (capturedPlan.userTasks.length > 0 || capturedPlan.companionTasks.length > 0) && (
            <div className="rounded border border-sky-200 bg-white p-2 space-y-1.5 text-[11px]">
              <p className="font-bold text-sky-900 flex items-center gap-1">
                <Sparkles className="size-3.5 text-orange-500" />
                {id
                  ? `${capturedPlan.allQuestsToAdd.length} tugas siap masuk ke Tugas Harian:`
                  : `${capturedPlan.allQuestsToAdd.length} tasks ready for your Daily To-Do List:`}
              </p>
              <ul className="space-y-1">
                {[...capturedPlan.userTasks, ...capturedPlan.companionTasks].map((item) => {
                  const badge =
                    item.track === 'dream'
                      ? { label: id ? '🎯 IMPIAN' : '🎯 DREAM', cls: 'bg-orange-100 text-orange-900' }
                      : item.track === 'fitness'
                        ? { label: '💪 WORKOUT', cls: 'bg-emerald-100 text-emerald-900' }
                        : item.track === 'study'
                          ? { label: id ? '📚 BELAJAR' : '📚 STUDY', cls: 'bg-indigo-100 text-indigo-900' }
                          : { label: id ? '💼 KARIER' : '💼 CAREER', cls: 'bg-sky-100 text-sky-900' };
                  const coinVal = item.quest.category === 'FITNESS' ? coinConfig.pointPerWorkout : coinConfig.pointPerTask;
                  return (
                    <li key={item.quest.id} className="flex items-start justify-between gap-2 border-t border-slate-100 pt-1">
                      <div className="min-w-0">
                        <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[9px] font-bold mr-1.5 ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {item.autoCompanion && (
                          <span className="inline-block rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] text-slate-600 mr-1.5">
                            {id ? 'otomatis 2 jalur' : 'dual-track'}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900 break-words">{item.quest.title}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-600">
                        {item.quest.defaultQty}{item.quest.unitType === 'REPS' ? 'r' : 'm'} · +{item.quest.exp} EXP · +{coinVal} {symbol}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {phase !== 'morning' && <label className="block space-y-1 text-xs font-semibold">{id ? 'Durasi aktivitas tambahan (menit)' : 'Extra activity duration (minutes)'}
          <input type="number" inputMode="numeric" min="0" max="1440" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className={INPUT} />
        </label>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BUTTON}>{id ? 'Nanti' : 'Later'}</button>
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-900">{id ? 'Simpan check-in' : 'Save check-in'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
