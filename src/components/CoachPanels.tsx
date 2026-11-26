import { useEffect, useRef, useState } from 'react';
import { Briefcase, CalendarDays, Dumbbell, Flame, UserRound } from 'lucide-react';
import type { CareerProfile, CoinEconomyConfig, GymProfile, Language, PlayerProfile, Quest } from '../types';
import type { DailyEvidence, JournalEntry, LoggedActivity } from '../engine/journal';
import { defaultCareer, defaultGym, getCareerActions, newWorkoutQuest, workoutPlan } from '../engine/coaching';
import { DEFAULT_COIN_ECONOMY, getEffectiveStreak } from '../engine/science';
import { calendarOAuthEnabled, importCalendarFile, connectCalendar, fetchCalendarEvents, prepareGoogleOAuth, revokeCalendarToken, type CalendarEvent } from '../services/googleCalendar';
import { ModalShell } from './Modals';

const field = 'block w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm';
const actionButton = 'rounded border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50';
const saveButton = 'rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800';

export function CareerFields({ value, onChange, lang, includeProject = true }: {
  value: CareerProfile; onChange: (value: CareerProfile) => void; lang: Language; includeProject?: boolean;
}) {
  const id = lang === 'id';
  return <div className="grid gap-2 sm:grid-cols-2">
    <label className="space-y-1 text-xs font-semibold">{id ? 'Bidang perusahaan' : 'Company industry'}
      <input className={field} value={value.industry} maxLength={100} placeholder={id ? 'Mis. edutech, ritel, kesehatan' : 'E.g. edtech, retail, healthcare'} onChange={(e) => onChange({ ...value, industry: e.target.value })} />
    </label>
    <label className="space-y-1 text-xs font-semibold">{id ? 'Tanggung jawab utama' : 'Main responsibilities'}
      <textarea rows={2} className={field} value={value.responsibilities} maxLength={500} onChange={(e) => onChange({ ...value, responsibilities: e.target.value })} />
    </label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.managesTeam} onChange={(e) => onChange({ ...value, managesTeam: e.target.checked })} />{id ? 'Saya mengelola tim' : 'I manage a team'}</label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.usesSprints} onChange={(e) => onChange({ ...value, usesSprints: e.target.checked })} />{id ? 'Tim saya bekerja dengan sprint' : 'My team uses sprints'}</label>
    {includeProject && <>
      <label className="space-y-1 text-xs font-semibold">{id ? 'Proyek aktif atau proyek baru' : 'Current or new project'}
        <input className={field} maxLength={120} value={value.project} onChange={(e) => onChange({ ...value, project: e.target.value })} />
      </label>
      <label className="space-y-1 text-xs font-semibold">{id ? 'Status proyek' : 'Project status'}
        <select className={field} value={value.projectStatus} onChange={(e) => onChange({ ...value, projectStatus: e.target.value as CareerProfile['projectStatus'] })}>
          <option value="planning">{id ? 'Direncanakan' : 'Planning'}</option><option value="in_progress">{id ? 'Dikerjakan' : 'In progress'}</option>
          <option value="blocked">{id ? 'Terhambat' : 'Blocked'}</option><option value="done">{id ? 'Selesai' : 'Done'}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold">{id ? 'Hasil rapat terakhir' : 'Last meeting outcome'}
        <textarea rows={2} className={field} maxLength={300} value={value.lastMeeting} onChange={(e) => onChange({ ...value, lastMeeting: e.target.value })} />
      </label>
      <label className="space-y-1 text-xs font-semibold">{id ? 'Tindak lanjut berikutnya' : 'Next action'}
        <input className={field} maxLength={140} value={value.nextAction} onChange={(e) => onChange({ ...value, nextAction: e.target.value })} />
      </label>
    </>}
  </div>;
}

export function GymFields({ value, onChange, lang }: {
  value: GymProfile; onChange: (value: GymProfile) => void; lang: Language;
}) {
  const id = lang === 'id';
  return <div className="grid gap-2 sm:grid-cols-2">
    <label className="space-y-1 text-xs font-semibold">{id ? 'Tujuan latihan' : 'Training goal'}
      <select className={field} value={value.goal} onChange={(e) => onChange({ ...value, goal: e.target.value as GymProfile['goal'] })}>
        <option value="general">{id ? 'Aktif dan bugar' : 'General fitness'}</option><option value="strength">{id ? 'Lebih kuat' : 'Strength'}</option><option value="endurance">{id ? 'Daya tahan' : 'Endurance'}</option>
      </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">{id ? 'Pengalaman' : 'Experience'}
      <select className={field} value={value.level} onChange={(e) => onChange({ ...value, level: e.target.value as GymProfile['level'] })}>
        <option value="beginner">{id ? 'Baru mulai' : 'Beginner'}</option><option value="regular">{id ? 'Sudah rutin' : 'Train regularly'}</option>
      </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">{id ? 'Tempat latihan' : 'Training location'}
      <select className={field} value={value.equipment} onChange={(e) => onChange({ ...value, equipment: e.target.value as GymProfile['equipment'] })}>
        <option value="home">{id ? 'Rumah, alat minimal' : 'Home, minimal equipment'}</option><option value="gym">Gym</option>
      </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">{id ? 'Target hari aktif per minggu' : 'Active days per week'}
      <select className={field} value={value.days} onChange={(e) => onChange({ ...value, days: Number(e.target.value) })}>
        {[1, 2, 3, 4, 5].map((day) => <option key={day}>{day}</option>)}
      </select>
    </label>
    <label className="space-y-1 text-xs font-semibold sm:col-span-2">{id ? 'Gerakan yang perlu dihindari (bila ada)' : 'Movements to avoid (if any)'}
      <input className={field} maxLength={300} value={value.limitations} onChange={(e) => onChange({ ...value, limitations: e.target.value })} />
    </label>
    <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={value.currentPain} onChange={(e) => onChange({ ...value, currentPain: e.target.checked })} />
      {id ? 'Saat ini ada nyeri yang mengganggu gerak' : 'I currently have pain that affects movement'}
    </label>
  </div>;
}

export function CoachSetupModal({ section, player, lang, onSave, onClose }: {
  section: 'career' | 'gym'; player: PlayerProfile; lang: Language;
  onSave: (input: { profession?: string; career?: CareerProfile; gym?: GymProfile }) => void; onClose: () => void;
}) {
  const id = lang === 'id';
  const [profession, setProfession] = useState(player.profession);
  const [career, setCareer] = useState(player.career || defaultCareer);
  const [gym, setGym] = useState(player.gym || defaultGym);
  return <ModalShell title={section === 'gym' ? (id ? 'Profil latihan' : 'Workout profile') : (id ? 'Profil kerja & proyek' : 'Work and project profile')}
    icon={section === 'gym' ? <Dumbbell className="size-4" /> : <UserRound className="size-4" />} onClose={onClose}>
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      if (section === 'gym') onSave({ gym });
      else if (profession.trim()) onSave({ profession: profession.trim(), career: {
        ...career, industry: career.industry.trim(), responsibilities: career.responsibilities.trim(),
        project: career.project.trim(), lastMeeting: career.lastMeeting.trim(), nextAction: career.nextAction.trim(),
      } });
    }}>
      {section === 'career' ? <>
        <label className="block space-y-1 text-xs font-semibold">{id ? 'Jabatan' : 'Job title'}
          <input className={field} required maxLength={160} value={profession} onChange={(e) => setProfession(e.target.value)} />
        </label>
        <CareerFields value={career} onChange={setCareer} lang={lang} />
      </> : <GymFields value={gym} onChange={setGym} lang={lang} />}
      <div className="flex justify-end"><button type="submit" className={saveButton}>{id ? 'Simpan profil' : 'Save profile'}</button></div>
    </form>
  </ModalShell>;
}

function CalendarPanel({ owner, lang, onTask, onAgenda, onCalendarSynced }: {
  owner: string;
  lang: Language;
  onTask: (title: string) => void;
  onAgenda: (owner: string, events: CalendarEvent[]) => void;
  onCalendarSynced?: (source: 'google_oauth' | 'ics' | 'none', events: CalendarEvent[]) => void;
}) {
  const id = lang === 'id';
  const activeToken = useRef('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const cacheKey = 'levelup_calendar_import:' + owner;
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item) => item && typeof item.title === 'string' && typeof item.start === 'string').slice(0, 100) : [];
    } catch { return []; }
  });
  const [imported, setImported] = useState(events.length > 0);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => onAgenda(owner, events), [owner, events, onAgenda]);
  useEffect(() => {
    if (!events.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [events.length]);

  useEffect(() => {
    if (!calendarOAuthEnabled) return;
    void prepareGoogleOAuth().catch(() => {});
  }, []);
  const refresh = async (token: string) => {
    const result = await fetchCalendarEvents(token);
    if (activeToken.current !== token) return;
    setEvents(result);
    setImported(false);
    setConnected(true);
    onCalendarSynced?.('google_oauth', result);
  };
  const authorize = async () => {
    setBusy(true);
    setError('');
    try {
      const token = activeToken.current || await connectCalendar();
      activeToken.current = token;
      await refresh(token);
    } catch (err) {
      activeToken.current = '';
      setConnected(false);
      const code = err instanceof Error ? err.message : '';
      if (code === 'GOOGLE_POPUP_CLOSED') {
        setError(id ? 'Jendela login Google ditutup sebelum selesai. Klik Hubungkan Google Calendar untuk mencoba lagi.' : 'Google sign-in popup closed. Click Connect Google Calendar to try again.');
      } else if (code === 'GOOGLE_CALENDAR_SCOPE_REQUIRED') {
        setError(id ? 'Centang izin baca Google Calendar pada layar persetujuan Google, lalu hubungkan lagi.' : 'Please allow Google Calendar read permission on the consent screen and reconnect.');
      } else if (code === 'GOOGLE_OAUTH_UNCONFIGURED') {
        setError(id ? 'Client ID Google OAuth belum dikonfigurasi pada aplikasi.' : 'Google OAuth Client ID is not configured.');
      } else if (code === 'GOOGLE_SESSION_EXPIRED') {
        setError(id ? 'Sesi Google Calendar berakhir. Klik Hubungkan ulang.' : 'Google Calendar session expired. Please reconnect.');
      } else {
        setError(id ? 'Agenda belum bisa dibaca. Pastikan pop-up diizinkan dan izin Google Calendar disetujui, lalu coba hubungkan lagi.' : 'Could not read your agenda. Ensure popups are allowed and Google consent is granted, then reconnect.');
      }
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!connected) return;
    const interval = window.setInterval(() => {
      if (activeToken.current) void refresh(activeToken.current).catch(() => {
        activeToken.current = '';
        setConnected(false);
        setEvents([]);
        setError(id ? 'Sesi Calendar berakhir. Hubungkan ulang untuk melihat agenda.' : 'Calendar session ended. Reconnect to see your agenda.');
      });
    }, 180000);
    return () => window.clearInterval(interval);
  }, [connected, id]);

  const endTime = (event: CalendarEvent) => Date.parse(event.allDay ? event.end + 'T00:00:00' : event.end);
  const startTime = (event: CalendarEvent) => Date.parse(event.allDay ? event.start + 'T00:00:00' : event.start);
  const nearest = events.filter((event) => endTime(event) >= now && startTime(event) <= now + 7 * 86400000).slice(0, 5);
  const last = events.filter((event) => !event.allDay && endTime(event) < now && endTime(event) >= now - 7 * 86400000).at(-1);
  const displayDate = (event: CalendarEvent) => event.allDay ? event.start : new Date(event.start).toLocaleString(id ? 'id-ID' : 'en-GB', { dateStyle:'medium', timeStyle:'short' });
  return <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1 font-bold"><CalendarDays className="size-4 text-sky-700" /> Google Calendar</p>
      {connected && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">{id ? 'TERHUBUNG' : 'CONNECTED'}</span>}
    </div>
    <p className="text-slate-600">{id ? 'Hubungkan langsung ke Google Calendar untuk melihat agenda 7 hari ke depan dan membuat tugas persiapan rapat.' : 'Connect directly to Google Calendar to view the next 7 days and create meeting prep tasks.'}</p>
    <div className="flex flex-wrap items-center gap-2">
      {calendarOAuthEnabled && (
        <button
          type="button"
          className="rounded bg-sky-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50 transition"
          disabled={busy}
          onClick={() => void authorize()}
        >
          {busy
            ? (id ? 'Menghubungkan…' : 'Connecting…')
            : connected
              ? (id ? 'Muat ulang agenda' : 'Refresh agenda')
              : (id ? 'Hubungkan Google Calendar' : 'Connect Google Calendar')}
        </button>
      )}
      <label className={actionButton + ' cursor-pointer'}>
        {id ? 'Impor agenda .ics' : 'Import .ics agenda'}
        <input className="sr-only" type="file" accept=".ics,text/calendar" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          setError('');
          void importCalendarFile(file).then((result) => {
            activeToken.current = ''; setConnected(false); setEvents(result); setImported(true);
            try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* Keep the in-session import. */ }
            onCalendarSynced?.('ics', result);
          }).catch(() => setError(id ? 'File kalender belum bisa dibuka. Pilih file .ics dari hasil ekspor.' : 'Calendar file could not be read. Choose an exported .ics file.'));
        }} />
      </label>
      {imported && <button className="underline" type="button" onClick={() => { setImported(false); setEvents([]); try { localStorage.removeItem(cacheKey); } catch { /* Storage unavailable. */ } onCalendarSynced?.('none', []); }}>{id ? 'Bersihkan agenda' : 'Clear agenda'}</button>}
      {connected && <button type="button" className="underline" onClick={() => {
        if (activeToken.current) revokeCalendarToken(activeToken.current);
        activeToken.current = ''; setConnected(false); setEvents([]); setError('');
        onCalendarSynced?.('none', []);
      }}>{id ? 'Putuskan' : 'Disconnect'}</button>}
    </div>
    {error && <p role="status" className="text-amber-900">{error}</p>}
    {last && <div className="rounded border border-slate-200 bg-white p-2">
      <p>{id ? 'Agenda terakhir' : 'Last event'} · <strong>{last.title || (id ? 'Tanpa judul' : 'Untitled')}</strong></p>
      <button type="button" className="text-sky-800 underline" onClick={() => onTask((id ? 'Tinjau keputusan & tindak lanjut: ' : 'Review decisions and follow-up: ') + last.title)}>{id ? 'Catat tindak lanjut' : 'Add follow-up'}</button>
    </div>}
    {(connected || imported) && nearest.length === 0 && <p>{id ? 'Tidak ada agenda dalam tujuh hari ke depan.' : 'No events in the next seven days.'}</p>}
    {nearest.map((event) => <div key={event.id + event.start} className="space-y-1 rounded border border-slate-200 bg-white p-2">
      <p className="font-semibold">{event.title || (id ? 'Agenda tanpa judul' : 'Untitled event')}</p><p>{displayDate(event)}</p>
      {Date.parse(event.start) - now < 3600000 && !event.allDay && <p className="font-bold text-amber-900">{id ? 'Mulai dalam waktu dekat' : 'Coming up soon'}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="text-sky-800 underline" onClick={() => onTask((id ? 'Siapkan bahan dan keputusan untuk ' : 'Prepare notes and decisions for ') + event.title)}>{id ? 'Jadikan tugas persiapan' : 'Add prep task'}</button>
        {event.link && <a href={event.link} target="_blank" rel="noreferrer" className="text-sky-800 underline">{id ? 'Buka agenda' : 'Open event'}</a>}
      </div>
    </div>)}
  </div>;
}

export function CareerCoach({ owner, player, lang, records, onEdit, onAdd, onAgenda, onCalendarSynced }: {
  owner: string; player: PlayerProfile; lang: Language; records: JournalEntry[]; onEdit: () => void; onAdd: (title: string) => void;
  onAgenda: (owner: string, events: CalendarEvent[]) => void;
  onCalendarSynced?: (source: 'google_oauth' | 'ics' | 'none', events: CalendarEvent[]) => void;
}) {
  const id = lang === 'id';
  const work = player.career;
  const recent = records.filter((entry): entry is LoggedActivity => entry.kind === 'activity' && entry.category === 'CAREER').slice(0, 3);
  const statuses = id ? { planning: 'Direncanakan', in_progress: 'Dikerjakan', blocked: 'Terhambat', done: 'Selesai' } : { planning: 'Planning', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' };
  return <section className="anime-panel overflow-hidden">
    <div className="blender-bar flex items-center justify-between gap-2 px-3 py-2">
      <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><Briefcase className="size-4 text-sky-700" />{id ? 'ASISTEN KERJA & PROYEK' : 'WORK & PROJECT COACH'}</h2>
      <button type="button" className={actionButton} onClick={onEdit}>{id ? 'Kerja & proyek' : 'Work & projects'}</button>
    </div>
    <div className="space-y-3 p-3 text-xs">
      <div><p className="font-bold">{player.profession}{work?.industry ? ' · ' + work.industry : ''}</p>
        {work?.responsibilities && <p className="mt-1 break-words text-slate-600">{work.responsibilities}</p>}
        {work?.project && <p className="mt-1 break-words"><strong>{work.project}</strong> · {statuses[work.projectStatus]}</p>}
        {work?.lastMeeting && <p className="mt-1 break-words">{id ? 'Rapat terakhir' : 'Last meeting'} · {work.lastMeeting}</p>}
      </div>
      <div className="space-y-1.5">{getCareerActions(player, lang).map((title) => <div key={title} className="flex items-start justify-between gap-2 rounded border border-slate-200 p-2">
        <p className="break-words">{title}</p><button className={actionButton + ' shrink-0'} type="button" onClick={() => onAdd(title)}>{id ? 'Jadikan tugas' : 'Add task'}</button>
      </div>)}</div>
      {recent.length > 0 && <div><p className="font-bold">{id ? 'Pekerjaan tercatat terakhir' : 'Recent work logged'}</p>
        <ul className="list-disc space-y-1 pl-4">{recent.map((entry) => <li key={entry.id}>{entry.title} · {entry.dateKey}</li>)}</ul></div>}
      <CalendarPanel owner={owner} lang={lang} onTask={onAdd} onAgenda={onAgenda} onCalendarSynced={onCalendarSynced} />
    </div>
  </section>;
}

export function GymCoach({ player, lang, evidence, records, coinConfig = DEFAULT_COIN_ECONOMY, onEdit, onAdd, onCompleteQuest }: {
  player: PlayerProfile;
  lang: Language;
  evidence: DailyEvidence;
  records: JournalEntry[];
  coinConfig?: CoinEconomyConfig;
  onEdit: () => void;
  onAdd: (quest: Quest) => void;
  onCompleteQuest?: (quest: Quest) => void;
}) {
  const id = lang === 'id';
  const plan = workoutPlan(player, evidence, records, lang);
  const latest = records.find((entry): entry is LoggedActivity => entry.kind === 'activity' && !!entry.workout);
  const workoutStreak = getEffectiveStreak(player.workoutStreak, player.lastWorkoutStreakDate);
  const bestWorkoutStreak = Math.max(workoutStreak, player.longestWorkoutStreak ?? 0);
  return <section className="anime-panel overflow-hidden">
    <div className="blender-bar flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold"><Dumbbell className="size-4 text-emerald-700" />{id ? 'PROGRAM LATIHAN' : 'WORKOUT PROGRAM'}</h2>
        <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-orange-800" title={id ? `Rekor terbaik: ${bestWorkoutStreak} hari` : `Best streak: ${bestWorkoutStreak} days`}>
          <Flame className="size-3 text-orange-600" />
          {workoutStreak} {id ? 'HARI' : 'D'}
        </span>
      </div>
      <button type="button" className={actionButton} onClick={onEdit}>{id ? 'Profil latihan' : 'Workout profile'}</button>
    </div>
    <div className="space-y-2 p-3 text-xs">
      {plan ? <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold">{id ? `Target ${plan.weekly} hari aktif per minggu` : `Aim for ${plan.weekly} active days per week`}</p>
            <p className="text-slate-600">{id ? `${plan.activeDays} hari latihan tercatat minggu ini` : `${plan.activeDays} active days logged this week`}</p>
          </div>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[10px] font-bold text-emerald-800">
            +{coinConfig.pointPerWorkout} {coinConfig.coinSymbol} / {id ? 'latihan' : 'workout'}
          </span>
        </div>
        <p role="status" className="rounded bg-emerald-50 p-2 text-emerald-950">{plan.readinessText}</p>
        <p className="text-slate-600">{id ? 'Sisakan hari pemulihan di antara sesi kekuatan. Catat set, repetisi, capek, dan nyeri setelah latihan — setiap sesi menjaga streak workout kamu.' : 'Leave recovery days between strength sessions. Log sets, reps, fatigue and pain afterward — every session builds your workout streak.'}</p>
        {plan.exercises.map((item) => {
          const existing = player.quests.find((quest) => quest.category === 'FITNESS' && quest.title === item.title);
          return <div key={item.title} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2">
            <div><p className="font-bold">{item.title}</p><p>{item.sets ? `${item.sets} set × ${item.reps} reps` : `${item.minutes} ${id ? 'menit' : 'minutes'}`}</p></div>
            {existing ? (
              existing.completed ? (
                <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                  {id ? '✓ Selesai' : '✓ Done'}
                </span>
              ) : onCompleteQuest ? (
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  onClick={() => onCompleteQuest(existing)}
                >
                  {id ? 'Selesai latihan' : 'Log workout'}
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500">{id ? 'Sudah di daftar' : 'Already listed'}</span>
              )
            ) : (
              <button type="button" className={actionButton} onClick={() => onAdd(newWorkoutQuest(item))}>
                {id ? 'Tambah latihan' : 'Add exercise'}
              </button>
            )}
          </div>;
        })}
        {latest?.workout && <p className="break-words text-slate-600">{id ? 'Sesi terakhir' : 'Last session'} · {latest.title}{latest.workout.setReps ? ' · ' + latest.workout.setReps.split(',').join(' / ') + ' reps' : ''}</p>}
      </> : <p>{id ? 'Isi profil latihan agar menu disesuaikan dengan tujuan, pengalaman, dan alatmu.' : 'Fill in your workout profile to tailor exercises to your goals, experience, and equipment.'}</p>}
    </div>
  </section>;
}
