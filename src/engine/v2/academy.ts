import type { Language, Quest } from '../../types';
import type { DevelopmentDimension } from './dimensions';
import type { PathwayId } from './pathways';
import type { CompetencyTier } from './progression';

export type LessonType = 'article' | 'video' | 'quiz' | 'assignment' | 'studio_action';

export interface QuizQuestion {
  id: string;
  promptId: string;
  promptEn: string;
  optionsId: string[];
  optionsEn: string[];
  correctIndex: number; // In production paid/certified tracks, authoritative keys live in server-only quizKeys/{lessonId}
  explanationId: string;
  explanationEn: string;
}

export interface AcademyLesson {
  id: string;
  order: number;
  titleId: string;
  titleEn: string;
  type: LessonType;
  estimatedMinutes: number;
  contentId: string;
  contentEn: string;
  videoUrl?: string;
  linkedCanvasType?: string;
  linkedDreamStageCode?: string;
  quizQuestions?: QuizQuestion[];
  assignmentPromptId?: string;
  assignmentPromptEn?: string;
  assignmentRubricId?: string[];
  assignmentRubricEn?: string[];
  autoQuestTemplate?: {
    titleId: string;
    titleEn: string;
    category: Quest['category'];
    dimension: DevelopmentDimension;
    minutes: number;
    skillTag: string;
  };
}

export interface AcademyModule {
  id: string;
  order: number;
  titleId: string;
  titleEn: string;
  descriptionId: string;
  descriptionEn: string;
  lessons: AcademyLesson[];
}

export interface AcademyCourse {
  id: string;
  slug: string;
  titleId: string;
  titleEn: string;
  summaryId: string;
  summaryEn: string;
  pathwayIds: PathwayId[];
  dimensions: DevelopmentDimension[];
  competencyCode: string;
  competencyNameId: string;
  competencyNameEn: string;
  competencyTier: CompetencyTier;
  accessType: 'free' | 'paid_external' | 'cohort_only';
  externalProductUrl?: string;
  estimatedHours: number;
  modules: AcademyModule[];
}

export interface AcademyEnrollmentState {
  courseId: string;
  status: 'active' | 'completed' | 'revoked_refund';
  source: 'free' | 'sociopreneur_order' | 'cohort_grant';
  completedLessonIds: string[];
  quizScores: Record<string, { scorePct: number; passed: boolean; completedAt: number }>;
  submittedAssignments: Record<string, { evidenceId: string; status: 'submitted' | 'approved' | 'revision_requested'; submittedAt: number }>;
  certificateCode?: string;
  enrolledAt: number;
}

export const STARTER_ACADEMY_COURSES: readonly AcademyCourse[] = [
  {
    id: 'crs_socio_discovery_01',
    slug: 'sociopreneur-problem-discovery',
    titleId: 'Fondasi Sociopreneur: Riset Masalah Sosial & Pelanggan',
    titleEn: 'Sociopreneur Foundations: Social Problem & Customer Discovery',
    summaryId: 'Pelajari cara membedakan asumsi dari bukti lapangan, memetakan potensi komunitas, dan mewawancarai pelanggan secara objektif.',
    summaryEn: 'Learn to separate assumptions from field evidence, map community potential, and run unbiased customer interviews.',
    pathwayIds: ['sociopreneur', 'community_agriculture', 'entrepreneur'],
    dimensions: ['PURPOSE', 'IMPACT', 'BUSINESS'],
    competencyCode: 'COMP-SOC-01',
    competencyNameId: 'Riset Masalah & Validasi Komunitas',
    competencyNameEn: 'Social Problem & Community Discovery',
    competencyTier: 'foundational',
    accessType: 'free',
    estimatedHours: 3,
    modules: [
      {
        id: 'mod_disc_1',
        order: 1,
        titleId: 'Modul 1: Memetakan Akar Masalah Sosial',
        titleEn: 'Module 1: Mapping Root Social Problems',
        descriptionId: 'Beralih dari ide produk ke masalah nyata yang layak diselesaikan.',
        descriptionEn: 'Shift from product assumptions to real problems worth solving.',
        lessons: [
          {
            id: 'les_disc_1_1',
            order: 1,
            titleId: 'Asumsi vs Bukti Lapangan dalam Sociopreneurship',
            titleEn: 'Assumptions vs Field Evidence in Sociopreneurship',
            type: 'article',
            estimatedMinutes: 15,
            linkedCanvasType: 'social_problem',
            linkedDreamStageCode: 'sociopreneur_02_discover',
            contentId:
              'Banyak usaha sosial gagal bukan karena niatnya kurang mulia, melainkan karena membangun solusi atas asumsi pribadi. Di LevelUp 2.0, setiap ide awal dari pikiran maupun Agnes AI diberi label **Asumsi** hingga dibuktikan lewat wawancara langsung, observasi komunitas, atau transaksi nyata.',
            contentEn:
              'Most social ventures fail not from lack of passion, but from building on untested assumptions. In LevelUp 2.0, every initial idea or AI suggestion is tagged as an **Assumption** until verified by customer interviews, field observations, or real transactions.',
            autoQuestTemplate: {
              titleId: 'Isi Social Problem Canvas dari 1 pengamatan lapangan nyata',
              titleEn: 'Complete Social Problem Canvas from 1 real field observation',
              category: 'CAREER',
              dimension: 'IMPACT',
              minutes: 25,
              skillTag: 'Pemetaan Masalah Sosial',
            },
          },
          {
            id: 'les_disc_1_2',
            order: 2,
            titleId: 'Kuis Pemahaman: Validasi Masalah & Wawancara',
            titleEn: 'Knowledge Check: Problem Validation & Interviews',
            type: 'quiz',
            estimatedMinutes: 10,
            contentId: 'Jawab pertanyaan di bawah ini (skor minimal 70% untuk lulus kuis).',
            contentEn: 'Answer the questions below (minimum 70% score required to pass).',
            quizQuestions: [
              {
                id: 'q1',
                promptId: 'Pertanyaan mana yang PALING objektif saat mewawancarai calon pelanggan?',
                promptEn: 'Which question is MOST objective during a customer discovery interview?',
                optionsId: [
                  'Apakah Anda mau membeli produk kopi kami jika harganya Rp50.000?',
                  'Ceritakan terakhir kali Anda kesulitan mendapatkan bahan baku — bagaimana Anda mengatasinya?',
                  'Menurut Anda ide bisnis sosial kami bagus tidak?',
                ],
                optionsEn: [
                  'Would you buy our coffee if we priced it at Rp50,000?',
                  'Tell me about the last time you struggled to source ingredients — how did you solve it?',
                  'Do you think our social business idea is good?',
                ],
                correctIndex: 1,
                explanationId: 'Menanyakan pengalaman masa lalu yang konkret mengungkap perilaku nyata, bukan sekadar pujian sopan.',
                explanationEn: 'Asking about concrete past behavior surfaces real pain points instead of polite compliments.',
              },
              {
                id: 'q2',
                promptId: 'Di LevelUp 2.0, apakah draf Business Model Canvas hasil bantuan Agnes AI langsung menaikkan Business Level?',
                promptEn: 'In LevelUp 2.0, does an AI-drafted Business Model Canvas automatically raise your Business Level?',
                optionsId: [
                  'Ya, selama jumlah kata mencukupi.',
                  'Tidak — output AI berstatus Asumsi sampai dibuktikan lewat Evidence Vault.',
                  'Ya, jika EXP harian sudah di atas 1000.',
                ],
                optionsEn: [
                  'Yes, as long as it is detailed.',
                  'No — AI output stays tagged as an Assumption until proven in the Evidence Vault.',
                  'Yes, once daily EXP exceeds 1,000.',
                ],
                correctIndex: 1,
                explanationId: 'Business Level hanya naik berdasarkan bukti lapangan tervalidasi, bukan waktu belajar atau teks AI.',
                explanationEn: 'Business Level advances strictly on validated real-world evidence, never EXP or AI drafts.',
              },
            ],
          },
          {
            id: 'les_disc_1_3',
            order: 3,
            titleId: 'Tugas Praktik: Unggah 3 Catatan Wawancara Komunitas',
            titleEn: 'Practical Assignment: Submit 3 Community Interview Logs',
            type: 'assignment',
            estimatedMinutes: 45,
            linkedCanvasType: 'customer_research',
            linkedDreamStageCode: 'sociopreneur_03_understand',
            contentId: 'Lakukan wawancara singkat ke minimal 3 calon pelanggan atau anggota komunitas lokal, rangkum pola masalah utama mereka, lalu kirimkan bukti ke Evidence Vault untuk ditinjau Mentor.',
            contentEn: 'Interview at least 3 target customers or local community members, summarize recurring pain points, and submit proof to the Evidence Vault for Mentor review.',
            assignmentPromptId: 'Tuliskan ringkasan 3 wawancara nyata (siapa yang diwawancarai, masalah konkret yang dialami, dan solusi yang mereka pakai sekarang).',
            assignmentPromptEn: 'Summarize 3 real interviews (who you spoke with, concrete pain point experienced, and current workaround).',
            assignmentRubricId: [
              'Menyebutkan minimal 3 narasumber spesifik (tanpa membocorkan PII sensitif)',
              'Membedakan fakta lapangan dari opini pribadi',
              'Menyertakan tautan catatan / foto bukti observasi',
            ],
            assignmentRubricEn: [
              'Covers at least 3 specific interviewees (without exposing sensitive PII)',
              'Separates observed facts from personal opinions',
              'Includes supporting link or observation proof',
            ],
            autoQuestTemplate: {
              titleId: 'Wawancarai 1 calon pelanggan hari ini & catat masalah utamanya',
              titleEn: 'Interview 1 target customer today & log their core pain point',
              category: 'CAREER',
              dimension: 'BUSINESS',
              minutes: 30,
              skillTag: 'Riset Pelanggan',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'crs_unit_economics_02',
    slug: 'hpp-pricing-cashflow-mastery',
    titleId: 'Unit Economics & Keuangan Usaha: HPP, BEP & Arus Kas',
    titleEn: 'Venture Unit Economics: COGS, Break-Even & Cash Flow',
    summaryId: 'Kuasai perhitungan HPP akurat, strategi margin sehat, titik impas (BEP), dan proyeksi arus kas 6 bulan menggunakan kalkulator Business Studio.',
    summaryEn: 'Master accurate COGS calculation, healthy margin pricing, break-even analysis, and 6-month cash flow projections in Business Studio.',
    pathwayIds: ['entrepreneur', 'sociopreneur', 'global_business', 'community_agriculture'],
    dimensions: ['FINANCIAL', 'BUSINESS'],
    competencyCode: 'COMP-FIN-01',
    competencyNameId: 'Kalkulasi HPP, Margin & Arus Kas Sehat',
    competencyNameEn: 'Unit Economics & Cash Flow Mastery',
    competencyTier: 'practitioner',
    accessType: 'free',
    estimatedHours: 2.5,
    modules: [
      {
        id: 'mod_fin_1',
        order: 1,
        titleId: 'Modul 1: Menghitung HPP & Harga Jual yang Sehat',
        titleEn: 'Module 1: Calculating True COGS & Healthy Pricing',
        descriptionId: 'Hindari jebakan "laris tapi rugi" dengan memasukkan bahan baku, tenaga kerja, dan overhead secara tepat.',
        descriptionEn: 'Avoid the "high sales, zero profit" trap by accounting for materials, labor, and overhead accurately.',
        lessons: [
          {
            id: 'les_fin_1_1',
            order: 1,
            titleId: 'Membedakan Gross Margin vs Markup & Cara Menghitung BEP',
            titleEn: 'Gross Margin vs Markup & Computing Break-Even Point',
            type: 'studio_action',
            estimatedMinutes: 20,
            linkedCanvasType: 'hpp_pricing',
            linkedDreamStageCode: 'sociopreneur_05_design',
            contentId:
              'Margin kotor dihitung dari harga jual `(Harga - HPP) / Harga`, sedangkan markup dihitung dari biaya `(Harga - HPP) / HPP`. Buka **Business Studio → Kalkulator HPP & BEP** untuk menghitung angka pasti usahamu secara deterministik.',
            contentEn:
              'Gross margin is measured against selling price `(Price - COGS) / Price`, while markup is measured against cost `(Price - COGS) / COGS`. Open **Business Studio → HPP & BEP Calculator** to compute your venture numbers deterministically.',
            autoQuestTemplate: {
              titleId: 'Hitung HPP, Harga Jual & BEP produk utama di Business Studio',
              titleEn: 'Calculate HPP, Pricing & Break-Even for flagship product in Business Studio',
              category: 'CAREER',
              dimension: 'FINANCIAL',
              minutes: 30,
              skillTag: 'Kalkulasi HPP & Keuangan',
            },
          },
          {
            id: 'les_fin_1_2',
            order: 2,
            titleId: 'Kuis Praktis: Analisis Margin & Titik Impas',
            titleEn: 'Practical Quiz: Margin & Break-Even Analysis',
            type: 'quiz',
            estimatedMinutes: 10,
            contentId: 'Uji pemahamanmu soal HPP dan Break-Even Point.',
            contentEn: 'Test your grasp of COGS and Break-Even math.',
            quizQuestions: [
              {
                id: 'fq1',
                promptId: 'Jika HPP per unit Rp40.000, harga jual Rp60.000, dan biaya tetap bulanan Rp5.000.000, berapa unit BEP per bulan?',
                promptEn: 'If variable cost/unit is Rp40,000, selling price is Rp60,000, and monthly fixed cost is Rp5,000,000, what is monthly BEP?',
                optionsId: ['100 unit', '250 unit', '500 unit'],
                optionsEn: ['100 units', '250 units', '500 units'],
                correctIndex: 1,
                explanationId: 'Margin kontribusi = Rp60.000 - Rp40.000 = Rp20.000/unit. BEP = Rp5.000.000 / Rp20.000 = 250 unit.',
                explanationEn: 'Contribution margin = Rp20,000/unit. BEP = Rp5,000,000 / Rp20,000 = 250 units.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'crs_export_legal_03',
    slug: 'legal-export-readiness-b2b',
    titleId: 'Kesiapan Legalitas & Ekspor B2B (Program Sociopreneur.online)',
    titleEn: 'Legal Compliance & International B2B Export Readiness',
    summaryId: 'Panduan kurasi produk UMKM & komunitas agar siap listing di Sociopreneur.online serta memenuhi standar buyer B2B internasional.',
    summaryEn: 'Curate community and SME products for Sociopreneur.online marketplace approval and international B2B buyer standards.',
    pathwayIds: ['global_business', 'sociopreneur', 'community_agriculture'],
    dimensions: ['BUSINESS', 'IMPACT', 'FINANCIAL'],
    competencyCode: 'COMP-EXP-01',
    competencyNameId: 'Kesiapan Legalitas & Standar Ekspor',
    competencyNameEn: 'Legal & Export Readiness',
    competencyTier: 'builder',
    accessType: 'paid_external',
    externalProductUrl: 'https://sociopreneur.online',
    estimatedHours: 6,
    modules: [
      {
        id: 'mod_exp_1',
        order: 1,
        titleId: 'Pratinjau: Checklist Legalitas & Dokumen Ekspor',
        titleEn: 'Preview: Compliance & Export Document Checklist',
        descriptionId: 'Ringkasan NIB, sertifikasi Halal/BPOM, HS Code, COA, dan Incoterms.',
        descriptionEn: 'Overview of NIB, Halal/BPOM, HS Code, COA, and Incoterms.',
        lessons: [
          {
            id: 'les_exp_1_1',
            order: 1,
            titleId: 'Syarat Kurasi Produk di Marketplace Sociopreneur.online',
            titleEn: 'Product Curation Standards for Sociopreneur.online Marketplace',
            type: 'article',
            estimatedMinutes: 15,
            linkedCanvasType: 'export_readiness',
            linkedDreamStageCode: 'sociopreneur_09_grow',
            contentId:
              'Pendaftaran kelas penuh tersedia melalui pembelian resmi di `sociopreneur.online` (enrollment aktif otomatis lewat webhook terverifikasi). Gunakan pratinjau ini untuk mulai melengkapi **Legal Readiness** dan **Export Readiness** di Business Studio.',
            contentEn:
              'Full course enrollment is unlocked via verified purchase on `sociopreneur.online`. Use this preview to begin filling out your **Legal Readiness** and **Export Readiness** checklists in Business Studio.',
            autoQuestTemplate: {
              titleId: 'Lengkapi checklist Legal Readiness & Export Readiness di Business Studio',
              titleEn: 'Complete Legal & Export Readiness checklists in Business Studio',
              category: 'CAREER',
              dimension: 'BUSINESS',
              minutes: 25,
              skillTag: 'Kesiapan Legal & Ekspor',
            },
          },
        ],
      },
    ],
  },
] as const;

export function gradeAcademyQuiz(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>
): { correctCount: number; total: number; scorePct: number; passed: boolean } {
  const total = questions.length;
  if (total === 0) return { correctCount: 0, total: 0, scorePct: 100, passed: true };
  let correctCount = 0;
  for (const q of questions) {
    if (selectedAnswers[q.id] === q.correctIndex) correctCount++;
  }
  const scorePct = Math.round((correctCount / total) * 100);
  return { correctCount, total, scorePct, passed: scorePct >= 70 };
}

export function buildQuestFromLesson(lesson: AcademyLesson, lang: Language, activeDreamStepId?: string | null): Quest | null {
  const tpl = lesson.autoQuestTemplate;
  if (!tpl) return null;
  return {
    id: `academy_${lesson.id}_${Date.now()}`,
    title: (lang === 'id' ? tpl.titleId : tpl.titleEn).slice(0, 140),
    category: tpl.category,
    dimension: tpl.dimension,
    unitType: 'MINUTES',
    defaultQty: tpl.minutes,
    estMinutes: tpl.minutes,
    skillTag: tpl.skillTag,
    dreamStepId: activeDreamStepId ?? null,
    exp: 20,
    gold: 1,
    completed: false,
  };
}

function academyStorageKey(uid?: string): string {
  return uid ? `levelup_academy_v2:${uid}` : 'levelup_academy_v2:guest';
}

export function loadLocalEnrollments(uid?: string): Record<string, AcademyEnrollmentState> {
  try {
    const raw = localStorage.getItem(academyStorageKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, AcademyEnrollmentState>) : {};
  } catch {
    return {};
  }
}

export function saveLocalEnrollments(map: Record<string, AcademyEnrollmentState>, uid?: string): void {
  try {
    localStorage.setItem(academyStorageKey(uid), JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}
