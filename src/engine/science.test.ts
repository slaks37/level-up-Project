import { describe, expect, it } from 'vitest';
import {
  advanceStreakCounter,
  applyExpAndLevelUp,
  applyQuestCompletion,
  calculateBiometrics,
  createInitialPlayerProfile,
  DEFAULT_COIN_ECONOMY,
  getEffectiveStreak,
  normalizePlayerProfile,
} from './science';
import { PROFESSIONS_DB } from '../data/professions';
import type { PlayerProfile, Quest } from '../types';

function makeTestProfile(): PlayerProfile {
  return createInitialPlayerProfile(
    {
      name: 'Raka',
      gender: 'male',
      age: 26,
      height: 172,
      weight: 68,
      city: 'Bandung',
      rewardInterest: 'Kopi lokal',
      goal: 'Bangun usaha kopi berkelanjutan',
      targetLevel: 15,
      dailyBudget: 150,
      selectedPreset: PROFESSIONS_DB[0],
      lang: 'id',
    },
    DEFAULT_COIN_ECONOMY
  );
}

describe('science engine — biometrics, streaks, progression & coin economy', () => {
  it('computes accurate BMI, Mifflin-St Jeor BMR, and protein targets', () => {
    const male = calculateBiometrics(26, 172, 68, 'male', 'id');
    expect(male.bmi).toBe(23);
    expect(male.bmiCategory).toBe('Ideal');
    expect(male.bmr).toBe(1630);
    expect(male.proteinTarget).toBe(109);

    const female = calculateBiometrics(26, 160, 55, 'female', 'en');
    expect(female.bmr).toBe(1259);
    expect(female.bmiCategory).toBe('Normal');
  });

  it('advances streaks consecutively, stays idempotent same-day, and resets after missed days', () => {
    const day1 = advanceStreakCounter(0, 0, '', '2026-11-25');
    expect(day1).toEqual({ count: 1, longest: 1, lastDate: '2026-11-25', incremented: true });

    const sameDay = advanceStreakCounter(day1.count, day1.longest, day1.lastDate, '2026-11-25');
    expect(sameDay).toEqual({ count: 1, longest: 1, lastDate: '2026-11-25', incremented: false });

    const day2 = advanceStreakCounter(day1.count, day1.longest, day1.lastDate, '2026-11-26');
    expect(day2).toEqual({ count: 2, longest: 2, lastDate: '2026-11-26', incremented: true });

    const missed = advanceStreakCounter(day2.count, day2.longest, day2.lastDate, '2026-11-29');
    expect(missed).toEqual({ count: 1, longest: 2, lastDate: '2026-11-29', incremented: true });

    expect(getEffectiveStreak(5, '2026-11-26', '2026-11-27')).toBe(5);
    expect(getEffectiveStreak(5, '2026-11-24', '2026-11-27')).toBe(0);
  });

  it('awards 1 coin per task/workout, separates task vs workout streaks, and unlocks permanent skills', () => {
    const profile = makeTestProfile();
    const taskQuest: Quest = {
      id: 'q_study_1',
      title: 'Riset petani kopi',
      category: 'STUDY',
      unitType: 'MINUTES',
      defaultQty: 60,
      skillTag: 'Riset Pasar',
      dreamStepId: profile.dreamSteps[0].id,
      exp: 30,
      gold: 1,
      completed: false,
    };
    const workoutQuest: Quest = {
      id: 'q_fit_1',
      title: 'Push-up rutin',
      category: 'FITNESS',
      unitType: 'REPS',
      defaultQty: 30,
      estMinutes: 15,
      skillTag: 'Kekuatan Tubuh',
      dreamStepId: null,
      exp: 20,
      gold: 1,
      completed: false,
    };
    profile.quests = [taskQuest, workoutQuest];

    const res1 = applyQuestCompletion(profile, 'q_study_1', 120, 8, 'id', DEFAULT_COIN_ECONOMY, '2026-11-27');
    expect(res1.result.goldEarned).toBe(1);
    expect(res1.taskStreakIncremented).toBe(true);
    expect(res1.workoutStreakIncremented).toBe(false);
    expect(res1.nextPlayer.taskStreak).toBe(1);
    expect(res1.nextPlayer.workoutStreak).toBe(0);
    expect(res1.unlockedSkill).toBe('Riset Pasar');
    expect(res1.nextPlayer.shadows[0].name).toBe('Riset Pasar');

    // Completing the same quest twice must throw
    expect(() =>
      applyQuestCompletion(res1.nextPlayer, 'q_study_1', 60, 8, 'id', DEFAULT_COIN_ECONOMY, '2026-11-27')
    ).toThrow();

    const res2 = applyQuestCompletion(res1.nextPlayer, 'q_fit_1', 30, 8, 'id', DEFAULT_COIN_ECONOMY, '2026-11-27');
    expect(res2.result.goldEarned).toBe(1);
    expect(res2.workoutStreakIncremented).toBe(true);
    expect(res2.nextPlayer.workoutStreak).toBe(1);
    expect(res2.nextPlayer.taskStreak).toBe(1);
  });

  it('scales EXP curve cleanly and preserves sparse legacy profiles during normalization', () => {
    const profile = makeTestProfile();
    const leveled = applyExpAndLevelUp(profile, 250, DEFAULT_COIN_ECONOMY);
    expect(leveled.levelsGained).toBe(2);
    expect(leveled.nextPlayer.level).toBe(3);
    expect(leveled.levelUpGold).toBe(2);

    const legacy = normalizePlayerProfile({ name: 'Budi', level: 7, gold: 42 }, 'id');
    expect(legacy.name).toBe('Budi');
    expect(legacy.level).toBe(7);
    expect(legacy.gold).toBe(42);
    expect(legacy.dreamSteps.length).toBe(5);
    expect(legacy.schemaVersion).toBe(3);
  });
});
