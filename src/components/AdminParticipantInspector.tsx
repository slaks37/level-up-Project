import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Coins,
  Compass,
  Download,
  Dumbbell,
  Flame,
  Loader2,
  NotebookPen,
  RefreshCw,
  Save,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  CoinEconomyConfig,
  Language,
  UserAccountRecord,
} from '../types';
import {
  adjustParticipantCoinsByAdmin,
  type ParticipantFullRecord,
} from '../services/firebaseService';
import { analyzeParticipantHabits } from '../engine/analytics';
import type { CheckIn, LoggedActivity } from '../engine/journal';

interface AdminParticipantInspectorProps {
  user: UserAccountRecord;
  record: ParticipantFullRecord | null;
  loading: boolean;
  lang: Language;
  coinConfig: CoinEconomyConfig;
  adminUser: User;
  canEditCoins: boolean;
  onRefresh: () => Promise<void>;
  onCoinUpdated: (uid: string, nextBalance: number) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onClose: () => void;
}

type InspectorTab = 'habits' | 'journal' | 'tasks' | 'dailyLogs' | 'coins';

const MEAL_LABELS: Record<string, Record<Language, string>> = {
  varied: { id: 'Beragam (pokok + lauk + sayur/buah)', en: 'Varied' },
  partial: { id: 'Kurang beragam', en: 'Limited variety' },
  skipped: { id: 'Ada jam makan terlewat', en: 'Missed meal' },
  '': { id: '-', en: '-' },
};

const ENERGY_LABELS: Record<string, Record<Language, string>> = {
  fresh: { id: 'Segar', en: 'Fresh' },
  steady: { id: 'Biasa saja', en: 'Steady' },
  tired: { id: 'Lelah', en: 'Tired' },
  '': { id: '-', en: '-' },
};

const MOOD_LABELS: Record<string, Record<Language, string>> = {
  calm: { id: 'Tenang', en: 'Calm' },
  hopeful: { id: 'Penuh harapan', en: 'Hopeful' },
  grateful: { id: 'Bersyukur', en: 'Grateful' },
  anxious: { id: 'Cemas', en: 'Anxious' },
  overwhelmed: { id: 'Kewalahan', en: 'Overwhelmed' },
  sad: { id: 'Sedih', en: 'Sad' },
  mixed: { id: 'Campur aduk', en: 'Mixed' },
  neutral: { id: 'Biasa saja', en: 'Neutral' },
  '': { id: '-', en: '-' },
};

const PHASE_LABELS: Record<string, Record<Language, string>> = {
  morning: { id: 'Pagi', en: 'Morning' },
  day: { id: 'Siang', en: 'Day' },
  evening: { id: 'Malam', en: 'Evening' },
};

export const AdminParticipantInspector: React.FC<AdminParticipantInspectorProps> = ({
  user,
  record,
  loading,
  lang,
  coinConfig,
  adminUser,
  canEditCoins,
  onRefresh,
  onCoinUpdated,
  onNotify,
  onClose,
}) => {
  const id = lang === 'id';
  const symbol = coinConfig.coinSymbol || 'KOIN';
  const [tab, setTab] = useState<InspectorTab>('habits');
  const [journalFilter, setJournalFilter] = useState<'all' | 'checkin' | 'activity'>('all');

  // Admin Coin Adjustment state
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustValue, setAdjustValue] = useState<number>(1);
  const [adjustTxType, setAdjustTxType] = useState<'admin_adjust' | 'partner_tx'>('admin_adjust');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustPartnerRef, setAdjustPartnerRef] = useState('');
  const [savingCoins, setSavingCoins] = useState(false);

  const profile = record?.profile ?? null;
  const journal = record?.journal ?? [];
  const dailyLogs = record?.dailyLogs ?? [];
  const transactions = record?.coinTransactions ?? [];
  const calendar = record?.calendar ?? null;

  const analysis = useMemo(
    () =>
      analyzeParticipantHabits({
        profile,
        journal,
        dailyLogs,
        transactions,
        calendar,
        lang,
      }),
    [profile, journal, dailyLogs, transactions, calendar, lang]
  );

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCoins || savingCoins) return;
    setSavingCoins(true);
    try {
      const res = await adjustParticipantCoinsByAdmin(adminUser, user.ownerUid, {
        mode: adjustMode,
        value: adjustValue,
        txType: adjustTxType,
        note: adjustNote,
        partnerRef: adjustPartnerRef,
      });
      onCoinUpdated(user.ownerUid, res.nextBalance);
      setAdjustNote('');
      setAdjustPartnerRef('');
      onNotify(
        id
          ? `Koin ${user.displayName} diperbarui: ${res.previousBalance} → ${res.nextBalance} ${symbol} (${res.delta >= 0 ? '+' : ''}${res.delta})`
          : `Updated ${user.displayName}'s coins: ${res.previousBalance} → ${res.nextBalance} ${symbol}`,
        'success'
      );
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSavingCoins(false);
    }
  };

  const handleExportRecord = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: user,
      analysis,
      profile,
      journal,
      dailyLogs,
      coinTransactions: transactions,
      calendar,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participant-${(user.displayName || user.ownerUid).replace(/[^a-z0-9-_]+/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredJournal = journal.filter((entry) =>
    journalFilter === 'all' ? true : entry.kind === journalFilter
  );

  const tabs: Array<{ id: InspectorTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'habits',
      label: id ? 'Kebiasaan & Kecenderungan' : 'Habits & Tendencies',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'journal',
      label: `${id ? 'Jurnal & Check-in' : 'Journal & Check-ins'} (${journal.length})`,
      icon: <NotebookPen className="w-3.5 h-3.5" />,
    },
    {
      id: 'tasks',
      label: id ? 'Tugas, Impian, Skill & Kalender' : 'Tasks, Dreams, Skills & Calendar',
      icon: <CheckSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'dailyLogs',
      label: `${id ? 'Log Harian' : 'Daily Logs'} (${dailyLogs.length})`,
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'coins',
      label: `${id ? 'Koin & Transaksi' : 'Coins & Tx'} (${profile?.gold ?? user.telemetry?.gold ?? 0} ${symbol})`,
      icon: <Coins className="w-3.5 h-3.5" />,
    },
  ];

  const totalTimeSignals =
    analysis.timeOfDayDistribution.morning +
    analysis.timeOfDayDistribution.afternoon +
    analysis.timeOfDayDistribution.evening +
    analysis.timeOfDayDistribution.lateNight;
  const maxWeekday = Math.max(1, ...analysis.weekdayActivity.map((d) => d.count));
  const totalCatMinutes = Math.max(
    1,
    analysis.categoryMinutes.study + analysis.categoryMinutes.work + analysis.categoryMinutes.fitness
  );
  const currentBalance = profile?.gold ?? user.telemetry?.gold ?? 0;
  const estimatedIdr = coinConfig.idrPerCoin > 0 ? Math.round(currentBalance * coinConfig.idrPerCoin) : 0;

  return (
    <section className="anime-panel overflow-hidden border-2 border-sky-600 shadow-lg">
      {/* Header Bar */}
      <div className="blender-bar px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-orange-400 uppercase font-bold flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5" />
            {id ? 'REKAM DATA, KEBIASAAN & KOIN PESERTA' : 'PARTICIPANT RECORDS, HABITS & COINS'}
          </p>
          <h3 className="font-hud text-base font-bold truncate">
            {profile?.name || user.displayName}{' '}
            <span className="font-mono text-xs font-normal text-slate-300">
              ({user.email}) {profile ? `· Lv.${profile.level} · ${profile.profession}` : ''}
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportRecord}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-[10px] font-bold flex items-center gap-1"
            title={id ? 'Unduh seluruh catatan peserta (JSON)' : 'Export participant JSON'}
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white font-mono text-[10px] font-bold flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {id ? 'Muat Ulang' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-rose-700 text-white"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-100 p-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition ${
              tab === item.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-sky-400'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {loading && !record ? (
        <div className="p-10 text-center space-y-2 text-xs text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
          <p>{id ? 'Memuat seluruh catatan, jurnal, dan kebiasaan peserta...' : 'Loading participant records and habits...'}</p>
        </div>
      ) : (
        <div className="p-4 space-y-4 text-xs">
          {/* TAB 1: HABITS & TENDENCIES */}
          {tab === 'habits' && (
            <div className="space-y-4">
              {/* Alerts */}
              {analysis.alerts.length > 0 && (
                <div className="space-y-1.5">
                  {analysis.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border flex items-start gap-2 ${
                        alert.severity === 'danger'
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="font-semibold">{alert.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-2.5 rounded border border-amber-200 bg-amber-50">
                  <p className="font-mono text-[10px] font-bold text-amber-900">{coinConfig.coinName.toUpperCase()}</p>
                  <p className="font-hud text-xl font-bold text-amber-800 mt-0.5">{currentBalance} {symbol}</p>
                  <p className="text-[10px] text-amber-700">
                    {estimatedIdr > 0 ? `≈ Rp ${estimatedIdr.toLocaleString('id-ID')}` : `+${analysis.coinStats.totalEarned} / -${analysis.coinStats.totalRedeemed}`}
                  </p>
                </div>
                <div className="p-2.5 rounded border border-orange-200 bg-orange-50">
                  <p className="font-mono text-[10px] font-bold text-orange-900 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> STREAK HARIAN
                  </p>
                  <p className="font-hud text-xl font-bold text-orange-700 mt-0.5">{analysis.streaks.daily}h</p>
                  <p className="text-[10px] text-orange-800">Rekor: {analysis.streaks.dailyLongest}h</p>
                </div>
                <div className="p-2.5 rounded border border-sky-200 bg-sky-50">
                  <p className="font-mono text-[10px] font-bold text-sky-900">STREAK TUGAS</p>
                  <p className="font-hud text-xl font-bold text-sky-800 mt-0.5">{analysis.streaks.task}h</p>
                  <p className="text-[10px] text-sky-700">Rekor: {analysis.streaks.taskLongest}h</p>
                </div>
                <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50">
                  <p className="font-mono text-[10px] font-bold text-emerald-900">STREAK WORKOUT</p>
                  <p className="font-hud text-xl font-bold text-emerald-800 mt-0.5">{analysis.streaks.workout}h</p>
                  <p className="text-[10px] text-emerald-700">Rekor: {analysis.streaks.workoutLongest}h</p>
                </div>
                <div className="p-2.5 rounded border border-indigo-200 bg-indigo-50">
                  <p className="font-mono text-[10px] font-bold text-indigo-900">KONSISTENSI 14H</p>
                  <p className="font-hud text-xl font-bold text-indigo-800 mt-0.5">{analysis.consistencyPct14}%</p>
                  <p className="text-[10px] text-indigo-700">{analysis.activeDaysLast14}/14 hari aktif</p>
                </div>
                <div className="p-2.5 rounded border border-purple-200 bg-purple-50">
                  <p className="font-mono text-[10px] font-bold text-purple-900">PETA IMPIAN</p>
                  <p className="font-hud text-xl font-bold text-purple-800 mt-0.5">{analysis.dreamStats.progressPct}%</p>
                  <p className="text-[10px] text-purple-700">{analysis.dreamStats.completedSteps}/{analysis.dreamStats.totalSteps} tahap</p>
                </div>
              </div>

              {/* Automated Tendencies Narrative */}
              <div className="rounded border border-sky-200 bg-sky-50/70 p-3.5 space-y-2">
                <h4 className="font-hud font-bold text-xs uppercase text-sky-950 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-700" />
                  {id ? 'Analisis Kebiasaan & Kecenderungan Peserta' : 'Participant Habits & Tendencies Analysis'}
                </h4>
                {analysis.tendencies.length === 0 ? (
                  <p className="text-slate-600 italic">
                    {id
                      ? 'Belum cukup catatan aktivitas atau check-in untuk membentuk pola kebiasaan.'
                      : 'Not enough logged activity or check-ins yet to infer habit patterns.'}
                  </p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-slate-800">
                    {analysis.tendencies.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Behavioral Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 1. Time & Day Rhythm */}
                <div className="rounded border border-slate-200 bg-white p-3 space-y-2.5">
                  <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700">
                    {id ? 'Pola Waktu & Hari Aktif' : 'Active Time & Weekday Pattern'}
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    {id ? 'Waktu puncak:' : 'Peak time:'} <strong className="text-slate-900">{analysis.peakTimeLabel}</strong> ·{' '}
                    {id ? 'Hari puncak:' : 'Peak day:'} <strong className="text-slate-900">{analysis.peakWeekdayLabel}</strong>
                  </p>
                  <div className="space-y-1.5">
                    {([
                      [id ? 'Pagi (05–11)' : 'Morning', analysis.timeOfDayDistribution.morning, 'bg-amber-500'],
                      [id ? 'Siang (11–17)' : 'Afternoon', analysis.timeOfDayDistribution.afternoon, 'bg-sky-500'],
                      [id ? 'Malam (17–23)' : 'Evening', analysis.timeOfDayDistribution.evening, 'bg-indigo-600'],
                      [id ? 'Larut (23–05)' : 'Late Night', analysis.timeOfDayDistribution.lateNight, 'bg-slate-700'],
                    ] as const).map(([label, val, cls]) => {
                      const pct = totalTimeSignals ? Math.round((val / totalTimeSignals) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span>{label}</span>
                            <span className="font-mono font-bold">{val} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">
                      {id ? 'Aktivitas per Hari' : 'Activity by Weekday'}
                    </p>
                    <div className="grid grid-cols-7 gap-1 items-end h-14">
                      {analysis.weekdayActivity.map((d) => (
                        <div key={d.day} className="flex flex-col items-center gap-1">
                          <div className="w-full bg-slate-100 rounded-sm h-9 flex items-end overflow-hidden">
                            <div
                              className="w-full bg-sky-600 rounded-sm"
                              style={{ height: `${Math.round((d.count / maxWeekday) * 100)}%` }}
                              title={`${d.day}: ${d.count}`}
                            />
                          </div>
                          <span className="font-mono text-[9px] text-slate-600">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Focus Category & Workout Habits */}
                <div className="rounded border border-slate-200 bg-white p-3 space-y-2.5">
                  <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700">
                    {id ? 'Kecenderungan Fokus & Workout' : 'Focus & Workout Tendencies'}
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    {id ? 'Dominan:' : 'Dominant:'} <strong className="text-slate-900">{analysis.dominantCategoryLabel}</strong>
                  </p>
                  <div className="space-y-1.5">
                    {([
                      [id ? 'Belajar (Study)' : 'Study', analysis.categoryMinutes.study, analysis.categorySessions.study, 'bg-indigo-600'],
                      [id ? 'Kerja & Proyek' : 'Work & Career', analysis.categoryMinutes.work, analysis.categorySessions.work, 'bg-sky-600'],
                      [id ? 'Olahraga / Workout' : 'Workout', analysis.categoryMinutes.fitness, analysis.categorySessions.fitness, 'bg-emerald-600'],
                    ] as const).map(([label, mins, sessions, cls]) => {
                      const pct = Math.round((mins / totalCatMinutes) * 100);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span>{label}</span>
                            <span className="font-mono font-bold">{mins}m · {sessions}x</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                      {id ? 'Ringkasan Latihan' : 'Workout Summary'}
                    </p>
                    <p>
                      {id ? 'Minggu ini:' : 'This week:'}{' '}
                      <strong>{analysis.workoutStats.thisWeekActiveDays} / {analysis.workoutStats.weeklyTarget}</strong> {id ? 'hari target' : 'target days'}
                    </p>
                    <p>
                      {id ? 'Kelelahan:' : 'Fatigue:'}{' '}
                      Nyaman {analysis.workoutStats.fatigueCounts.manageable} · Capek {analysis.workoutStats.fatigueCounts.tired} · Sangat capek {analysis.workoutStats.fatigueCounts.very_tired}
                    </p>
                    <p className={analysis.workoutStats.painCount > 0 ? 'font-bold text-rose-700' : 'text-slate-600'}>
                      {id ? 'Laporan nyeri:' : 'Pain logs:'} {analysis.workoutStats.painCount}x
                    </p>
                  </div>
                </div>

                {/* 3. Sleep, Nutrition, Energy & Mood */}
                <div className="rounded border border-slate-200 bg-white p-3 space-y-2.5">
                  <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700">
                    {id ? 'Tidur, Pola Makan, Energi & Mood' : 'Sleep, Meals, Energy & Mood'}
                  </h5>
                  <div className="space-y-1 text-[11px]">
                    <p>
                      <strong>{id ? 'Tidur:' : 'Sleep:'}</strong>{' '}
                      {analysis.sleepStats.average !== null
                        ? `${analysis.sleepStats.average} jam/malam (min ${analysis.sleepStats.min}h, maks ${analysis.sleepStats.max}h, kurang tidur ${analysis.sleepStats.shortSleepCount}x)`
                        : (id ? 'Belum dicatat' : 'Not logged')}
                    </p>
                    <p>
                      <strong>{id ? 'Energi:' : 'Energy:'}</strong>{' '}
                      Segar {analysis.energyDistribution.fresh} · Biasa {analysis.energyDistribution.steady} · Lelah {analysis.energyDistribution.tired}
                    </p>
                    <p>
                      <strong>{id ? 'Pola makan:' : 'Meals:'}</strong>{' '}
                      Beragam {analysis.mealPatternDistribution.varied} · Kurang beragam {analysis.mealPatternDistribution.partial} · Terlewat {analysis.mealPatternDistribution.skipped}
                    </p>
                    <p>
                      <strong>{id ? 'Kelompok gizi:' : 'Food groups:'}</strong>{' '}
                      Pokok {analysis.mealGroupCounts.staple} · Protein {analysis.mealGroupCounts.protein} · Sayur {analysis.mealGroupCounts.vegetables} · Buah {analysis.mealGroupCounts.fruit}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="font-bold text-[11px] text-slate-800 mb-1">
                      {id ? 'Distribusi Mood:' : 'Mood Distribution:'}
                    </p>
                    {analysis.moodDistribution.length === 0 ? (
                      <p className="text-slate-400 italic">{id ? 'Belum ada catatan mood.' : 'No mood logs yet.'}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {analysis.moodDistribution.map((m) => (
                          <span
                            key={m.mood}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-800"
                          >
                            {m.label} ({m.count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Profile, Biometrics, Career & Gym Records */}
              {profile ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-sky-600" />
                      {id ? 'Profil & Biometrik' : 'Profile & Biometrics'}
                    </h5>
                    <p><strong>{id ? 'Nama:' : 'Name:'}</strong> {profile.name} ({profile.gender === 'female' ? 'P' : 'L'}, {profile.age} th)</p>
                    <p><strong>{id ? 'Fisik:' : 'Body:'}</strong> TB {profile.height} cm · BB {profile.weight} kg · BMI {profile.bio.bmi} ({profile.bio.bmiCategory})</p>
                    <p><strong>BMR / Protein:</strong> {profile.bio.bmr} kkal · {profile.bio.proteinTarget}g/hari</p>
                    <p><strong>{id ? 'Kota:' : 'City:'}</strong> {profile.city || '-'}</p>
                    <p><strong>{id ? 'Minat Hadiah:' : 'Reward Interest:'}</strong> {profile.rewardInterest || '-'}</p>
                    <p><strong>{id ? 'Impian Utama:' : 'Main Goal:'}</strong> {profile.goal} (Target Lv.{profile.targetLevel})</p>
                    <p>
                      <strong>Stats:</strong> STR {profile.stats.str.toFixed(1)} · VIT {profile.stats.vit.toFixed(1)} · INT {profile.stats.int.toFixed(1)} · AGI {profile.stats.agi.toFixed(1)} · CHA {profile.stats.cha.toFixed(1)}
                    </p>
                  </div>

                  <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      {id ? 'Catatan Kerja & Proyek' : 'Work & Project Profile'}
                    </h5>
                    <p><strong>{id ? 'Profesi:' : 'Role:'}</strong> {profile.profession}</p>
                    {profile.career ? (
                      <>
                        <p><strong>{id ? 'Industri:' : 'Industry:'}</strong> {profile.career.industry || '-'}</p>
                        <p><strong>{id ? 'Tanggung jawab:' : 'Responsibilities:'}</strong> {profile.career.responsibilities || '-'}</p>
                        <p><strong>{id ? 'Kelola tim / Sprint:' : 'Team / Sprint:'}</strong> {profile.career.managesTeam ? 'Ya' : 'Tidak'} / {profile.career.usesSprints ? 'Ya' : 'Tidak'}</p>
                        <p><strong>{id ? 'Proyek:' : 'Project:'}</strong> {profile.career.project || '-'} ({profile.career.projectStatus})</p>
                        <p><strong>{id ? 'Rapat terakhir:' : 'Last meeting:'}</strong> {profile.career.lastMeeting || '-'}</p>
                        <p><strong>{id ? 'Tindak lanjut:' : 'Next action:'}</strong> {profile.career.nextAction || '-'}</p>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">{id ? 'Belum mengisi detail kerja.' : 'No career details yet.'}</p>
                    )}
                  </div>

                  <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                      {id ? 'Catatan Profil Latihan' : 'Workout Profile'}
                    </h5>
                    {profile.gym ? (
                      <>
                        <p><strong>{id ? 'Tujuan:' : 'Goal:'}</strong> {profile.gym.goal}</p>
                        <p><strong>{id ? 'Pengalaman:' : 'Experience:'}</strong> {profile.gym.level}</p>
                        <p><strong>{id ? 'Tempat / Alat:' : 'Location:'}</strong> {profile.gym.equipment}</p>
                        <p><strong>{id ? 'Target hari/minggu:' : 'Days/week:'}</strong> {profile.gym.days} hari</p>
                        <p><strong>{id ? 'Batasan gerakan:' : 'Limitations:'}</strong> {profile.gym.limitations || '-'}</p>
                        <p className={profile.gym.currentPain ? 'font-bold text-rose-700' : ''}>
                          <strong>{id ? 'Nyeri saat ini:' : 'Current pain:'}</strong> {profile.gym.currentPain ? 'YA (Perlu perhatian)' : 'Tidak'}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">{id ? 'Belum mengisi profil latihan.' : 'No gym profile yet.'}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  {id ? 'Peserta ini sudah terdaftar akunnya, namun belum menyelesaikan pengisian profil awal.' : 'This user has registered but has not completed initial profile setup yet.'}
                </p>
              )}
            </div>
          )}

          {/* TAB 2: FULL JOURNAL & CHECK-INS */}
          {tab === 'journal' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-600">
                  {id
                    ? 'Seluruh catatan check-in harian (mood, tidur, makan, energi, rencana) dan aktivitas/workout yang dicatat peserta.'
                    : 'All participant daily check-ins (mood, sleep, meals, energy, plans) and logged tasks/workouts.'}
                </p>
                <div className="flex gap-1">
                  {([
                    ['all', id ? 'Semua' : 'All'],
                    ['checkin', 'Check-in'],
                    ['activity', id ? 'Tugas & Workout' : 'Tasks & Workouts'],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJournalFilter(val)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        journalFilter === val
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredJournal.length === 0 ? (
                <p className="py-6 text-center text-slate-400 italic">
                  {id ? 'Belum ada catatan jurnal untuk filter ini.' : 'No journal records for this filter.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredJournal.map((entry) => {
                    if (entry.kind === 'checkin') {
                      const c = entry as CheckIn;
                      return (
                        <article key={c.id} className="rounded border border-indigo-200 bg-indigo-50/40 p-3 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-700 text-white">
                              CHECK-IN · {c.dateKey} · {PHASE_LABELS[c.phase]?.[lang] || c.phase}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleString(id ? 'id-ID' : 'en-GB') : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <p><strong>Mood:</strong> {MOOD_LABELS[c.mood || '']?.[lang] || c.mood || '-'}</p>
                            <p><strong>{id ? 'Energi:' : 'Energy:'}</strong> {ENERGY_LABELS[c.energy]?.[lang] || '-'}</p>
                            <p><strong>{id ? 'Tidur:' : 'Sleep:'}</strong> {c.sleepHours !== null ? `${c.sleepHours} jam` : '-'}</p>
                            <p><strong>{id ? 'Pola makan:' : 'Meal:'}</strong> {MEAL_LABELS[c.meal]?.[lang] || '-'}</p>
                          </div>
                          {(c.mealNote || c.mealEnjoyment || (c.mealGroups && c.mealGroups.length > 0)) && (
                            <p className="text-[11px] text-slate-700">
                              <strong>{id ? 'Catatan makan:' : 'Meal note:'}</strong> {c.mealNote || '-'}
                              {c.mealEnjoyment ? ` · Rasa: ${c.mealEnjoyment}` : ''}
                              {c.mealGroups?.length ? ` · Kelompok: ${c.mealGroups.join(', ')}` : ''}
                            </p>
                          )}
                          {c.note && (
                            <p className="rounded bg-white border border-indigo-100 p-2 text-[11px] whitespace-pre-wrap text-slate-800">
                              <strong>{c.phase === 'morning' ? (id ? 'Rencana hari ini: ' : 'Plan: ') : (id ? 'Catatan aktivitas: ' : 'Notes: ')}</strong>
                              {c.note}
                              {c.extraMinutes > 0 ? ` (${c.extraMinutes} menit)` : ''}
                            </p>
                          )}
                        </article>
                      );
                    }
                    const a = entry as LoggedActivity;
                    return (
                      <article
                        key={a.id}
                        className={`rounded border p-3 space-y-1 ${
                          a.workout?.pain
                            ? 'border-rose-300 bg-rose-50/50'
                            : a.category === 'FITNESS'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-orange-400">
                            {a.category} · {a.dateKey} · {a.minutes}m
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {a.updatedAt ? new Date(a.updatedAt).toLocaleString(id ? 'id-ID' : 'en-GB') : ''}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{a.title}</p>
                        {a.workout && (
                          <p className="text-[11px] text-slate-700">
                            <strong>Workout:</strong>{' '}
                            {a.workout.setReps ? `Set/Reps: ${a.workout.setReps.split(',').join(' / ')}` : 'Durasi'} ·{' '}
                            Kelelahan: <strong>{a.workout.fatigue}</strong> ·{' '}
                            Nyeri: <strong className={a.workout.pain ? 'text-rose-700' : 'text-emerald-700'}>{a.workout.pain ? 'YA' : 'Tidak'}</strong>
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TASKS, DREAM STEPS, SKILLS & CALENDAR */}
          {tab === 'tasks' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quests */}
              <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase text-sky-800 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {id ? `Daftar Tugas Harian (${profile?.quests.length ?? 0})` : `Daily Tasks (${profile?.quests.length ?? 0})`}
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {!profile?.quests.length ? (
                    <p className="text-slate-400 italic">{id ? 'Belum ada tugas.' : 'No tasks.'}</p>
                  ) : (
                    profile.quests.map((q) => (
                      <div
                        key={q.id}
                        className={`p-2 rounded border text-[11px] ${
                          q.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{q.completed ? '✓ ' : '○ '}{q.title}</span>
                          <span className="font-mono text-[10px] shrink-0 text-slate-600">{q.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          Skill: {q.skillTag} · Target: {q.defaultQty} {q.unitType}
                          {q.completedQty ? ` · Aktual: ${q.completedQty}` : ''}
                          {q.completedRpe ? ` · RPE ${q.completedRpe}/10` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dream Roadmap */}
              <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase text-orange-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  {id ? `Peta Impian (${profile?.dreamSteps.length ?? 0} tahap)` : `Dream Roadmap (${profile?.dreamSteps.length ?? 0} steps)`}
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {!profile?.dreamSteps.length ? (
                    <p className="text-slate-400 italic">{id ? 'Belum ada tahap impian.' : 'No dream steps.'}</p>
                  ) : (
                    profile.dreamSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-2 rounded border text-[11px] ${
                          step.archived
                            ? 'bg-slate-100 border-slate-200 opacity-75'
                            : step.completed
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-orange-50/40 border-orange-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {step.completed ? '✓ ' : ''}{step.title}
                            {step.archived ? ' [Arsip]' : ''}
                          </span>
                          <span className="font-mono text-[10px] shrink-0">
                            {step.completedMinutes}/{step.targetMinutes}m
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          {step.phase} · Skill: {step.skillName} · Langkah selesai: {step.completedActions?.length ?? 0}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase text-purple-800 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  {id ? `Koleksi Skill (${analysis.topSkills.length})` : `Skills (${analysis.topSkills.length})`}
                </h4>
                {analysis.topSkills.length === 0 ? (
                  <p className="text-slate-400 italic">{id ? 'Belum ada skill tercatat.' : 'No skills logged.'}</p>
                ) : (
                  <div className="space-y-1">
                    {analysis.topSkills.map((sk) => (
                      <div key={sk.name} className="flex items-center justify-between rounded bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px]">
                        <span className="font-bold text-slate-900">
                          {sk.name}{' '}
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${sk.permanent ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>
                            {sk.permanent ? 'PERMANEN' : 'CALON'}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-600">{sk.sessions} sesi · {sk.totalMinutes}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Synced Calendar */}
              <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase text-sky-800 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {id ? 'Agenda Kalender Tersinkron' : 'Synced Calendar Events'}
                </h4>
                {!calendar || calendar.events.length === 0 ? (
                  <p className="text-slate-400 italic">
                    {id ? 'Peserta belum menyinkronkan agenda Google Calendar / .ics.' : 'No synced calendar events.'}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    <p className="text-[10px] text-slate-500">
                      Sumber: <strong>{calendar.source}</strong> · Total: {calendar.eventCount} agenda
                    </p>
                    {calendar.events.map((ev) => (
                      <div key={ev.id + ev.start} className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px]">
                        <p className="font-bold text-slate-900">{ev.title || '(Tanpa judul)'}</p>
                        <p className="font-mono text-[10px] text-slate-600">{ev.start} → {ev.end}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DAILY LOGS */}
          {tab === 'dailyLogs' && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Tugas</th>
                    <th className="px-3 py-2">Belajar / Kerja / Gym</th>
                    <th className="px-3 py-2">Koin / EXP</th>
                    <th className="px-3 py-2">Streak</th>
                    <th className="px-3 py-2">Tidur / Nutrisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dailyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400 italic">
                        {id ? 'Belum ada rekap harian (Tutup Hari) yang tersimpan.' : 'No closed daily logs yet.'}
                      </td>
                    </tr>
                  ) : (
                    dailyLogs.map((log) => (
                      <tr key={log.dateKey}>
                        <td className="px-3 py-2 font-mono font-bold">{log.dateKey}</td>
                        <td className="px-3 py-2">{log.completedTasks}/{log.totalTasks}</td>
                        <td className="px-3 py-2 font-mono">{log.studyMinutes}m / {log.workMinutes}m / {log.fitnessMinutes}m</td>
                        <td className="px-3 py-2 font-mono">+{log.goldEarned} {symbol} · +{log.expEarned} EXP</td>
                        <td className="px-3 py-2 font-mono font-bold text-orange-700">🔥 {log.streakAfter}</td>
                        <td className="px-3 py-2">{log.sleepCondition} / {log.nutritionCondition}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: EDIT COINS & TRANSACTIONS (MYVALUE READY) */}
          {tab === 'coins' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Admin Coin Editor */}
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded border border-amber-300 bg-amber-50 p-3.5 space-y-1">
                  <p className="font-mono text-[10px] font-bold text-amber-900 uppercase">
                    {id ? 'SALDO KOIN PESERTA SAAT INI' : 'CURRENT PARTICIPANT COIN BALANCE'}
                  </p>
                  <p className="font-hud text-3xl font-bold text-amber-800">
                    {currentBalance} <span className="text-base">{symbol}</span>
                  </p>
                  {estimatedIdr > 0 && (
                    <p className="text-xs text-amber-900">
                      ≈ <strong>Rp {estimatedIdr.toLocaleString('id-ID')}</strong> ({coinConfig.partnerName || 'Partner'})
                    </p>
                  )}
                </div>

                {canEditCoins ? (
                  <form onSubmit={(e) => void handleAdjustCoins(e)} className="rounded border border-slate-200 bg-white p-3.5 space-y-3">
                    <h4 className="font-mono text-[10px] font-bold uppercase text-slate-800 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      {id ? 'EDIT SALDO KOIN / CATAT TRANSAKSI' : 'EDIT COIN BALANCE / LOG TRANSACTION'}
                    </h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ['add', id ? '+ Tambah' : '+ Add'],
                        ['deduct', id ? '- Kurangi' : '- Deduct'],
                        ['set', id ? '= Set Saldo' : '= Set Exact'],
                      ] as const).map(([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAdjustMode(m)}
                          className={`py-1.5 rounded text-xs font-bold border transition ${
                            adjustMode === m
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                        {id ? `Jumlah (${symbol})` : `Amount (${symbol})`}
                        <input
                          type="number"
                          min={0}
                          max={10000000}
                          required
                          value={adjustValue}
                          onChange={(e) => setAdjustValue(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-sm"
                        />
                      </label>
                      <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                        {id ? 'Jenis Transaksi' : 'Transaction Type'}
                        <select
                          value={adjustTxType}
                          onChange={(e) => setAdjustTxType(e.target.value as 'admin_adjust' | 'partner_tx')}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="admin_adjust">{id ? 'Penyesuaian Admin' : 'Admin Adjustment'}</option>
                          <option value="partner_tx">{id ? `Transaksi ${coinConfig.partnerName || 'Partner'}` : `${coinConfig.partnerName || 'Partner'} Transaction`}</option>
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                      {id ? 'Catatan / Alasan Transaksi' : 'Transaction Note / Reason'}
                      <input
                        type="text"
                        required
                        maxLength={240}
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder={
                          id
                            ? `Mis. Penukaran voucher ${coinConfig.partnerName || 'MyValue'} / Koreksi saldo`
                            : `E.g. ${coinConfig.partnerName || 'MyValue'} voucher redemption / Balance correction`
                        }
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </label>

                    <label className="block space-y-1 text-[11px] font-bold text-slate-700">
                      {id ? `Kode Referensi ${coinConfig.partnerName || 'Partner'} (Opsional)` : `${coinConfig.partnerName || 'Partner'} Reference ID (Optional)`}
                      <input
                        type="text"
                        maxLength={120}
                        value={adjustPartnerRef}
                        onChange={(e) => setAdjustPartnerRef(e.target.value)}
                        placeholder="MV-2026-0001"
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={savingCoins || !profile}
                      className="w-full py-2 px-3 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
                    >
                      {savingCoins ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{id ? 'SIMPAN PERUBAHAN KOIN' : 'SAVE COIN UPDATE'}</span>
                    </button>
                  </form>
                ) : (
                  <p className="rounded border border-slate-200 bg-slate-50 p-3 text-slate-600">
                    {id ? 'Hanya peran Admin / Super Admin yang dapat mengubah saldo koin peserta.' : 'Only Admin / Super Admin roles can edit participant coin balances.'}
                  </p>
                )}

                {/* Participant Self Rewards */}
                {profile && (
                  <div className="rounded border border-slate-200 bg-white p-3 space-y-1.5">
                    <h5 className="font-mono text-[10px] font-bold uppercase text-slate-700">
                      {id ? `Daftar Hadiah Diri Peserta (${profile.rewards.length})` : `Participant Self-Rewards (${profile.rewards.length})`}
                    </h5>
                    {profile.rewards.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-[11px] border-t border-slate-100 pt-1">
                        <span className="truncate">{r.name}</span>
                        <span className="font-mono font-bold text-amber-800 shrink-0">{r.cost} {symbol}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Immutable Coin Transaction Ledger */}
              <div className="lg:col-span-7 rounded border border-slate-200 bg-white p-3.5 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase text-slate-800">
                  {id ? `Riwayat Ledger Transaksi Koin (${transactions.length})` : `Coin Transaction Ledger (${transactions.length})`}
                </h4>
                {transactions.length === 0 ? (
                  <p className="py-8 text-center text-slate-400 italic">
                    {id ? 'Belum ada transaksi koin yang tercatat.' : 'No coin transactions recorded yet.'}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="rounded border border-slate-200 bg-slate-50 p-2.5 flex items-start justify-between gap-2 text-[11px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tx.type === 'earn'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'redeem'
                                  ? 'bg-amber-100 text-amber-900'
                                  : tx.type === 'partner_tx'
                                    ? 'bg-purple-100 text-purple-900'
                                    : 'bg-sky-100 text-sky-900'
                            }`}>
                              {tx.type} · {tx.source}
                            </span>
                            {tx.partnerRef && (
                              <span className="font-mono text-[9px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                                REF: {tx.partnerRef}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 mt-1 break-words">{tx.note || '-'}</p>
                          <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString(id ? 'id-ID' : 'en-GB') : ''} · {tx.actorEmail || tx.actorUid}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono font-bold text-xs ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} {symbol}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500">
                            Saldo: {tx.balanceAfter}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
