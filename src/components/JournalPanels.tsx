import { useEffect, useState, type ChangeEvent } from 'react';
import { Activity, Camera, ClipboardList, ImagePlus, Moon, UserRound, Utensils } from 'lucide-react';
import { ModalShell } from './Modals';
import type { Language } from '../types';
import { journalEncouragement, type CheckInInput, type DailyEvidence, type DayPhase } from '../engine/journal';
import { deleteAvatarPhoto, loadAvatarPhoto, saveAvatarPhoto } from '../services/avatarStorage';
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

export function NutritionPanel({ evidence, onOpen, onEditProfile, lang }: { evidence: DailyEvidence; onOpen: () => void; onEditProfile: () => void; lang: Language }) {
  const id = lang === 'id';
  return (
    <section className="anime-panel h-full overflow-hidden">
      <div className="blender-bar flex items-center justify-between gap-2 px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700">
          <Utensils className="size-3.5 text-emerald-700" /> {id ? 'GIZI & PEMULIHAN' : 'NUTRITION & RECOVERY'}
        </h2>
        <button type="button" onClick={onOpen} className={BUTTON}>{id ? 'Isi catatan' : 'Log today'}</button>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-xs leading-relaxed text-slate-600">{id ? 'Mulai dari satu kali makan. Gunakan panduan Isi Piringku untuk menyusun porsi.' : 'Start with one meal. Use the plate guide to plan your portions.'}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-bold text-emerald-950">{id ? '½ sayur & buah' : '½ vegetables & fruit'}</p>
            <p className="mt-1 text-emerald-900">{id ? 'Contoh: bayam dan pepaya.' : 'For example, spinach and papaya.'}</p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <p className="font-bold text-amber-950">{id ? '½ makanan pokok & lauk' : '½ staple & protein'}</p>
            <p className="mt-1 text-amber-900">{id ? 'Contoh: nasi dan tempe atau telur.' : 'For example, rice with tempeh or eggs.'}</p>
          </div>
        </div>
        <dl className="space-y-2 text-xs text-slate-700">
          <div><dt className="font-bold">{id ? 'Pola makan hari ini' : 'Meals today'}</dt><dd>{evidence.meal ? MEALS[evidence.meal][lang] : evidence.mealNote || MEALS[''][lang]}</dd>{evidence.meal && evidence.mealNote && <dd className="whitespace-pre-wrap break-words">{evidence.mealNote}</dd>}</div>
          <div><dt className="font-bold">{id ? 'Tidur terakhir' : 'Last night’s sleep'}</dt><dd>{evidence.sleep === null ? (id ? 'Belum dicatat' : 'Not logged') : `${evidence.sleep} ${id ? 'jam' : 'hours'}`}</dd></div>
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <a className="text-xs font-bold text-sky-700 underline" href="https://ayosehat.kemkes.go.id/isi-piringku-kebutuhan-gizi-harian-seimbang" target="_blank" rel="noreferrer">
            {id ? 'Panduan Isi Piringku · Kemenkes RI' : 'Plate guide · Indonesian Ministry of Health'}
          </a>
          <button type="button" className="text-xs text-slate-700 underline" onClick={onEditProfile}>{tr(lang, 'btnEditBio')}</button>
        </div>
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
      if (source.size > 20 * 1024 * 1024 || (source.type && !source.type.startsWith('image/'))) throw new Error('Photo format');
      const localUrl = URL.createObjectURL(source);
      try {
        const image = new Image();
        image.src = localUrl;
        await image.decode();
        const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const photo = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Photo encoding')), 'image/jpeg', 0.88));
        await saveAvatarPhoto(owner, photo);
        setPortrait(photo);
      } finally {
        URL.revokeObjectURL(localUrl);
      }
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
        <p className="text-xs leading-relaxed text-slate-700">{journalEncouragement(evidence, phase, lang)}</p>
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

export function DailyCheckInModal({ name, phase, lang, evidence, initial, onSave, onClose }: {
  name: string; phase: DayPhase; lang: Language; evidence: DailyEvidence; initial?: CheckInInput;
  onSave: (input: CheckInInput) => void; onClose: () => void;
}) {
  const id = lang === 'id';
  const [sleep, setSleep] = useState(String(initial?.sleepHours ?? evidence.sleep ?? ''));
  const [meal, setMeal] = useState(initial?.meal ?? evidence.meal);
  const [mealNote, setMealNote] = useState(initial?.mealNote ?? evidence.mealNote);
  const [energy, setEnergy] = useState(initial?.energy ?? evidence.energy);
  const [note, setNote] = useState(initial?.note ?? '');
  const [minutes, setMinutes] = useState(String(initial?.extraMinutes ?? ''));
  const title = phase === 'morning' ? (id ? `Selamat pagi, ${name}` : `Good morning, ${name}`) :
    phase === 'day' ? (id ? `Halo, ${name}` : `Hello, ${name}`) : (id ? `Selamat malam, ${name}` : `Good evening, ${name}`);
  const prompt = phase === 'morning' ? (id ? 'Apa kabar? Apa yang ingin kamu kerjakan hari ini?' : 'How are you? What would you like to do today?') :
    phase === 'day' ? (id ? 'Bagaimana harimu sejauh ini? Apa yang sudah kamu lakukan?' : 'How is your day going? What have you done so far?') :
      (id ? 'Terima kasih sudah menjalani hari ini. Apa lagi yang ingin kamu catat?' : 'Well done for showing up today. What else would you like to record?');
  return (
    <ModalShell title={title} icon={<ClipboardList className="size-4 text-sky-700" />} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        onSave({ sleepHours: sleep === '' ? null : Number(sleep), meal, mealNote: mealNote.trim(), energy, note: note.trim(), extraMinutes: phase === 'morning' ? 0 : Number(minutes) || 0 });
      }}>
        <p className="text-sm text-slate-700">{prompt}</p>
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
        <label className="block space-y-1 text-xs font-semibold">
          {phase === 'morning' ? (id ? 'Rencana hari ini' : 'Today’s plan') : (id ? 'Aktivitas tambahan di check-in ini' : 'Extra activities in this check-in')}
          <textarea rows={3} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} className={INPUT} placeholder={id ? 'Tulis satu aktivitas per baris' : 'One activity per line'} />
        </label>
        {phase !== 'morning' && <label className="block space-y-1 text-xs font-semibold">{id ? 'Durasi aktivitas tambahan (menit)' : 'Extra activity duration (minutes)'}
          <input type="number" inputMode="numeric" min="0" max="1440" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className={INPUT} />
        </label>}
        <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{journalEncouragement(evidence, phase, lang)}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BUTTON}>{id ? 'Nanti' : 'Later'}</button>
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-900">{id ? 'Simpan check-in' : 'Save check-in'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
