import { getActiveDreamStep } from './coaching';
import type {
  Biometrics,
  CoinEconomyConfig,
  DailyBreakdown,
  DreamStep,
  Gender,
  Language,
  PlayerProfile,
  PlayerStats,
  ProfessionPreset,
  Quest,
  SelfReward,
} from '../types';

export const PLAYER_SCHEMA_VERSION = 3;

export const DEFAULT_COIN_ECONOMY: CoinEconomyConfig = {
  coinName: 'Koin Hadiah',
  coinSymbol: 'KOIN',
  pointPerTask: 1,
  pointPerWorkout: 1,
  pointPerCheckIn: 1,
  pointPerMilestone: 1,
  pointPerOverdrive: 1,
  pointPerDayClear: 1,
  pointPerLevelUp: 1,
  startingCoins: 0,
  idrPerCoin: 0,
  partnerName: 'MyValue',
  partnerEnabled: false,
  partnerEndpoint: '',
  minRedeemCoins: 10,
  transactionNote: '',
};

export function getOffsetDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getEffectiveStreak(
  count: number | undefined,
  lastDate: string | undefined,
  today = getTodayDateKey()
): number {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  if (safeCount === 0) return 0;
  if (!lastDate) return safeCount;
  if (lastDate === today || lastDate === getOffsetDateKey(today, -1)) return safeCount;
  return 0;
}

export function advanceStreakCounter(
  currentCount: number | undefined,
  currentLongest: number | undefined,
  lastDate: string | undefined,
  today = getTodayDateKey()
): { count: number; longest: number; lastDate: string; incremented: boolean } {
  const prevCount = Math.max(0, Math.round(Number(currentCount) || 0));
  const prevLongest = Math.max(prevCount, Math.round(Number(currentLongest) || 0));
  if (lastDate === today) {
    const count = Math.max(1, prevCount);
    return { count, longest: Math.max(prevLongest, count), lastDate: today, incremented: false };
  }
  const yesterday = getOffsetDateKey(today, -1);
  const consecutive = lastDate === yesterday || (!lastDate && prevCount > 0);
  const nextCount = consecutive ? prevCount + 1 : 1;
  return {
    count: nextCount,
    longest: Math.max(prevLongest, nextCount),
    lastDate: today,
    incremented: true,
  };
}

// =========================================================================
// BIOMETRICS & SCIENTIFIC ENGINE
// =========================================================================
export function calculateBiometrics(
  age: number,
  heightCm: number,
  weightKg: number,
  gender: Gender,
  lang: Language = 'id'
): Biometrics {
  const safeH = Math.max(100, Math.min(250, heightCm || 170));
  const safeW = Math.max(25, Math.min(300, weightKg || 65));
  const safeAge = Math.max(10, Math.min(120, age || 24));
  const hMeter = safeH / 100;
  const bmi = +(safeW / (hMeter * hMeter)).toFixed(1);

  // Mifflin-St Jeor Equation (1990)
  const genderConst = gender === 'female' ? -161 : 5;
  const bmr = Math.round(10 * safeW + 6.25 * safeH - 5 * safeAge + genderConst);

  // Morton et al. (2018, BJSM): 1.6g protein/kg BW/day optimal ceiling
  const proteinTarget = Math.round(safeW * 1.6);

  let bmiCategory = lang === 'id' ? 'Ideal' : 'Normal';
  if (bmi < 18.5) bmiCategory = lang === 'id' ? 'Kurus' : 'Underweight';
  else if (bmi >= 25 && bmi < 30) bmiCategory = lang === 'id' ? 'Berlebih' : 'Overweight';
  else if (bmi >= 30) bmiCategory = lang === 'id' ? 'Obesitas' : 'Obese';

  return { bmi, bmiCategory, bmr, proteinTarget };
}

export interface ScientificGainResult {
  gains: PlayerStats;
  expEarned: number;
  goldEarned: number;
  intensityFactor: number;
  loggedMinutes: number;
}

export function computeScientificStatGains(
  player: PlayerProfile,
  quest: Quest,
  qty: number,
  rpe: number,
  coinConfig: CoinEconomyConfig = DEFAULT_COIN_ECONOMY
): ScientificGainResult {
  const safeQty = Math.max(1, qty);
  const safeRpe = Math.max(5, Math.min(10, rpe));
  const baselineGameBalance = 0.95;
  const intensityFactor = +(0.65 + (safeRpe - 5) * 0.11).toFixed(2); // RPE 5 -> 0.65x, RPE 8 -> 0.98x, RPE 10 -> 1.20x
  const weightRatio = (player.weight || 65) / 65;

  const gains: PlayerStats = { str: 0, vit: 0, int: 0, agi: 0, cha: 0 };

  if (quest.category === 'FITNESS') {
    // Schoenfeld et al. (2017): Mechanical tension & volume load drive hypertrophy & strength
    if (quest.unitType === 'REPS') {
      const effectiveLoad = (safeQty / 40) * weightRatio * intensityFactor * baselineGameBalance;
      gains.str = +(0.14 * effectiveLoad).toFixed(2);
      gains.vit = +(0.07 * effectiveLoad).toFixed(2);
      gains.cha = +(0.04 * effectiveLoad).toFixed(2);
    } else {
      // Aerobic / Zone 2 VO2 adaptation
      const cardioLoad = (safeQty / 30) * intensityFactor * baselineGameBalance;
      gains.vit = +(0.15 * cardioLoad).toFixed(2);
      gains.str = +(0.05 * cardioLoad).toFixed(2);
      gains.agi = +(0.04 * cardioLoad).toFixed(2);
    }
  } else if (quest.category === 'STUDY') {
    // Ericsson et al. (1993) & Dunlosky et al. (2013): Deliberate practice & active recall
    const studyLoad = (safeQty / 45) * intensityFactor * baselineGameBalance;
    gains.int = +(0.16 * studyLoad).toFixed(2);
    gains.agi = +(0.06 * studyLoad).toFixed(2);
  } else {
    // CAREER / DREAM WORK: Deep execution & communication/leadership
    const workLoad = (safeQty / 60) * intensityFactor * baselineGameBalance;
    gains.agi = +(0.13 * workLoad).toFixed(2);
    gains.int = +(0.09 * workLoad).toFixed(2);
    gains.cha = +(0.07 * workLoad).toFixed(2);
  }

  const volumeScale = Math.min(2.0, Math.max(0.5, safeQty / Math.max(1, quest.defaultQty)));
  const expEarned = Math.max(10, Math.round((quest.exp || 20) * intensityFactor * baselineGameBalance * volumeScale));
  const configuredCoins =
    quest.category === 'FITNESS' ? coinConfig.pointPerWorkout : coinConfig.pointPerTask;
  const goldEarned = Math.max(0, Math.round(configuredCoins));
  const loggedMinutes =
    quest.unitType === 'MINUTES'
      ? Math.round(safeQty)
      : Math.max(10, Math.round((quest.estMinutes || 20) * volumeScale));

  return { gains, expEarned, goldEarned, intensityFactor, loggedMinutes };
}

export function computeDailyDurationBreakdown(totalMinutes: number, bio?: Biometrics): DailyBreakdown {
  const total = Math.max(60, Math.min(480, Number(totalMinutes) || 150));
  const fitRatio = bio && bio.bmi >= 25 ? 0.28 : 0.24;
  const studyRatio = 0.3;
  const fitness = Math.max(25, Math.round((total * fitRatio) / 5) * 5);
  const study = Math.max(25, Math.round((total * studyRatio) / 5) * 5);
  const work = Math.max(30, total - fitness - study);
  return { total: study + work + fitness, study, work, fitness };
}

export function applyExpAndLevelUp(
  player: PlayerProfile,
  amount: number,
  coinConfig: CoinEconomyConfig = DEFAULT_COIN_ECONOMY
): {
  nextPlayer: PlayerProfile;
  levelsGained: number;
  levelUpGold: number;
} {
  let exp = player.exp + Math.max(0, Math.round(amount));
  let level = player.level;
  let maxExp = player.maxExp;
  let gold = player.gold;
  let levelsGained = 0;
  let levelUpGold = 0;
  const perLevelCoin = Math.max(0, Math.round(coinConfig.pointPerLevelUp));

  while (exp >= maxExp && level < 999) {
    exp -= maxExp;
    level += 1;
    maxExp = Math.round(maxExp * 1.25);
    gold += perLevelCoin;
    levelUpGold += perLevelCoin;
    levelsGained += 1;
  }

  return {
    nextPlayer: {
      ...player,
      exp,
      level,
      maxExp,
      gold,
    },
    levelsGained,
    levelUpGold,
  };
}

export function getActiveStage(player: PlayerProfile) {
  const stages = player.stages?.length
    ? player.stages
    : [
        { rank: 'E-Rank', title: 'Pemula', minLvl: 1 },
        { rank: 'C-Rank', title: 'Spesialis', minLvl: 5 },
        { rank: 'A-Rank', title: 'Ahli', minLvl: 12 },
        { rank: 'S-Rank', title: 'Master', minLvl: 20 },
      ];
  let active = stages[0];
  for (const st of stages) {
    if (player.level >= st.minLvl) active = st;
  }
  return active;
}

export function applyQuestCompletion(
  player: PlayerProfile,
  questId: string,
  qty: number,
  rpe: number,
  lang: Language,
  coinConfig: CoinEconomyConfig = DEFAULT_COIN_ECONOMY,
  today = getTodayDateKey()
): {
  nextPlayer: PlayerProfile;
  result: ScientificGainResult;
  levelsGained: number;
  levelUpGold: number;
  milestoneGold: number;
  unlockedSkill: string | null;
  autoCompletedStepTitle: string | null;
  streakIncremented: boolean;
  taskStreakIncremented: boolean;
  workoutStreakIncremented: boolean;
} {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || quest.completed) {
    throw new Error('Quest not found or already completed');
  }

  const result = computeScientificStatGains(player, quest, qty, rpe, coinConfig);

  const nextStats: PlayerStats = {
    str: +(player.stats.str + result.gains.str).toFixed(2),
    vit: +(player.stats.vit + result.gains.vit).toFixed(2),
    int: +(player.stats.int + result.gains.int).toFixed(2),
    agi: +(player.stats.agi + result.gains.agi).toFixed(2),
    cha: +(player.stats.cha + result.gains.cha).toFixed(2),
  };

  const nextLog = { ...player.dailyDurationLog };
  if (quest.category === 'STUDY') nextLog.study += result.loggedMinutes;
  else if (quest.category === 'FITNESS') nextLog.fitness += result.loggedMinutes;
  else nextLog.work += result.loggedMinutes;

  const nextQuests = player.quests.map((q) =>
    q.id === questId
      ? { ...q, completed: true, completedQty: qty, completedRpe: rpe }
      : q
  );

  // Sync progress into linked Dream Step (or first active step if study/career)
  let autoCompletedStepTitle: string | null = null;
  let milestoneNewlyRewarded = false;
  const targetStepId = quest.dreamStepId === undefined && quest.category !== 'FITNESS'
    ? getActiveDreamStep(player)?.id : quest.dreamStepId;

  const nextDreamSteps = player.dreamSteps.map((step) => {
    if (step.id !== targetStepId || step.completed || step.archived) return step;
    const nextMins = step.completedMinutes + result.loggedMinutes;
    const reached = nextMins >= step.targetMinutes;
    if (reached) {
      autoCompletedStepTitle = step.title;
      if (!step.rewarded) milestoneNewlyRewarded = true;
    }
    return {
      ...step,
      completedMinutes: nextMins,
      completed: reached ? true : step.completed,
      rewarded: reached ? true : step.rewarded,
    };
  });

  // Update Auto Skill Arsenal (auto-unlock permanent skill at >= 3 sessions OR >= 120 mins)
  const rawTag = (quest.skillTag || '').trim();
  let unlockedSkill: string | null = null;
  const nextSkillProgress = { ...player.skillProgress };
  const nextShadows = [...player.shadows];

  if (rawTag) {
    const key = rawTag.toLowerCase();
    const existingPermanent = nextShadows.find((s) => s.name.toLowerCase() === key);
    if (existingPermanent) {
      const idx = nextShadows.findIndex((s) => s.name.toLowerCase() === key);
      const nextSessions = (existingPermanent.sessions || 3) + 1;
      const nextTotalMin = (existingPermanent.totalMinutes || 120) + result.loggedMinutes;
      const upgradedRank =
        nextSessions >= 12 || nextTotalMin >= 600
          ? 'Master Grade'
          : nextSessions >= 6 || nextTotalMin >= 300
            ? 'Knight Grade'
            : existingPermanent.rank;
      nextShadows[idx] = {
        ...existingPermanent,
        sessions: nextSessions,
        totalMinutes: nextTotalMin,
        rank: upgradedRank,
      };
    } else {
      const prev = nextSkillProgress[key] || {
        name: rawTag,
        sessions: 0,
        totalMinutes: 0,
        unlocked: false,
      };
      const sessions = prev.sessions + 1;
      const totalMinutes = prev.totalMinutes + result.loggedMinutes;
      const shouldUnlock = sessions >= 3 || totalMinutes >= 120;
      nextSkillProgress[key] = {
        name: prev.name,
        sessions,
        totalMinutes,
        unlocked: shouldUnlock,
      };
      if (shouldUnlock) {
        unlockedSkill = prev.name;
        nextShadows.unshift({
          name: prev.name,
          rank: lang === 'id' ? 'Rutin Terlatih' : 'Routine Unlocked',
          sessions,
          totalMinutes,
        });
      }
    }
  }

  const currentSteps = nextDreamSteps.filter((step) => !step.archived);
  const completedStepsCount = currentSteps.filter((s) => s.completed).length;
  const hpRemaining = Math.max(
    0,
    Math.round(
      ((Math.max(1, currentSteps.length) - completedStepsCount) /
        Math.max(1, currentSteps.length)) *
        (player.boss.maxHp || 1000)
    )
  );

  // Automatic Daily Streak + Task Streak + Workout Streak
  const overallStreak = advanceStreakCounter(
    player.streak,
    player.longestStreak,
    player.lastActiveStreakDate,
    today
  );
  const isWorkout = quest.category === 'FITNESS';
  const taskStreakRes = isWorkout
    ? {
        count: player.taskStreak ?? 0,
        longest: player.longestTaskStreak ?? 0,
        lastDate: player.lastTaskStreakDate || '',
        incremented: false,
      }
    : advanceStreakCounter(
        player.taskStreak,
        player.longestTaskStreak,
        player.lastTaskStreakDate,
        today
      );
  const workoutStreakRes = isWorkout
    ? advanceStreakCounter(
        player.workoutStreak,
        player.longestWorkoutStreak,
        player.lastWorkoutStreakDate,
        today
      )
    : {
        count: player.workoutStreak ?? 0,
        longest: player.longestWorkoutStreak ?? 0,
        lastDate: player.lastWorkoutStreakDate || '',
        incremented: false,
      };

  const bonusExpFromStep = autoCompletedStepTitle ? 25 : 0;
  const milestoneGold = milestoneNewlyRewarded ? Math.max(0, Math.round(coinConfig.pointPerMilestone)) : 0;

  const baseUpdated: PlayerProfile = {
    ...player,
    stats: nextStats,
    gold: player.gold + result.goldEarned + milestoneGold,
    streak: overallStreak.count,
    longestStreak: overallStreak.longest,
    lastActiveStreakDate: overallStreak.lastDate,
    taskStreak: taskStreakRes.count,
    longestTaskStreak: taskStreakRes.longest,
    lastTaskStreakDate: taskStreakRes.lastDate,
    workoutStreak: workoutStreakRes.count,
    longestWorkoutStreak: workoutStreakRes.longest,
    lastWorkoutStreakDate: workoutStreakRes.lastDate,
    coreCharge: Math.min(4, (player.coreCharge || 0) + 1),
    dailyDurationLog: nextLog,
    quests: nextQuests,
    dreamSteps: nextDreamSteps,
    skillProgress: nextSkillProgress,
    shadows: nextShadows,
    boss: {
      ...player.boss,
      hp: hpRemaining,
    },
  };

  const { nextPlayer, levelsGained, levelUpGold } = applyExpAndLevelUp(
    baseUpdated,
    result.expEarned + bonusExpFromStep,
    coinConfig
  );

  return {
    nextPlayer,
    result,
    levelsGained,
    levelUpGold,
    milestoneGold,
    unlockedSkill,
    autoCompletedStepTitle,
    streakIncremented: overallStreak.incremented,
    taskStreakIncremented: taskStreakRes.incremented,
    workoutStreakIncremented: workoutStreakRes.incremented,
  };
}

// =========================================================================
// DEFAULT GENERATORS (FALLBACKS & INITIAL STATE)
// =========================================================================
export function getDefaultRewards(lang: Language): SelfReward[] {
  return [
    {
      id: 'rew_1',
      name: lang === 'id' ? 'Kopi / Minuman Favorit' : 'Favorite Specialty Coffee',
      cost: 5,
      desc:
        lang === 'id'
          ? 'Nikmati istirahat 20 menit tanpa rasa bersalah.'
          : 'Enjoy a guilt-free 20-minute break.',
    },
    {
      id: 'rew_2',
      name: lang === 'id' ? 'Nonton 1 Episode Anime / Film' : 'Watch 1 Anime / Series Episode',
      cost: 8,
      desc:
        lang === 'id'
          ? 'Hiburan santai setelah tugas harian tuntas.'
          : 'Relaxing entertainment after completing daily tasks.',
    },
    {
      id: 'rew_3',
      name: lang === 'id' ? 'Cheat Meal Sehat Favorit' : 'Favorite Healthy Cheat Meal',
      cost: 15,
      desc:
        lang === 'id'
          ? 'Makanan enak untuk isi ulang energi.'
          : 'Delicious meal to recharge your energy.',
    },
    {
      id: 'rew_4',
      name: lang === 'id' ? 'Beli Buku / Gear Baru' : 'Buy New Book / Desk Gear',
      cost: 30,
      desc:
        lang === 'id'
          ? 'Investasi alat pendukung hobimu.'
          : 'Invest in gear that supports your craft.',
    },
  ];
}

export function createDefaultDreamSteps(
  goal: string,
  profession: string,
  targetLevel = 15,
  breakdown: DailyBreakdown = { total: 150, study: 45, work: 70, fitness: 35 },
  lang: Language = 'id'
): DreamStep[] {
  const lvl1 = Math.max(2, Math.round(targetLevel * 0.2));
  const lvl2 = Math.max(4, Math.round(targetLevel * 0.4));
  const lvl3 = Math.max(7, Math.round(targetLevel * 0.65));
  const lvl4 = Math.max(10, Math.round(targetLevel * 0.85));
  const lvl5 = targetLevel;
  const shortProf = profession.split('/')[0].trim();

  if (lang === 'en') {
    return [
      {
        id: 'ds_1',
        phase: 'Phase 1: Foundation',
        title: `Research & map concrete blueprint for "${goal}"`,
        coachTip: `Dedicate ${breakdown.study}m/day studying proven frameworks in ${profession}.`,
        targetLevel: lvl1,
        studyMinutes: breakdown.study,
        workMinutes: breakdown.work,
        targetMinutes: (breakdown.study + breakdown.work) * 2,
        completedMinutes: 0,
        skillName: 'Strategic Planning',
        completed: false,
      },
      {
        id: 'ds_2',
        phase: 'Phase 2: Core Skill',
        title: `Master core daily workflow & tools for ${shortProf}`,
        coachTip: 'Focus on distraction-free practice blocks so this becomes an automatic skill.',
        targetLevel: lvl2,
        studyMinutes: breakdown.study,
        workMinutes: breakdown.work,
        targetMinutes: (breakdown.study + breakdown.work) * 3,
        completedMinutes: 0,
        skillName: `${shortProf} Core`,
        completed: false,
      },
      {
        id: 'ds_3',
        phase: 'Phase 3: First Output',
        title: `Build & launch first real project/result toward "${goal}"`,
        coachTip: 'Turn theory into tangible proof you can test and measure.',
        targetLevel: lvl3,
        studyMinutes: breakdown.study,
        workMinutes: breakdown.work,
        targetMinutes: (breakdown.study + breakdown.work) * 3,
        completedMinutes: 0,
        skillName: 'Project Execution',
        completed: false,
      },
      {
        id: 'ds_4',
        phase: 'Phase 4: Optimization',
        title: 'Evaluate metrics, fix bottlenecks & level up quality',
        coachTip: 'Review real feedback and refine your execution speed & precision.',
        targetLevel: lvl4,
        studyMinutes: breakdown.study,
        workMinutes: breakdown.work,
        targetMinutes: (breakdown.study + breakdown.work) * 3,
        completedMinutes: 0,
        skillName: 'Analytical Optimization',
        completed: false,
      },
      {
        id: 'ds_5',
        phase: 'Phase 5: Target Achieved',
        title: `Scale up & achieve "${goal}" at Level ${lvl5}`,
        coachTip: `Maintain your physical stamina (${breakdown.fitness}m/day) to sustain peak performance.`,
        targetLevel: lvl5,
        studyMinutes: breakdown.study,
        workMinutes: breakdown.work,
        targetMinutes: (breakdown.study + breakdown.work) * 4,
        completedMinutes: 0,
        skillName: `Mastery: ${goal.slice(0, 24)}`,
        completed: false,
      },
    ];
  }

  return [
    {
      id: 'ds_1',
      phase: 'Tahap 1: Fondasi',
      title: `Riset & susun rencana detail untuk "${goal}"`,
      coachTip: `Luangkan ${breakdown.study} mnt/hari belajar dasar terbaik di bidang ${profession}.`,
      targetLevel: lvl1,
      studyMinutes: breakdown.study,
      workMinutes: breakdown.work,
      targetMinutes: (breakdown.study + breakdown.work) * 2,
      completedMinutes: 0,
      skillName: 'Perencanaan Strategis',
      completed: false,
    },
    {
      id: 'ds_2',
      phase: 'Tahap 2: Skill Inti',
      title: `Kuasai alat & alur kerja utama ${shortProf} secara rutin`,
      coachTip: 'Praktik fokus tanpa gangguan HP agar kebiasaan ini otomatis jadi skill permanen.',
      targetLevel: lvl2,
      studyMinutes: breakdown.study,
      workMinutes: breakdown.work,
      targetMinutes: (breakdown.study + breakdown.work) * 3,
      completedMinutes: 0,
      skillName: `Eksekusi Inti ${shortProf}`,
      completed: false,
    },
    {
      id: 'ds_3',
      phase: 'Tahap 3: Hasil Nyata',
      title: `Buat karya / hasil nyata pertama menuju "${goal}"`,
      coachTip: 'Ubah teori menjadi bukti nyata yang bisa diuji langsung di lapangan.',
      targetLevel: lvl3,
      studyMinutes: breakdown.study,
      workMinutes: breakdown.work,
      targetMinutes: (breakdown.study + breakdown.work) * 3,
      completedMinutes: 0,
      skillName: 'Eksekusi Proyek Nyata',
      completed: false,
    },
    {
      id: 'ds_4',
      phase: 'Tahap 4: Evaluasi & Perbaikan',
      title: 'Ukur hasil, perbaiki kekurangan & tingkatkan kualitas',
      coachTip: 'Catat apa yang berhasil dan tingkatkan kecepatan serta ketepatan kerjamu.',
      targetLevel: lvl4,
      studyMinutes: breakdown.study,
      workMinutes: breakdown.work,
      targetMinutes: (breakdown.study + breakdown.work) * 3,
      completedMinutes: 0,
      skillName: 'Evaluasi & Optimasi Kerja',
      completed: false,
    },
    {
      id: 'ds_5',
      phase: 'Tahap 5: Target Tercapai',
      title: `Perbesar skala & wujudkan "${goal}" di Level ${lvl5}`,
      coachTip: `Jaga stamina fisik (${breakdown.fitness} mnt/hari) agar performamu tetap puncak.`,
      targetLevel: lvl5,
      studyMinutes: breakdown.study,
      workMinutes: breakdown.work,
      targetMinutes: (breakdown.study + breakdown.work) * 4,
      completedMinutes: 0,
      skillName: `Mastery: ${goal.slice(0, 24)}`,
      completed: false,
    },
  ];
}

export interface CreateProfileInput {
  name: string;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  city: string;
  rewardInterest: string;
  goal: string;
  targetLevel: number;
  dailyBudget: number;
  customProfName?: string;
  career?: PlayerProfile['career'];
  gym?: PlayerProfile['gym'];
  selectedPreset: ProfessionPreset;
  lang: Language;
}

export function createInitialPlayerProfile(
  input: CreateProfileInput,
  coinConfig: CoinEconomyConfig = DEFAULT_COIN_ECONOMY
): PlayerProfile {
  const isCustom = Boolean(input.customProfName && input.customProfName.trim());
  const profName = isCustom ? input.customProfName!.trim() : input.selectedPreset.name;
  const classTitle = isCustom ? 'Awakened Vanguard' : input.selectedPreset.classTitle;
  const stages = isCustom
    ? [
        { rank: 'E-Rank', title: 'Pemula (Initiate)', minLvl: 1 },
        { rank: 'C-Rank', title: 'Spesialis', minLvl: 5 },
        { rank: 'A-Rank', title: 'Ahli Utama', minLvl: 12 },
        { rank: 'S-Rank', title: 'Master', minLvl: 20 },
      ]
    : input.selectedPreset.stages;

  const defaultShadows = isCustom
    ? [{ name: 'Kebiasaan Fokus Mendalam', rank: 'Knight Grade', sessions: 3, totalMinutes: 180 }]
    : input.selectedPreset.defaultShadows.map((s) => ({ ...s }));

  const bio = calculateBiometrics(input.age, input.height, input.weight, input.gender, input.lang);
  const dailyBreakdown = computeDailyDurationBreakdown(input.dailyBudget, bio);
  const dreamSteps = createDefaultDreamSteps(
    input.goal,
    profName,
    input.targetLevel,
    dailyBreakdown,
    input.lang
  );

  return {
    schemaVersion: PLAYER_SCHEMA_VERSION,
    name: input.name.trim(),
    gender: input.gender,
    age: input.age,
    height: input.height,
    weight: input.weight,
    city: input.city.trim() || 'Surabaya',
    rewardInterest: input.rewardInterest.trim(),
    bio,
    profession: profName,
    ...(input.career ? { career: input.career } : {}),
    ...(input.gym ? { gym: input.gym } : {}),
    classTitle,
    goal: input.goal.trim(),
    targetLevel: input.targetLevel,
    dailyBreakdown,
    dailyDurationLog: { study: 0, work: 0, fitness: 0 },
    coachAdvice:
      input.lang === 'id'
        ? `Fokus selesaikan Tahap #1 (${dailyBreakdown.study}m belajar + ${dailyBreakdown.work}m kerja + ${dailyBreakdown.fitness}m olahraga/hari) untuk naik menuju Level ${input.targetLevel}.`
        : `Focus on completing Phase #1 (${dailyBreakdown.study}m study + ${dailyBreakdown.work}m work + ${dailyBreakdown.fitness}m workout/day) to climb toward Level ${input.targetLevel}.`,
    level: 1,
    exp: 0,
    maxExp: 100,
    gold: Math.max(0, Math.round(coinConfig.startingCoins ?? 0)),
    streak: 0,
    taskStreak: 0,
    workoutStreak: 0,
    longestStreak: 0,
    longestTaskStreak: 0,
    longestWorkoutStreak: 0,
    lastActiveStreakDate: '',
    lastTaskStreakDate: '',
    lastWorkoutStreakDate: '',
    coreCharge: 0,
    sleepCondition: 'moderate',
    nutritionCondition: 'balanced',
    stats: { str: 10, vit: 10, int: 10, agi: 10, cha: 10 },
    stages,
    quests: [],
    shadows: defaultShadows,
    skillProgress: {},
    dreamSteps,
    rewards: getDefaultRewards(input.lang),
    discoveredPerks: [],
    growthNews: [],
    groundingSources: [],
    boss: {
      name: input.goal.trim(),
      desc: input.goal.trim(),
      hp: 1000,
      maxHp: 1000,
    },
  };
}

export function normalizePlayerProfile(raw: Partial<PlayerProfile>, lang: Language): PlayerProfile {
  const age = Number(raw.age) || 24;
  const height = Number(raw.height) || 170;
  const weight = Number(raw.weight) || 65;
  const gender: Gender = raw.gender === 'female' ? 'female' : 'male';
  const bio = raw.bio ?? calculateBiometrics(age, height, weight, gender, lang);
  const dailyBreakdown = raw.dailyBreakdown ?? computeDailyDurationBreakdown(150, bio);
  const goal = raw.goal || (lang === 'id' ? 'Mencapai Karier & Fisik Ideal' : 'Reach Career & Fitness Peak');
  const profession = raw.profession || 'Entrepreneur';
  const targetLevel = Number(raw.targetLevel) || 15;
  const city = raw.city || 'Surabaya';
  const rewardInterest = typeof raw.rewardInterest === 'string' ? raw.rewardInterest : '';
  const dreamSteps =
    Array.isArray(raw.dreamSteps) && raw.dreamSteps.length > 0
      ? raw.dreamSteps
      : createDefaultDreamSteps(goal, profession, targetLevel, dailyBreakdown, lang);

  const hasV4Fields =
    raw.schemaVersion === 4 ||
    Boolean(raw.pathwayId) ||
    Boolean(raw.awakeningV2Completed) ||
    Boolean(raw.purposeStatement);

  return {
    schemaVersion: hasV4Fields ? 4 : PLAYER_SCHEMA_VERSION,
    name: raw.name || 'Hunter',
    gender,
    age,
    height,
    weight,
    city,
    rewardInterest,
    bio,
    profession,
    ...(raw.career ? { career: raw.career } : {}),
    ...(raw.gym ? { gym: raw.gym } : {}),
    classTitle: raw.classTitle || 'Awakened Vanguard',
    goal,
    targetLevel,
    dailyBreakdown,
    dailyDurationLog: raw.dailyDurationLog ?? { study: 0, work: 0, fitness: 0 },
    coachAdvice:
      raw.coachAdvice ||
      (lang === 'id'
        ? 'AI Coach siap memandu langkah demi langkah hingga target levelmu tercapai.'
        : 'AI Coach is ready to guide you step by step to your target level.'),
    level: Math.max(1, Number(raw.level) || 1),
    exp: Math.max(0, Number(raw.exp) || 0),
    maxExp: Math.max(100, Number(raw.maxExp) || 100),
    gold: Math.max(0, Number(raw.gold) || 0),
    streak: Math.max(0, Number(raw.streak) || 0),
    taskStreak: Math.max(0, Number(raw.taskStreak) || 0),
    workoutStreak: Math.max(0, Number(raw.workoutStreak) || 0),
    longestStreak: Math.max(Number(raw.streak) || 0, Number(raw.longestStreak) || 0),
    longestTaskStreak: Math.max(Number(raw.taskStreak) || 0, Number(raw.longestTaskStreak) || 0),
    longestWorkoutStreak: Math.max(Number(raw.workoutStreak) || 0, Number(raw.longestWorkoutStreak) || 0),
    lastActiveStreakDate: typeof raw.lastActiveStreakDate === 'string' ? raw.lastActiveStreakDate.slice(0, 10) : '',
    lastTaskStreakDate: typeof raw.lastTaskStreakDate === 'string' ? raw.lastTaskStreakDate.slice(0, 10) : '',
    lastWorkoutStreakDate: typeof raw.lastWorkoutStreakDate === 'string' ? raw.lastWorkoutStreakDate.slice(0, 10) : '',
    coreCharge: Math.max(0, Math.min(4, Number(raw.coreCharge) || 0)),
    sleepCondition: raw.sleepCondition || 'moderate',
    nutritionCondition: raw.nutritionCondition || 'balanced',
    stats: {
      str: Number(raw.stats?.str) || 10,
      vit: Number(raw.stats?.vit) || 10,
      int: Number(raw.stats?.int) || 10,
      agi: Number(raw.stats?.agi) || 10,
      cha: Number(raw.stats?.cha) || 10,
    },
    stages: Array.isArray(raw.stages) && raw.stages.length > 0
      ? raw.stages
      : [
          { rank: 'E-Rank', title: 'Pemula', minLvl: 1 },
          { rank: 'C-Rank', title: 'Spesialis', minLvl: 5 },
          { rank: 'A-Rank', title: 'Ahli', minLvl: 12 },
          { rank: 'S-Rank', title: 'Master', minLvl: 20 },
        ],
    quests: Array.isArray(raw.quests) ? raw.quests : [],
    shadows: Array.isArray(raw.shadows) ? raw.shadows : [],
    skillProgress: raw.skillProgress && typeof raw.skillProgress === 'object' ? raw.skillProgress : {},
    dreamSteps,
    rewards: Array.isArray(raw.rewards) && raw.rewards.length > 0 ? raw.rewards : getDefaultRewards(lang),
    discoveredPerks: Array.isArray(raw.discoveredPerks) ? raw.discoveredPerks : [],
    growthNews: Array.isArray(raw.growthNews) ? raw.growthNews : [],
    groundingSources: Array.isArray(raw.groundingSources) ? raw.groundingSources : [],
    boss: raw.boss ?? { name: goal, desc: goal, hp: 1000, maxHp: 1000 },
    ...(raw.pathwayId ? { pathwayId: raw.pathwayId } : {}),
    ...(typeof raw.purposeStatement === 'string' && raw.purposeStatement.trim()
      ? { purposeStatement: raw.purposeStatement.trim().slice(0, 500) }
      : {}),
    ...(typeof raw.awakeningV2Completed === 'boolean'
      ? { awakeningV2Completed: raw.awakeningV2Completed }
      : {}),
    ...(Array.isArray(raw.availableResources)
      ? { availableResources: raw.availableResources.filter((r): r is string => typeof r === 'string').slice(0, 20) }
      : {}),
    ...(Array.isArray(raw.preferredActiveDays)
      ? { preferredActiveDays: raw.preferredActiveDays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6).slice(0, 7) }
      : {}),
    ...(raw.skillSelfRatings && typeof raw.skillSelfRatings === 'object'
      ? { skillSelfRatings: raw.skillSelfRatings }
      : {}),
    ...(typeof raw.competencyLevel === 'number'
      ? { competencyLevel: Math.max(1, Math.min(10, Math.round(raw.competencyLevel))) }
      : {}),
    ...(typeof raw.competencyPoints === 'number'
      ? { competencyPoints: Math.max(0, Math.round(raw.competencyPoints)) }
      : {}),
    ...(typeof raw.businessLevel === 'number'
      ? { businessLevel: Math.max(0, Math.min(10, Math.round(raw.businessLevel))) }
      : {}),
    ...(raw.businessStage ? { businessStage: raw.businessStage } : {}),
    ...(raw.activeVentureId !== undefined ? { activeVentureId: raw.activeVentureId } : {}),
  };
}

// =========================================================================
// WEB AUDIO API TACTICAL SOUND EFFECTS
// =========================================================================
let audioCtx: AudioContext | null = null;
let sfxMuted = false;

export function setSfxMuted(muted: boolean) {
  sfxMuted = muted;
}

export function isSfxMuted(): boolean {
  return sfxMuted;
}

export function playSFX(type: 'click' | 'quest' | 'levelup') {
  if (sfxMuted) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'quest') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'levelup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.09);
      osc.frequency.setValueAtTime(659.25, now + 0.18);
      osc.frequency.setValueAtTime(880, now + 0.27);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {
    // Ignore autoplay restrictions
  }
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
