import { describe, expect, it } from 'vitest';
import {
  AWAKENING_REFLECTION_QUESTIONS,
  ECOSYSTEM_NODES,
  EXPERIENCE_FEATURES,
  HERO_ROTATING_PROFESSIONS,
  IMPACT_FRAMEWORK_INDICATORS,
  IMPACT_GOALS,
  LEARNING_CYCLE_STEPS,
  PARTNERSHIP_CATEGORIES,
  PERSONA_PATHS,
  PROFESSION_STORIES,
  PUBLIC_NAV_LINKS,
  SIX_GROWTH_DIMENSIONS,
  TRANSFORMATION_STAGES,
  WORLD_CHANGES,
} from './homepageContent';
import { PROFESSIONS_DB } from './professions';

describe('Level Up Homepage Content & Integrity', () => {
  it('defines all 12 approved rotating hero professions and 6 public nav links', () => {
    expect(HERO_ROTATING_PROFESSIONS).toHaveLength(12);
    expect(PUBLIC_NAV_LINKS.map((n) => n.label)).toEqual([
      'Beranda',
      'Tentang Kami',
      'Perjalananmu',
      'Fitur',
      'Ekosistem',
      'Kolaborasi',
    ]);
  });

  it('maintains complete 5-act storytelling sections without missing items', () => {
    expect(AWAKENING_REFLECTION_QUESTIONS).toHaveLength(5);
    expect(WORLD_CHANGES).toHaveLength(4);
    expect(PROFESSION_STORIES).toHaveLength(6);
    expect(TRANSFORMATION_STAGES).toHaveLength(5);
    expect(SIX_GROWTH_DIMENSIONS).toHaveLength(6);
    expect(LEARNING_CYCLE_STEPS).toHaveLength(5);
    expect(IMPACT_GOALS).toHaveLength(5);
    expect(IMPACT_FRAMEWORK_INDICATORS).toHaveLength(6);
    expect(PARTNERSHIP_CATEGORIES).toHaveLength(8);
  });

  it('marks unbuilt Community feature honestly as coming_soon while 01-08 are active', () => {
    expect(EXPERIENCE_FEATURES).toHaveLength(9);
    const active = EXPERIENCE_FEATURES.filter((f) => f.status === 'active');
    const comingSoon = EXPERIENCE_FEATURES.filter((f) => f.status === 'coming_soon');
    expect(active).toHaveLength(8);
    expect(comingSoon.map((f) => f.name)).toEqual(['COMMUNITY']);
  });

  it('maps every Persona CTA to an existing profession preset in PROFESSIONS_DB', () => {
    const presetIds = new Set(PROFESSIONS_DB.map((p) => p.id));
    expect(PERSONA_PATHS).toHaveLength(6);
    for (const persona of PERSONA_PATHS) {
      expect(presetIds.has(persona.professionPresetId)).toBe(true);
      expect(persona.suggestedGoal.length).toBeGreaterThan(20);
    }
  });

  it('references only verified ecosystem URLs', () => {
    expect(ECOSYSTEM_NODES).toHaveLength(3);
    const externalHrefs = ECOSYSTEM_NODES.map((n) => n.href).filter(Boolean);
    expect(externalHrefs).toEqual([
      'https://sociopreneur.online',
      'https://socioline.sociopreneur.online',
    ]);
  });
});
