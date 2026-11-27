import { describe, expect, it } from 'vitest';
import { deriveWellnessConditions, getDailyEvidence, type CheckIn } from './journal';

describe('journal engine — daily evidence & derived wellness conditions (DEBT-03)', () => {
  it('derives poor sleep and deficit nutrition from skipped meals and short sleep', () => {
    const checkIn: CheckIn = {
      id: '2026-11-27-morning',
      dateKey: '2026-11-27',
      phase: 'morning',
      kind: 'checkin',
      sleepHours: 5,
      meal: 'skipped',
      mealNote: '',
      mealGroups: [],
      energy: 'tired',
      mood: 'anxious',
      note: 'Target selesai laporan',
      extraMinutes: 0,
      updatedAt: Date.now(),
    };
    const evidence = getDailyEvidence([checkIn], [], '2026-11-27', 26);
    const derived = deriveWellnessConditions(evidence, 'moderate', 'balanced');

    expect(evidence.shortSleep).toBe(true);
    expect(derived.sleepCondition).toBe('poor');
    expect(derived.nutritionCondition).toBe('deficit');
  });

  it('derives optimal sleep and high_protein nutrition when well-rested with protein-rich varied meal', () => {
    const checkIn: CheckIn = {
      id: '2026-11-27-day',
      dateKey: '2026-11-27',
      phase: 'day',
      kind: 'checkin',
      sleepHours: 8,
      meal: 'varied',
      mealNote: 'Nasi, tempe, ayam, sayur, buah',
      mealGroups: ['staple', 'protein', 'vegetables', 'fruit'],
      energy: 'fresh',
      mood: 'hopeful',
      note: '',
      extraMinutes: 0,
      updatedAt: Date.now(),
    };
    const evidence = getDailyEvidence([checkIn], [], '2026-11-27', 26);
    const derived = deriveWellnessConditions(evidence, 'moderate', 'balanced');

    expect(derived.sleepCondition).toBe('optimal');
    expect(derived.nutritionCondition).toBe('high_protein');
  });

  it('preserves fallback values when no journal check-in exists for today', () => {
    const evidence = getDailyEvidence([], [], '2026-11-27', 26);
    const derived = deriveWellnessConditions(evidence, 'moderate', 'balanced');
    expect(derived).toEqual({ sleepCondition: 'moderate', nutritionCondition: 'balanced' });
  });
});
