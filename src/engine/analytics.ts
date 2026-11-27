import type {
  CoinTransactionRecord,
  DailyLogEntry,
  Language,
  PlayerProfile,
  SyncedCalendarRecord,
  UserTelemetrySummary,
} from '../types';
import type { CheckIn, JournalEntry, LoggedActivity } from './journal';
import { getCurrentDreamSteps } from './coaching';
import { getEffectiveStreak, getTodayDateKey } from './science';
import { DEFAULT_USER_PRIVACY_SETTINGS, type UserPrivacySettings } from './v2/privacy';

export interface ParticipantHabitAnalysis {
  activeDaysCount: number;
  activeDaysLast14: number;
  consistencyPct14: number;
  streaks: {
    daily: number;
    dailyLongest: number;
    task: number;
    taskLongest: number;
    workout: number;
    workoutLongest: number;
  };
  timeOfDayDistribution: {
    morning: number; // 05-11
    afternoon: number; // 11-17
    evening: number; // 17-23
    lateNight: number; // 23-05
  };
  peakTimeLabel: string;
  weekdayActivity: Array<{ day: string; count: number }>;
  peakWeekdayLabel: string;
  categoryMinutes: {
    study: number;
    work: number;
    fitness: number;
    extra: number;
  };
  categorySessions: {
    study: number;
    work: number;
    fitness: number;
  };
  dominantCategoryLabel: string;
  sleepStats: {
    average: number | null;
    min: number | null;
    max: number | null;
    loggedCount: number;
    shortSleepCount: number;
  };
  energyDistribution: Record<'fresh' | 'steady' | 'tired', number>;
  mealPatternDistribution: Record<'varied' | 'partial' | 'skipped', number>;
  mealGroupCounts: Record<'staple' | 'protein' | 'vegetables' | 'fruit', number>;
  mealEnjoymentCounts: Record<'enjoyed' | 'neutral' | 'did_not_enjoy', number>;
  moodDistribution: Array<{ mood: string; label: string; count: number }>;
  dominantMoodLabel: string;
  workoutStats: {
    totalSessions: number;
    totalMinutes: number;
    fatigueCounts: Record<'manageable' | 'tired' | 'very_tired', number>;
    painCount: number;
    weeklyTarget: number;
    thisWeekActiveDays: number;
  };
  dreamStats: {
    completedSteps: number;
    totalSteps: number;
    progressPct: number;
    completedActionsCount: number;
  };
  topSkills: Array<{ name: string; sessions: number; totalMinutes: number; permanent: boolean }>;
  coinStats: {
    currentBalance: number;
    totalEarned: number;
    totalRedeemed: number;
    totalAdminAdjusted: number;
    totalPartnerTx: number;
  };
  alerts: Array<{ severity: 'warning' | 'danger'; text: string }>;
  tendencies: string[];
}

const MOOD_LABELS: Record<string, Record<Language, string>> = {
  calm: { id: 'Tenang', en: 'Calm' },
  hopeful: { id: 'Penuh harapan', en: 'Hopeful' },
  grateful: { id: 'Bersyukur', en: 'Grateful' },
  anxious: { id: 'Cemas', en: 'Anxious' },
  overwhelmed: { id: 'Kewalahan', en: 'Overwhelmed' },
  sad: { id: 'Sedih', en: 'Sad' },
  mixed: { id: 'Campur aduk', en: 'Mixed' },
  neutral: { id: 'Biasa saja', en: 'Neutral' },
};

const WEEKDAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildUserTelemetrySummary(
  player: PlayerProfile,
  journal: JournalEntry[],
  dailyLogs: DailyLogEntry[],
  today = getTodayDateKey(),
  privacy: UserPrivacySettings = DEFAULT_USER_PRIVACY_SETTINGS
): UserTelemetrySummary {
  const checkIns = journal
    .filter((entry): entry is CheckIn => entry.kind === 'checkin')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const activities = journal.filter((entry): entry is LoggedActivity => entry.kind === 'activity');

  // Privacy-by-Default (SEC-02): do not expose private mood, sleep, energy, or pain flags
  // in global user directory telemetry unless the participant explicitly opted in.
  const shareWellness = Boolean(privacy.shareWellnessWithCoach);
  const latestMood = shareWellness ? checkIns.find((c) => c.mood)?.mood || '' : '';
  const latestEnergy = shareWellness ? checkIns.find((c) => c.energy)?.energy || '' : '';
  const latestSleep = shareWellness ? checkIns.find((c) => c.sleepHours !== null)?.sleepHours ?? null : null;

  const recentWorkouts = activities.filter((a) => a.category === 'FITNESS' && a.workout);
  const latestWorkout = [...recentWorkouts].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const hasPainAlert = shareWellness && Boolean(
    player.gym?.currentPain ||
      (latestWorkout?.workout?.pain && Date.now() - latestWorkout.updatedAt <= 7 * 86400000)
  );

  const completedTasksFromActivities = activities.filter(
    (a) => !(a.workout?.pain && a.minutes === 0)
  ).length;
  const completedTasksFromLogs = dailyLogs.reduce((sum, l) => sum + (l.completedTasks || 0), 0);
  const completedTasksTotal = Math.max(
    completedTasksFromActivities,
    completedTasksFromLogs,
    player.quests.filter((q) => q.completed).length
  );

  const completedWorkoutsTotal = activities.filter(
    (a) => a.category === 'FITNESS' && !(a.workout?.pain && a.minutes === 0)
  ).length;

  const latestDates = [
    player.lastActiveStreakDate || '',
    player.lastTaskStreakDate || '',
    player.lastWorkoutStreakDate || '',
    journal[0]?.dateKey || '',
    dailyLogs[0]?.dateKey || '',
  ].filter(Boolean).sort();

  return {
    name: (player.name || 'Hunter').slice(0, 100),
    profession: (player.profession || '').slice(0, 160),
    goal: (player.goal || '').slice(0, 300),
    level: Math.max(1, Math.round(player.level || 1)),
    gold: Math.max(0, Math.round(player.gold || 0)),
    streak: getEffectiveStreak(player.streak, player.lastActiveStreakDate, today),
    taskStreak: getEffectiveStreak(player.taskStreak, player.lastTaskStreakDate, today),
    workoutStreak: getEffectiveStreak(player.workoutStreak, player.lastWorkoutStreakDate, today),
    completedTasksTotal,
    completedWorkoutsTotal,
    lastMood: latestMood.slice(0, 30),
    lastEnergy: latestEnergy.slice(0, 30),
    lastSleepHours: latestSleep,
    hasPainAlert,
    projectBlocked: player.career?.projectStatus === 'blocked',
    lastActiveDate: (latestDates.at(-1) || '').slice(0, 10),
    updatedAt: Date.now(),
  };
}

export function analyzeParticipantHabits(params: {
  profile: PlayerProfile | null;
  journal: JournalEntry[];
  dailyLogs: DailyLogEntry[];
  transactions: CoinTransactionRecord[];
  calendar?: SyncedCalendarRecord | null;
  lang: Language;
}): ParticipantHabitAnalysis {
  const { profile, journal, dailyLogs, transactions, lang } = params;
  const id = lang === 'id';
  const today = getTodayDateKey();

  const checkIns = journal.filter((e): e is CheckIn => e.kind === 'checkin');
  const activities = journal.filter((e): e is LoggedActivity => e.kind === 'activity');

  const activeDateSet = new Set<string>();
  for (const e of journal) {
    if (e.dateKey) activeDateSet.add(e.dateKey);
  }
  for (const log of dailyLogs) {
    if (log.completedTasks > 0 || log.studyMinutes + log.workMinutes + log.fitnessMinutes > 0) {
      activeDateSet.add(log.dateKey);
    }
  }
  const cutoff14 = Date.now() - 14 * 86400000;
  const activeDaysLast14 = [...activeDateSet].filter((dk) => Date.parse(dk + 'T12:00:00') >= cutoff14).length;
  const consistencyPct14 = Math.min(100, Math.round((activeDaysLast14 / 14) * 100));

  // Time of day rhythm
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0, lateNight: 0 };
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const entry of journal) {
    if (entry.updatedAt > 0) {
      const dt = new Date(entry.updatedAt);
      const hr = dt.getHours();
      if (hr >= 5 && hr < 11) timeOfDay.morning++;
      else if (hr >= 11 && hr < 17) timeOfDay.afternoon++;
      else if (hr >= 17 && hr < 23) timeOfDay.evening++;
      else timeOfDay.lateNight++;
      weekdayCounts[dt.getDay()]++;
    } else if (entry.dateKey) {
      const dt = new Date(entry.dateKey + 'T12:00:00');
      if (!Number.isNaN(dt.getTime())) weekdayCounts[dt.getDay()]++;
    }
  }

  const timeEntries: Array<[keyof typeof timeOfDay, number, string]> = [
    ['morning', timeOfDay.morning, id ? 'Pagi (05.00–11.00)' : 'Morning (05–11)'],
    ['afternoon', timeOfDay.afternoon, id ? 'Siang/Sore (11.00–17.00)' : 'Afternoon (11–17)'],
    ['evening', timeOfDay.evening, id ? 'Malam (17.00–23.00)' : 'Evening (17–23)'],
    ['lateNight', timeOfDay.lateNight, id ? 'Larut Malam (23.00–05.00)' : 'Late Night (23–05)'],
  ];
  const topTime = [...timeEntries].sort((a, b) => b[1] - a[1])[0];
  const peakTimeLabel = topTime && topTime[1] > 0 ? topTime[2] : (id ? 'Belum cukup data' : 'Not enough data');

  const dayNames = id ? WEEKDAYS_ID : WEEKDAYS_EN;
  const weekdayActivity = weekdayCounts.map((count, idx) => ({ day: dayNames[idx], count }));
  const topDay = [...weekdayActivity].sort((a, b) => b.count - a.count)[0];
  const peakWeekdayLabel = topDay && topDay.count > 0 ? topDay.day : '-';

  // Category minutes & sessions (combine journal + dailyLogs non-overlapping)
  const actStudyMin = activities.filter((a) => a.category === 'STUDY').reduce((s, a) => s + a.minutes, 0);
  const actWorkMin = activities.filter((a) => a.category === 'CAREER').reduce((s, a) => s + a.minutes, 0);
  const actFitMin = activities.filter((a) => a.category === 'FITNESS').reduce((s, a) => s + a.minutes, 0);
  const logStudyMin = dailyLogs.reduce((s, l) => s + l.studyMinutes, 0);
  const logWorkMin = dailyLogs.reduce((s, l) => s + l.workMinutes, 0);
  const logFitMin = dailyLogs.reduce((s, l) => s + l.fitnessMinutes, 0);
  const extraMin = checkIns.reduce((s, c) => s + (c.extraMinutes || 0), 0);

  const categoryMinutes = {
    study: Math.max(actStudyMin, logStudyMin),
    work: Math.max(actWorkMin, logWorkMin),
    fitness: Math.max(actFitMin, logFitMin),
    extra: extraMin,
  };
  const categorySessions = {
    study: activities.filter((a) => a.category === 'STUDY').length,
    work: activities.filter((a) => a.category === 'CAREER').length,
    fitness: activities.filter((a) => a.category === 'FITNESS' && !(a.workout?.pain && a.minutes === 0)).length,
  };

  const totalCatMin = categoryMinutes.study + categoryMinutes.work + categoryMinutes.fitness;
  let dominantCategoryLabel = id ? 'Belum ada catatan aktivitas' : 'No activity logged yet';
  if (totalCatMin > 0) {
    const pairs = [
      { label: id ? 'Belajar' : 'Study', val: categoryMinutes.study },
      { label: id ? 'Kerja & Proyek' : 'Work & Projects', val: categoryMinutes.work },
      { label: id ? 'Olahraga / Workout' : 'Workout', val: categoryMinutes.fitness },
    ].sort((a, b) => b.val - a.val);
    const pct = Math.round((pairs[0].val / totalCatMin) * 100);
    dominantCategoryLabel = `${pairs[0].label} (${pct}%)`;
  }

  // Sleep & recovery
  const sleepByDay = new Map<string, number>();
  for (const c of [...checkIns].sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (c.sleepHours !== null && Number.isFinite(c.sleepHours) && !sleepByDay.has(c.dateKey)) {
      sleepByDay.set(c.dateKey, c.sleepHours);
    }
  }
  const sleepValues = [...sleepByDay.values()];
  const sleepMinThreshold = (profile?.age ?? 24) < 18 ? 8 : 7;
  const sleepStats = {
    average: sleepValues.length ? +(sleepValues.reduce((s, v) => s + v, 0) / sleepValues.length).toFixed(1) : null,
    min: sleepValues.length ? Math.min(...sleepValues) : null,
    max: sleepValues.length ? Math.max(...sleepValues) : null,
    loggedCount: sleepValues.length,
    shortSleepCount: sleepValues.filter((v) => v < sleepMinThreshold).length,
  };

  const energyDistribution = { fresh: 0, steady: 0, tired: 0 };
  const mealPatternDistribution = { varied: 0, partial: 0, skipped: 0 };
  const mealGroupCounts = { staple: 0, protein: 0, vegetables: 0, fruit: 0 };
  const mealEnjoymentCounts = { enjoyed: 0, neutral: 0, did_not_enjoy: 0 };
  const moodCounts = new Map<string, number>();

  for (const c of checkIns) {
    if (c.energy === 'fresh' || c.energy === 'steady' || c.energy === 'tired') {
      energyDistribution[c.energy]++;
    }
    if (c.meal === 'varied' || c.meal === 'partial' || c.meal === 'skipped') {
      mealPatternDistribution[c.meal]++;
    }
    if (Array.isArray(c.mealGroups)) {
      for (const g of c.mealGroups) {
        if (g === 'staple' || g === 'protein' || g === 'vegetables' || g === 'fruit') {
          mealGroupCounts[g]++;
        }
      }
    }
    if (c.mealEnjoyment === 'enjoyed' || c.mealEnjoyment === 'neutral' || c.mealEnjoyment === 'did_not_enjoy') {
      mealEnjoymentCounts[c.mealEnjoyment]++;
    }
    if (c.mood) {
      moodCounts.set(c.mood, (moodCounts.get(c.mood) || 0) + 1);
    }
  }

  const moodDistribution = [...moodCounts.entries()]
    .map(([mood, count]) => ({
      mood,
      label: MOOD_LABELS[mood]?.[lang] || mood,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const dominantMoodLabel = moodDistribution[0]
    ? `${moodDistribution[0].label} (${moodDistribution[0].count}x)`
    : (id ? 'Belum dicatat' : 'Not logged');

  // Workout habits
  const workoutActs = activities.filter((a) => a.category === 'FITNESS');
  const fatigueCounts = { manageable: 0, tired: 0, very_tired: 0 };
  let painCount = 0;
  for (const w of workoutActs) {
    if (w.workout?.fatigue) fatigueCounts[w.workout.fatigue]++;
    if (w.workout?.pain) painCount++;
  }
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeekActiveDays = new Set(
    workoutActs
      .filter((w) => w.minutes > 0 && Date.parse(w.dateKey + 'T00:00:00') >= weekStart.getTime())
      .map((w) => w.dateKey)
  ).size;

  const workoutStats = {
    totalSessions: categorySessions.fitness,
    totalMinutes: categoryMinutes.fitness,
    fatigueCounts,
    painCount,
    weeklyTarget: profile?.gym?.days ?? 2,
    thisWeekActiveDays,
  };

  // Dream progress
  const currentSteps = profile ? getCurrentDreamSteps(profile) : [];
  const completedSteps = currentSteps.filter((s) => s.completed).length;
  const completedActionsCount = currentSteps.reduce((sum, s) => sum + (s.completedActions?.length || 0), 0);
  const dreamStats = {
    completedSteps,
    totalSteps: currentSteps.length,
    progressPct: currentSteps.length ? Math.round((completedSteps / currentSteps.length) * 100) : 0,
    completedActionsCount,
  };

  // Top skills
  const skillMap = new Map<string, { name: string; sessions: number; totalMinutes: number; permanent: boolean }>();
  if (profile) {
    for (const s of profile.shadows || []) {
      skillMap.set(s.name.toLowerCase(), {
        name: s.name,
        sessions: s.sessions || 0,
        totalMinutes: s.totalMinutes || 0,
        permanent: true,
      });
    }
    for (const sp of Object.values(profile.skillProgress || {})) {
      const k = sp.name.toLowerCase();
      if (!skillMap.has(k)) {
        skillMap.set(k, {
          name: sp.name,
          sessions: sp.sessions || 0,
          totalMinutes: sp.totalMinutes || 0,
          permanent: Boolean(sp.unlocked),
        });
      }
    }
  }
  const topSkills = [...skillMap.values()]
    .sort((a, b) => b.totalMinutes - a.totalMinutes || b.sessions - a.sessions)
    .slice(0, 8);

  // Coin stats
  let totalEarned = 0;
  let totalRedeemed = 0;
  let totalAdminAdjusted = 0;
  let totalPartnerTx = 0;
  for (const tx of transactions) {
    if (tx.type === 'earn') totalEarned += Math.max(0, tx.amount);
    else if (tx.type === 'redeem') totalRedeemed += Math.abs(tx.amount);
    else if (tx.type === 'admin_adjust') totalAdminAdjusted += tx.amount;
    else if (tx.type === 'partner_tx') totalPartnerTx += tx.amount;
  }

  const streaks = {
    daily: profile ? getEffectiveStreak(profile.streak, profile.lastActiveStreakDate, today) : 0,
    dailyLongest: profile?.longestStreak ?? profile?.streak ?? 0,
    task: profile ? getEffectiveStreak(profile.taskStreak, profile.lastTaskStreakDate, today) : 0,
    taskLongest: profile?.longestTaskStreak ?? profile?.taskStreak ?? 0,
    workout: profile ? getEffectiveStreak(profile.workoutStreak, profile.lastWorkoutStreakDate, today) : 0,
    workoutLongest: profile?.longestWorkoutStreak ?? profile?.workoutStreak ?? 0,
  };

  // Alerts & Tendencies
  const alerts: Array<{ severity: 'warning' | 'danger'; text: string }> = [];
  const tendencies: string[] = [];

  if (painCount > 0 || profile?.gym?.currentPain) {
    alerts.push({
      severity: 'danger',
      text: id
        ? `Ada catatan nyeri latihan (${painCount}x di jurnal${profile?.gym?.currentPain ? ' & profil gym aktif nyeri' : ''}) — perlu pantauan pemulihan.`
        : `Workout pain reported (${painCount}x in journal${profile?.gym?.currentPain ? ' & active pain flag' : ''}) — needs recovery attention.`,
    });
  }
  if (profile?.career?.projectStatus === 'blocked') {
    alerts.push({
      severity: 'warning',
      text: id
        ? `Proyek "${profile.career.project || 'Aktif'}" berstatus TERHAMBAT — butuh pendampingan.`
        : `Project "${profile.career.project || 'Active'}" is marked BLOCKED — may need coaching.`,
    });
  }
  const heavyMoods = (moodCounts.get('anxious') || 0) + (moodCounts.get('overwhelmed') || 0) + (moodCounts.get('sad') || 0);
  if (heavyMoods >= 2) {
    alerts.push({
      severity: 'warning',
      text: id
        ? `Tercatat ${heavyMoods}x mood berat (cemas / kewalahan / sedih) — perhatikan beban aktivitas peserta.`
        : `Recorded ${heavyMoods} heavy moods (anxious / overwhelmed / sad) — monitor workload.`,
    });
  }
  if (sleepStats.average !== null && sleepStats.average < sleepMinThreshold) {
    alerts.push({
      severity: 'warning',
      text: id
        ? `Rata-rata tidur ${sleepStats.average} jam/malam (di bawah anjuran ${sleepMinThreshold} jam).`
        : `Average sleep is ${sleepStats.average} hrs/night (below ${sleepMinThreshold}h recommendation).`,
    });
  }
  if (mealPatternDistribution.skipped >= 2) {
    alerts.push({
      severity: 'warning',
      text: id
        ? `Melewatkan jam makan sebanyak ${mealPatternDistribution.skipped}x dalam catatan check-in.`
        : `Logged missed meals ${mealPatternDistribution.skipped} times.`,
    });
  }

  // Build data-backed tendency sentences
  const totalTimeSignals = timeOfDay.morning + timeOfDay.afternoon + timeOfDay.evening + timeOfDay.lateNight;
  if (totalTimeSignals > 0 && topTime) {
    const pct = Math.round((topTime[1] / totalTimeSignals) * 100);
    tendencies.push(
      id
        ? `Ritme waktu: paling aktif di sesi ${topTime[2]} (${pct}% aktivitas tercatat), hari puncak ${peakWeekdayLabel}.`
        : `Time rhythm: most active during ${topTime[2]} (${pct}% of logs), peak day ${peakWeekdayLabel}.`
    );
  }
  if (totalCatMin > 0) {
    const fitShare = Math.round((categoryMinutes.fitness / totalCatMin) * 100);
    tendencies.push(
      id
        ? `Kecenderungan fokus: dominan di ${dominantCategoryLabel}. Total ${categoryMinutes.study}m belajar, ${categoryMinutes.work}m kerja, ${categoryMinutes.fitness}m olahraga.`
        : `Focus tendency: dominated by ${dominantCategoryLabel}. Total ${categoryMinutes.study}m study, ${categoryMinutes.work}m work, ${categoryMinutes.fitness}m workout.`
    );
    if (fitShare < 15 && categorySessions.work + categorySessions.study >= 3) {
      tendencies.push(
        id
          ? 'Porsi olahraga masih rendah (<15% total durasi) dibanding belajar/kerja.'
          : 'Workout share is still low (<15% of logged minutes) compared to study/work.'
      );
    }
  }
  if (streaks.daily > 0 || streaks.task > 0 || streaks.workout > 0) {
    tendencies.push(
      id
        ? `Kebiasaan streak: Harian ${streaks.daily}h (rekor ${streaks.dailyLongest}h) · Tugas ${streaks.task}h · Workout ${streaks.workout}h.`
        : `Streak habit: Daily ${streaks.daily}d (best ${streaks.dailyLongest}d) · Task ${streaks.task}d · Workout ${streaks.workout}d.`
    );
  }
  if (moodDistribution.length > 0) {
    tendencies.push(
      id
        ? `Kecenderungan emosi: mood paling sering muncul adalah ${moodDistribution[0].label} (${moodDistribution[0].count}x dari ${checkIns.length} check-in).`
        : `Mood tendency: most frequent mood is ${moodDistribution[0].label} (${moodDistribution[0].count}x across ${checkIns.length} check-ins).`
    );
  }
  const totalMeals = mealPatternDistribution.varied + mealPatternDistribution.partial + mealPatternDistribution.skipped;
  if (totalMeals > 0) {
    const variedPct = Math.round((mealPatternDistribution.varied / totalMeals) * 100);
    tendencies.push(
      id
        ? `Kebiasaan makan: ${variedPct}% beragam, ${mealPatternDistribution.partial}x kurang beragam, ${mealPatternDistribution.skipped}x terlewat.`
        : `Meal habit: ${variedPct}% varied, ${mealPatternDistribution.partial}x limited variety, ${mealPatternDistribution.skipped}x skipped.`
    );
  }
  if (sleepStats.average !== null) {
    tendencies.push(
      id
        ? `Kebiasaan tidur: rata-rata ${sleepStats.average} jam (${sleepStats.min}–${sleepStats.max} jam dari ${sleepStats.loggedCount} malam tercatat).`
        : `Sleep habit: average ${sleepStats.average}h (${sleepStats.min}–${sleepStats.max}h across ${sleepStats.loggedCount} nights).`
    );
  }
  if (profile?.rewardInterest) {
    tendencies.push(
      id
        ? `Preferensi hadiah/transaksi: ${profile.rewardInterest}.`
        : `Reward preference: ${profile.rewardInterest}.`
    );
  }

  return {
    activeDaysCount: activeDateSet.size,
    activeDaysLast14,
    consistencyPct14,
    streaks,
    timeOfDayDistribution: timeOfDay,
    peakTimeLabel,
    weekdayActivity,
    peakWeekdayLabel,
    categoryMinutes,
    categorySessions,
    dominantCategoryLabel,
    sleepStats,
    energyDistribution,
    mealPatternDistribution,
    mealGroupCounts,
    mealEnjoymentCounts,
    moodDistribution,
    dominantMoodLabel,
    workoutStats,
    dreamStats,
    topSkills,
    coinStats: {
      currentBalance: profile?.gold ?? 0,
      totalEarned,
      totalRedeemed,
      totalAdminAdjusted,
      totalPartnerTx,
    },
    alerts,
    tendencies,
  };
}
