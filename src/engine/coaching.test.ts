import { describe, expect, it } from 'vitest';
import { buildCapturedTargetPlan, parseDailyTargetLine, workoutPlan } from './coaching';
import { createInitialPlayerProfile, DEFAULT_COIN_ECONOMY } from './science';
import { PROFESSIONS_DB } from '../data/professions';
import { getDailyEvidence } from './journal';

function makePlayer() {
  return createInitialPlayerProfile(
    {
      name: 'Sari',
      gender: 'female',
      age: 28,
      height: 162,
      weight: 56,
      city: 'Surabaya',
      rewardInterest: 'Buku bisnis',
      goal: 'Buka kedai kopi sosial',
      targetLevel: 15,
      dailyBudget: 150,
      career: {
        industry: 'Edutech',
        responsibilities: 'Mengelola operasional tim konten',
        managesTeam: true,
        usesSprints: true,
        project: 'Peluncuran Kurikulum Q4',
        projectStatus: 'in_progress',
        lastMeeting: '',
        nextAction: 'Review backlog konten minggu ini',
      },
      gym: {
        goal: 'strength',
        level: 'beginner',
        equipment: 'home',
        days: 3,
        limitations: '',
        currentPain: false,
      },
      selectedPreset: PROFESSIONS_DB[0],
      lang: 'id',
    },
    DEFAULT_COIN_ECONOMY
  );
}

describe('coaching engine — dual-track target capture & workout safety', () => {
  it('parses duration, reps, fitness, study, and dream keyword lines accurately', () => {
    const player = makePlayer();

    const gymLine = parseDailyTargetLine('- Push-up 3x12 pagi ini', player, 'id');
    expect(gymLine?.quest.category).toBe('FITNESS');
    expect(gymLine?.quest.unitType).toBe('REPS');
    expect(gymLine?.quest.defaultQty).toBe(36);
    expect(gymLine?.track).toBe('fitness');

    const studyLine = parseDailyTargetLine('Belajar akuntansi 45 menit', player, 'id');
    expect(studyLine?.quest.category).toBe('STUDY');
    expect(studyLine?.quest.defaultQty).toBe(45);

    const dreamLine = parseDailyTargetLine('Riset lokasi kedai kopi sosial 1.5 jam', player, 'id');
    expect(dreamLine?.track).toBe('dream');
    expect(dreamLine?.quest.dreamStepId).toBe(player.dreamSteps[0].id);
    expect(dreamLine?.quest.defaultQty).toBe(90);
  });

  it('auto-adds a Dream companion task when daily targets only cover Career (dual-track guarantee)', () => {
    const player = makePlayer();
    const plan = buildCapturedTargetPlan('Rapat evaluasi sprint tim operasional 30 menit', player, 'id', {
      includeDualTrackCompanion: true,
    });

    expect(plan.userTasks).toHaveLength(1);
    expect(plan.userTasks[0].track).toBe('career');
    expect(plan.companionTasks).toHaveLength(1);
    expect(plan.companionTasks[0].autoCompanion).toBe('dream');
    expect(plan.companionTasks[0].quest.dreamStepId).toBe(player.dreamSteps[0].id);
    expect(plan.allQuestsToAdd).toHaveLength(2);
  });

  it('auto-adds a Career companion task when daily targets only cover Dream', () => {
    const player = makePlayer();
    const plan = buildCapturedTargetPlan('Buat rencana menu kedai kopi impian', player, 'id', {
      includeDualTrackCompanion: true,
    });

    expect(plan.userTasks[0].track).toBe('dream');
    expect(plan.companionTasks.some((t) => t.autoCompanion === 'career')).toBe(true);
  });

  it('stops workout recommendations when pain is flagged', () => {
    const player = makePlayer();
    player.gym = { ...player.gym!, currentPain: true };
    const evidence = getDailyEvidence([], [], '2026-11-27', player.age);
    const plan = workoutPlan(player, evidence, [], 'id');
    expect(plan).not.toBeNull();
    expect(plan?.exercises).toEqual([]);
    expect(plan?.readinessText).toMatch(/nyeri/i);
  });
});
