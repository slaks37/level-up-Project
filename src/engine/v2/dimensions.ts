import type { Language, Quest } from '../../types';

export type DevelopmentDimension =
  | 'PURPOSE'
  | 'HEALTH'
  | 'SKILLS'
  | 'CAREER'
  | 'BUSINESS'
  | 'FINANCIAL'
  | 'IMPACT';

export interface DimensionDefinition {
  id: DevelopmentDimension;
  labelId: string;
  labelEn: string;
  shortDescId: string;
  shortDescEn: string;
  legacyCategory: Quest['category'];
}

export const DEVELOPMENT_DIMENSIONS: readonly DimensionDefinition[] = [
  {
    id: 'PURPOSE',
    labelId: 'Tujuan Hidup',
    labelEn: 'Purpose',
    shortDescId: 'Arah hidup, nilai inti, dan refleksi makna',
    shortDescEn: 'Life direction, core values, and meaning reflection',
    legacyCategory: 'STUDY',
  },
  {
    id: 'HEALTH',
    labelId: 'Kesehatan & Energi',
    labelEn: 'Health',
    shortDescId: 'Kebugaran, tidur, nutrisi, dan manajemen energi',
    shortDescEn: 'Fitness, sleep, nutrition, and energy management',
    legacyCategory: 'FITNESS',
  },
  {
    id: 'SKILLS',
    labelId: 'Keterampilan',
    labelEn: 'Skills',
    shortDescId: 'Pembelajaran terarah, kursus, dan kompetensi terverifikasi',
    shortDescEn: 'Deliberate learning, courses, and verified competencies',
    legacyCategory: 'STUDY',
  },
  {
    id: 'CAREER',
    labelId: 'Karier & Profesional',
    labelEn: 'Career',
    shortDescId: 'Eksekusi kerja, kepemimpinan, dan portofolio peran',
    shortDescEn: 'Work execution, leadership, and professional portfolio',
    legacyCategory: 'CAREER',
  },
  {
    id: 'BUSINESS',
    labelId: 'Bisnis & Produk',
    labelEn: 'Business',
    shortDescId: 'Riset pelanggan, prototipe, validasi, dan pertumbuhan usaha',
    shortDescEn: 'Customer research, prototyping, validation, and venture growth',
    legacyCategory: 'CAREER',
  },
  {
    id: 'FINANCIAL',
    labelId: 'Keuangan',
    labelEn: 'Financial',
    shortDescId: 'HPP, harga jual, arus kas, BEP, dan kesehatan finansial',
    shortDescEn: 'COGS, pricing, cash flow, break-even, and financial literacy',
    legacyCategory: 'CAREER',
  },
  {
    id: 'IMPACT',
    labelId: 'Dampak Sosial',
    labelEn: 'Social Impact',
    shortDescId: 'Pemberdayaan komunitas, keberlanjutan, dan dampak terukur',
    shortDescEn: 'Community empowerment, sustainability, and measurable impact',
    legacyCategory: 'CAREER',
  },
] as const;

const FINANCIAL_HINT = /\b(hpp|harga|pricing|cash\s*flow|arus kas|bep|break[\s-]?even|keuangan|finance|budget|anggaran|omzet|margin|modal|investasi)\b/i;
const IMPACT_HINT = /\b(dampak|impact|sosial|social|komunitas|community|petani|desa|umkm|sdg|lingkungan|eco|sosio)\b/i;
const BUSINESS_HINT = /\b(bisnis|usaha|produk|prototipe|prototype|pelanggan|customer|jualan|marketing|pemasaran|bmc|vpc|ekspor|export|legal|nib|halal|validasi)\b/i;
const PURPOSE_HINT = /\b(visi|misi|purpose|tujuan hidup|refleksi|nilai hidup|ikigai|impian utama)\b/i;

export function getDimensionLabel(dimension: DevelopmentDimension, lang: Language): string {
  const def = DEVELOPMENT_DIMENSIONS.find((d) => d.id === dimension);
  if (!def) return dimension;
  return lang === 'id' ? def.labelId : def.labelEn;
}

/**
 * Backward-compatible mapping from v1 quests (STUDY/CAREER/FITNESS) to LevelUp 2.0's
 * 7 Development Dimensions without mutating legacy category fields.
 */
export function inferQuestDimension(
  quest: Pick<Quest, 'category' | 'title' | 'skillTag'> & { dimension?: DevelopmentDimension }
): DevelopmentDimension {
  if (quest.dimension) return quest.dimension;
  if (quest.category === 'FITNESS') return 'HEALTH';
  const text = `${quest.title} ${quest.skillTag}`;
  if (FINANCIAL_HINT.test(text)) return 'FINANCIAL';
  if (IMPACT_HINT.test(text)) return 'IMPACT';
  if (BUSINESS_HINT.test(text)) return 'BUSINESS';
  if (PURPOSE_HINT.test(text)) return 'PURPOSE';
  if (quest.category === 'STUDY') return 'SKILLS';
  return 'CAREER';
}
