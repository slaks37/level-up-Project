import { createDefaultDreamSteps } from '../science';
import type { DailyBreakdown, DreamStep, Language } from '../../types';
import type { DevelopmentDimension } from './dimensions';

export type PathwayId =
  | 'personal_growth'
  | 'career_accelerator'
  | 'entrepreneur'
  | 'sociopreneur'
  | 'community_agriculture'
  | 'global_business';

export interface PathwayDefinition {
  id: PathwayId;
  nameId: string;
  nameEn: string;
  taglineId: string;
  taglineEn: string;
  primaryDimensions: DevelopmentDimension[];
  stageCount: number;
}

export interface DreamStepV2 extends DreamStep {
  pathwayId?: PathwayId;
  stageCode?: string;
  dimension?: DevelopmentDimension;
  evidenceRequirement?: string;
  evidenceStatus?: 'none' | 'submitted' | 'approved' | 'revision_requested';
  linkedCanvasTypes?: string[];
}

export const DEVELOPMENT_PATHWAYS: readonly PathwayDefinition[] = [
  {
    id: 'personal_growth',
    nameId: 'Personal Growth',
    nameEn: 'Personal Growth',
    taglineId: 'Bangun kebiasaan, kesehatan, dan peta impian 5 tahap',
    taglineEn: 'Build habits, health, and the classic 5-phase Dream Map',
    primaryDimensions: ['PURPOSE', 'HEALTH', 'SKILLS'],
    stageCount: 5,
  },
  {
    id: 'career_accelerator',
    nameId: 'Career Accelerator',
    nameEn: 'Career Accelerator',
    taglineId: 'Naik peringkat karier lewat kompetensi dan portofolio nyata',
    taglineEn: 'Accelerate your career via verified competencies and portfolio outputs',
    primaryDimensions: ['CAREER', 'SKILLS', 'PURPOSE'],
    stageCount: 5,
  },
  {
    id: 'entrepreneur',
    nameId: 'Entrepreneur',
    nameEn: 'Entrepreneur',
    taglineId: 'Dari ide bisnis ke validasi pasar, profitabilitas, dan skala',
    taglineEn: 'From business idea to market validation, profitability, and scale',
    primaryDimensions: ['BUSINESS', 'FINANCIAL', 'SKILLS'],
    stageCount: 7,
  },
  {
    id: 'sociopreneur',
    nameId: 'Sociopreneur',
    nameEn: 'Sociopreneur',
    taglineId: '10 tahap lengkap: Awakening hingga Dampak Sosial berkelanjutan',
    taglineEn: 'Full 10-stage journey from Awakening to measurable Social Impact',
    primaryDimensions: ['PURPOSE', 'BUSINESS', 'FINANCIAL', 'IMPACT'],
    stageCount: 10,
  },
  {
    id: 'community_agriculture',
    nameId: 'Community & Agriculture',
    nameEn: 'Community & Agriculture',
    taglineId: 'Kembangkan potensi lokal, agribisnis, dan rantai pasok komunitas',
    taglineEn: 'Develop local potential, agribusiness, and community value chains',
    primaryDimensions: ['IMPACT', 'BUSINESS', 'FINANCIAL'],
    stageCount: 10,
  },
  {
    id: 'global_business',
    nameId: 'Global Business',
    nameEn: 'Global Business',
    taglineId: 'Siapkan legalitas, standar mutu, dan kesiapan ekspor B2B',
    taglineEn: 'Build compliance, quality standards, and B2B export readiness',
    primaryDimensions: ['BUSINESS', 'FINANCIAL', 'SKILLS', 'IMPACT'],
    stageCount: 7,
  },
] as const;

interface StageTemplate {
  code: string;
  phaseId: string;
  phaseEn: string;
  titleId: (goal: string) => string;
  titleEn: (goal: string) => string;
  tipId: string;
  tipEn: string;
  skillId: string;
  skillEn: string;
  dimension: DevelopmentDimension;
  evidenceId: string;
  evidenceEn: string;
  canvases: string[];
  levelFraction: number;
  sessionMultiplier: number;
}

const SOCIOPRENEUR_10_STAGES: readonly StageTemplate[] = [
  {
    code: 'sociopreneur_01_awakening',
    phaseId: 'Tahap 1: Awakening',
    phaseEn: 'Stage 1: Awakening',
    titleId: (g) => `Tetapkan misi pribadi & tujuan utama untuk "${g}"`,
    titleEn: (g) => `Define personal mission & purpose for "${g}"`,
    tipId: 'Mulai dari kejujuran atas kekuatan, waktu, dan nilai hidupmu.',
    tipEn: 'Start from honesty about your strengths, available time, and core values.',
    skillId: 'Kejelasan Tujuan',
    skillEn: 'Purpose Clarity',
    dimension: 'PURPOSE',
    evidenceId: 'Personal Development Canvas terisi lengkap',
    evidenceEn: 'Completed Personal Development Canvas',
    canvases: ['personal_development'],
    levelFraction: 0.1,
    sessionMultiplier: 1.5,
  },
  {
    code: 'sociopreneur_02_discover',
    phaseId: 'Tahap 2: Discover',
    phaseEn: 'Stage 2: Discover',
    titleId: () => 'Petakan masalah sosial nyata & potensi komunitas sekitar',
    titleEn: () => 'Map real social problems & local community potential',
    tipId: 'Amati lapangan secara langsung — bedakan fakta observasi dari asumsi.',
    tipEn: 'Observe firsthand — separate field observations from assumptions.',
    skillId: 'Pemetaan Masalah Sosial',
    skillEn: 'Social Problem Mapping',
    dimension: 'IMPACT',
    evidenceId: 'Social Problem Canvas & catatan observasi komunitas',
    evidenceEn: 'Social Problem Canvas & community observation log',
    canvases: ['social_problem', 'community_potential'],
    levelFraction: 0.2,
    sessionMultiplier: 2,
  },
  {
    code: 'sociopreneur_03_understand',
    phaseId: 'Tahap 3: Understand',
    phaseEn: 'Stage 3: Understand',
    titleId: () => 'Wawancarai calon pelanggan & pemangku kepentingan utama',
    titleEn: () => 'Interview target customers & key community stakeholders',
    tipId: 'Dengarkan masalah nyata sebelum menawarkan solusi produk.',
    tipEn: 'Listen to real pain points before pitching your product.',
    skillId: 'Riset Pelanggan',
    skillEn: 'Customer Discovery',
    dimension: 'BUSINESS',
    evidenceId: 'Minimal 5 catatan wawancara pelanggan terverifikasi',
    evidenceEn: 'At least 5 verified customer interview logs',
    canvases: ['customer_research'],
    levelFraction: 0.3,
    sessionMultiplier: 2,
  },
  {
    code: 'sociopreneur_04_learn',
    phaseId: 'Tahap 4: Learn',
    phaseEn: 'Stage 4: Learn',
    titleId: () => 'Kuasai keterampilan inti usaha & literasi finansial dasar',
    titleEn: () => 'Master core venture skills & foundational financial literacy',
    tipId: 'Selesaikan modul LevelUp Academy yang relevan lalu praktikkan langsung.',
    tipEn: 'Complete relevant LevelUp Academy modules and apply immediately.',
    skillId: 'Kompetensi Inti Sociopreneur',
    skillEn: 'Core Sociopreneur Competency',
    dimension: 'SKILLS',
    evidenceId: 'Lulus kuis & tugas praktik modul inti Academy',
    evidenceEn: 'Passed core Academy quiz & practical assignment',
    canvases: [],
    levelFraction: 0.4,
    sessionMultiplier: 2.5,
  },
  {
    code: 'sociopreneur_05_design',
    phaseId: 'Tahap 5: Design',
    phaseEn: 'Stage 5: Design',
    titleId: () => 'Rancang Value Proposition, Model Bisnis & struktur HPP awal',
    titleEn: () => 'Design Value Proposition, Business Model & initial COGS/pricing',
    tipId: 'Pastikan solusi bernilai bagi pelanggan sekaligus sehat secara margin.',
    tipEn: 'Ensure your solution delivers customer value with healthy unit economics.',
    skillId: 'Desain Model Bisnis',
    skillEn: 'Business Model Design',
    dimension: 'FINANCIAL',
    evidenceId: 'VPC, BMC, dan kalkulasi HPP + BEP deterministik tersimpan',
    evidenceEn: 'Saved VPC, BMC, and deterministic COGS + BEP calculation',
    canvases: ['value_proposition', 'business_model', 'hpp_pricing', 'bep'],
    levelFraction: 0.5,
    sessionMultiplier: 2.5,
  },
  {
    code: 'sociopreneur_06_prototype',
    phaseId: 'Tahap 6: Prototype',
    phaseEn: 'Stage 6: Prototype',
    titleId: (g) => `Bangun prototipe minimum (MVP) pertama menuju "${g}"`,
    titleEn: (g) => `Build first minimum viable prototype (MVP) for "${g}"`,
    tipId: 'Buat versi terkecil yang bisa dicoba, disentuh, atau dipakai calon pembeli.',
    tipEn: 'Build the smallest testable version real buyers can try.',
    skillId: 'Prototyping Produk',
    skillEn: 'Product Prototyping',
    dimension: 'BUSINESS',
    evidenceId: 'Bukti foto/tautan prototipe & spesifikasi produk',
    evidenceEn: 'Prototype photo/link & product specification evidence',
    canvases: ['product_prototyping'],
    levelFraction: 0.6,
    sessionMultiplier: 3,
  },
  {
    code: 'sociopreneur_07_validate',
    phaseId: 'Tahap 7: Validate',
    phaseEn: 'Stage 7: Validate',
    titleId: () => 'Uji prototipe di pasar & validasi kesediaan membayar',
    titleEn: () => 'Test prototype in market & validate willingness to pay',
    tipId: 'Catat hasil eksperimen secara objektif — revisi jika hipotesis tidak terbukti.',
    tipEn: 'Record experiment results objectively — pivot if the hypothesis fails.',
    skillId: 'Validasi Pasar',
    skillEn: 'Market Validation',
    dimension: 'BUSINESS',
    evidenceId: 'Experiment Tracker dengan bukti uji pasar / pra-pesan nyata',
    evidenceEn: 'Experiment Tracker with real market test or pre-order proof',
    canvases: ['experiment_tracker'],
    levelFraction: 0.7,
    sessionMultiplier: 3,
  },
  {
    code: 'sociopreneur_08_launch',
    phaseId: 'Tahap 8: Launch',
    phaseEn: 'Stage 8: Launch',
    titleId: () => 'Luncurkan produk perdana dengan kesiapan operasional & legal',
    titleEn: () => 'Launch first product with operational & legal readiness',
    tipId: 'Siapkan SOP produksi, rencana pemasaran, dan kepatuhan legal dasar.',
    tipEn: 'Prepare production SOP, marketing plan, and baseline legal readiness.',
    skillId: 'Peluncuran Usaha',
    skillEn: 'Venture Launch',
    dimension: 'BUSINESS',
    evidenceId: 'Bukti transaksi perdana + checklist Operational & Legal Readiness',
    evidenceEn: 'First real sale proof + Operational & Legal Readiness checklist',
    canvases: ['marketing_plan', 'operational_planning', 'legal_readiness'],
    levelFraction: 0.8,
    sessionMultiplier: 3,
  },
  {
    code: 'sociopreneur_09_grow',
    phaseId: 'Tahap 9: Grow',
    phaseEn: 'Stage 9: Grow',
    titleId: () => 'Stabilkan arus kas, pelanggan berulang & kesiapan pasar lebih luas',
    titleEn: () => 'Stabilize cash flow, repeat orders & broader market/export readiness',
    tipId: 'Kelola arus kas bulanan dan bangun sistem kualitas untuk skala lebih besar.',
    tipEn: 'Track monthly cash flow and build quality systems for scale.',
    skillId: 'Pertumbuhan & Arus Kas',
    skillEn: 'Growth & Cash Flow',
    dimension: 'FINANCIAL',
    evidenceId: 'Laporan arus kas 3 bulan + bukti repeat order / kesiapan ekspor',
    evidenceEn: '3-month cash flow record + repeat sales or export readiness proof',
    canvases: ['cash_flow', 'export_readiness'],
    levelFraction: 0.9,
    sessionMultiplier: 3.5,
  },
  {
    code: 'sociopreneur_10_impact',
    phaseId: 'Tahap 10: Impact',
    phaseEn: 'Stage 10: Impact',
    titleId: (g) => `Ukur & laporkan dampak sosial berkelanjutan dari "${g}"`,
    titleEn: (g) => `Measure & verify sustainable social impact of "${g}"`,
    tipId: 'Dokumentasikan penerima manfaat nyata agar dampakmu dapat diaudit dan diperluas.',
    tipEn: 'Document verified beneficiaries so your impact is auditable and scalable.',
    skillId: 'Pengukuran Dampak Sosial',
    skillEn: 'Social Impact Measurement',
    dimension: 'IMPACT',
    evidenceId: 'Social Impact Measurement terverifikasi dengan data penerima manfaat nyata',
    evidenceEn: 'Verified Social Impact Measurement with real beneficiary evidence',
    canvases: ['social_impact'],
    levelFraction: 1.0,
    sessionMultiplier: 4,
  },
] as const;

/**
 * Generates pathway-specific Dream Map steps while preserving the v1 5-phase template
 * for personal_growth and career_accelerator pathways.
 */
export function createPathwayDreamSteps(
  pathwayId: PathwayId,
  goal: string,
  profession: string,
  targetLevel = 15,
  breakdown: DailyBreakdown = { total: 150, study: 45, work: 70, fitness: 35 },
  lang: Language = 'id'
): DreamStepV2[] {
  if (pathwayId === 'personal_growth' || pathwayId === 'career_accelerator') {
    return createDefaultDreamSteps(goal, profession, targetLevel, breakdown, lang).map((step, idx) => ({
      ...step,
      pathwayId,
      stageCode: `${pathwayId}_0${idx + 1}`,
      dimension: pathwayId === 'career_accelerator' ? (idx === 1 ? 'SKILLS' : 'CAREER') : idx === 0 ? 'PURPOSE' : 'SKILLS',
      evidenceStatus: 'none',
    }));
  }

  const baseDaily = Math.max(45, breakdown.study + breakdown.work);
  const templates =
    pathwayId === 'sociopreneur' || pathwayId === 'community_agriculture'
      ? SOCIOPRENEUR_10_STAGES
      : pathwayId === 'global_business'
        ? SOCIOPRENEUR_10_STAGES.filter((s) =>
            [
              'sociopreneur_01_awakening',
              'sociopreneur_03_understand',
              'sociopreneur_05_design',
              'sociopreneur_06_prototype',
              'sociopreneur_07_validate',
              'sociopreneur_08_launch',
              'sociopreneur_09_grow',
            ].includes(s.code)
          )
        : SOCIOPRENEUR_10_STAGES.filter((s) =>
            [
              'sociopreneur_01_awakening',
              'sociopreneur_03_understand',
              'sociopreneur_04_learn',
              'sociopreneur_05_design',
              'sociopreneur_06_prototype',
              'sociopreneur_07_validate',
              'sociopreneur_08_launch',
            ].includes(s.code)
          );

  const id = lang === 'id';
  return templates.map((tpl, index) => ({
    id: `ds_${pathwayId}_${index + 1}`,
    pathwayId,
    stageCode: tpl.code,
    dimension: tpl.dimension,
    phase: id ? tpl.phaseId : tpl.phaseEn,
    title: id ? tpl.titleId(goal) : tpl.titleEn(goal),
    coachTip: id ? tpl.tipId : tpl.tipEn,
    targetLevel: Math.max(2, Math.round(targetLevel * tpl.levelFraction)),
    studyMinutes: breakdown.study,
    workMinutes: breakdown.work,
    targetMinutes: Math.round(baseDaily * tpl.sessionMultiplier),
    completedMinutes: 0,
    skillName: id ? tpl.skillId : tpl.skillEn,
    completed: false,
    evidenceRequirement: id ? tpl.evidenceId : tpl.evidenceEn,
    evidenceStatus: 'none',
    linkedCanvasTypes: [...tpl.canvases],
  }));
}
