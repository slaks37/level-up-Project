import type { Language, Quest } from '../../types';
import type { DevelopmentDimension } from './dimensions';
import type { EvidenceOrigin } from './progression';
import type { BreakEvenInput, CashFlowMonthInput, HppPricingInput } from './studioCalculators';

export type StudioWing = 'discovery' | 'product_validation' | 'finance_ops' | 'growth_impact';

export type StudioCanvasId =
  | 'personal_development'
  | 'social_problem'
  | 'community_potential'
  | 'customer_research'
  | 'value_proposition'
  | 'business_model'
  | 'product_prototyping'
  | 'experiment_tracker'
  | 'hpp_pricing'
  | 'cash_flow'
  | 'bep'
  | 'marketing_plan'
  | 'operational_planning'
  | 'legal_readiness'
  | 'export_readiness'
  | 'social_impact';

export interface StudioFieldSpec {
  key: string;
  labelId: string;
  labelEn: string;
  placeholderId: string;
  placeholderEn: string;
  kind?: 'textarea' | 'checklist';
}

export interface StudioToolDefinition {
  id: StudioCanvasId;
  wing: StudioWing;
  dimension: DevelopmentDimension;
  titleId: string;
  titleEn: string;
  shortDescId: string;
  shortDescEn: string;
  toolMode: 'canvas' | 'experiments' | 'hpp' | 'cashflow' | 'bep' | 'checklist';
  fields?: StudioFieldSpec[];
  checklistItems?: Array<{ key: string; labelId: string; labelEn: string }>;
  recommendedQuestId: string;
  recommendedQuestEn: string;
  skillTag: string;
}

export interface CanvasFieldEntry {
  value: string;
  origin: EvidenceOrigin;
  linkedEvidenceId?: string;
  updatedAt: number;
}

export interface BusinessExperimentItem {
  id: string;
  hypothesis: string;
  targetMetric: string;
  sampleSize: number;
  status: 'planned' | 'running' | 'validated' | 'invalidated' | 'pivoted';
  origin: EvidenceOrigin;
  learnings: string;
  nextAction: string;
  linkedEvidenceId?: string;
  updatedAt: number;
}

export interface VentureWorkspaceState {
  id: string;
  name: string;
  sector: string;
  summary: string;
  canvases: Partial<Record<StudioCanvasId, Record<string, CanvasFieldEntry>>>;
  checklists: Partial<Record<'legal_readiness' | 'export_readiness', Record<string, boolean>>>;
  experiments: BusinessExperimentItem[];
  hppInput: HppPricingInput;
  bepInput: BreakEvenInput;
  cashFlowStartingIdr: number;
  cashFlowMonths: CashFlowMonthInput[];
  updatedAt: number;
}

/**
 * All 16 Business Studio Tools (Stage 8) across 4 structured wings.
 */
export const BUSINESS_STUDIO_TOOLS: readonly StudioToolDefinition[] = [
  // WING 1: DISCOVERY & STRATEGY (6 tools)
  {
    id: 'personal_development',
    wing: 'discovery',
    dimension: 'PURPOSE',
    titleId: '1. Personal Development Canvas',
    titleEn: '1. Personal Development Canvas',
    shortDescId: 'Nilai inti, kekuatan pribadi, komitmen waktu, dan target pertumbuhan pendiri.',
    shortDescEn: 'Core values, founder strengths, time budget, and growth goals.',
    toolMode: 'canvas',
    fields: [
      { key: 'values', labelId: 'Nilai Inti & Misi Pribadi', labelEn: 'Core Values & Mission', placeholderId: 'Apa nilai yang tidak bisa ditawar dalam hidup & usahamu?', placeholderEn: 'What non-negotiable values guide your work?' },
      { key: 'strengths', labelId: 'Kekuatan & Keahlian Saat Ini', labelEn: 'Current Strengths & Assets', placeholderId: 'Keahlian, jaringan, atau pengalaman apa yang sudah kamu miliki?', placeholderEn: 'What skills, networks, or experience do you already have?' },
      { key: 'gaps', labelId: 'Kesenjangan Skill yang Perlu Dilatih', labelEn: 'Skill Gaps to Close', placeholderId: 'Kompetensi apa yang paling mendesak untuk dipelajari?', placeholderEn: 'Which competencies must you build next?' },
    ],
    recommendedQuestId: 'Tinjau 1 kesenjangan skill di Personal Development Canvas & jadwalkan sesi belajar',
    recommendedQuestEn: 'Review 1 skill gap on Personal Development Canvas & schedule a learning block',
    skillTag: 'Pengembangan Diri',
  },
  {
    id: 'social_problem',
    wing: 'discovery',
    dimension: 'IMPACT',
    titleId: '2. Social Problem Canvas',
    titleEn: '2. Social Problem Canvas',
    shortDescId: 'Akar masalah sosial/ekonomi, siapa terdampak, dan konsekuensi jika dibiarkan.',
    shortDescEn: 'Root social/economic problem, affected groups, and cost of inaction.',
    toolMode: 'canvas',
    fields: [
      { key: 'problem', labelId: 'Pernyataan Masalah Nyata', labelEn: 'Core Social Problem', placeholderId: 'Masalah konkret apa yang terjadi di lapangan?', placeholderEn: 'What concrete problem exists on the ground?' },
      { key: 'affected', labelId: 'Kelompok Terdampak', labelEn: 'Affected Beneficiaries', placeholderId: 'Siapa yang paling merasakan dampaknya & perkiraan jumlahnya?', placeholderEn: 'Who is affected most and at what scale?' },
      { key: 'root_cause', labelId: 'Akar Penyebab & Bukti Observasi', labelEn: 'Root Causes & Field Evidence', placeholderId: 'Mengapa masalah ini terus berulang? Sertakan fakta lapangan.', placeholderEn: 'Why does this persist? Cite real field observations.' },
    ],
    recommendedQuestId: 'Verifikasi 1 akar masalah di Social Problem Canvas lewat observasi lapangan',
    recommendedQuestEn: 'Verify 1 root cause on Social Problem Canvas via field observation',
    skillTag: 'Pemetaan Masalah Sosial',
  },
  {
    id: 'community_potential',
    wing: 'discovery',
    dimension: 'IMPACT',
    titleId: '3. Community Potential Mapping',
    titleEn: '3. Community Potential Mapping',
    shortDescId: 'Petakan aset lokal, komoditas unggulan, pengrajin/petani, dan mitra komunitas.',
    shortDescEn: 'Map local assets, commodities, producers/farmers, and community partners.',
    toolMode: 'canvas',
    fields: [
      { key: 'assets', labelId: 'Aset & Komoditas Lokal', labelEn: 'Local Assets & Commodities', placeholderId: 'Bahan baku, hasil bumi, atau kearifan lokal yang tersedia', placeholderEn: 'Available raw materials, crops, or local craft heritage' },
      { key: 'actors', labelId: 'Pelaku & Mitra Komunitas', labelEn: 'Community Actors & Partners', placeholderId: 'Kelompok tani, koperasi, karang taruna, PKK, atau UMKM mitra', placeholderEn: 'Farmer groups, cooperatives, youth associations, SME partners' },
      { key: 'bottlenecks', labelId: 'Hambatan Rantai Pasok Lokal', labelEn: 'Local Value-Chain Bottlenecks', placeholderId: 'Kualitas, akses pasar, logistik, atau permodalan?', placeholderEn: 'Quality, market access, logistics, or working capital?' },
    ],
    recommendedQuestId: 'Hubungi 1 tokoh/mitra lokal untuk memvalidasi Community Potential Mapping',
    recommendedQuestEn: 'Contact 1 local partner to validate Community Potential Mapping',
    skillTag: 'Pemberdayaan Komunitas',
  },
  {
    id: 'customer_research',
    wing: 'discovery',
    dimension: 'BUSINESS',
    titleId: '4. Customer Research',
    titleEn: '4. Customer Research',
    shortDescId: 'Profil segmen pembeli, wawancara pelanggan, pekerjaan utama (JTBD), dan daya beli.',
    shortDescEn: 'Buyer segment profile, interview notes, Jobs-To-Be-Done, and willingness to pay.',
    toolMode: 'canvas',
    fields: [
      { key: 'segment', labelId: 'Segmen Pelanggan Utama', labelEn: 'Primary Customer Segment', placeholderId: 'Siapa pembeli paling mendesak (B2C / B2B)?', placeholderEn: 'Who is your earliest paying buyer (B2C / B2B)?' },
      { key: 'interviews', labelId: 'Ringkasan Wawancara Nyata', labelEn: 'Real Interview Summary', placeholderId: 'Catat kutipan & pola masalah dari wawancara pelanggan', placeholderEn: 'Log quotes and recurring pain patterns from real interviews' },
      { key: 'wtp', labelId: 'Alternatif Saat Ini & Kesediaan Membayar', labelEn: 'Current Alternatives & Willingness to Pay', placeholderId: 'Berapa yang mereka keluarkan saat ini untuk mengatasi masalah tersebut?', placeholderEn: 'What do they currently spend to solve this problem?' },
    ],
    recommendedQuestId: 'Lakukan 2 wawancara pelanggan baru & perbarui Customer Research',
    recommendedQuestEn: 'Conduct 2 customer interviews & update Customer Research',
    skillTag: 'Riset Pelanggan',
  },
  {
    id: 'value_proposition',
    wing: 'discovery',
    dimension: 'BUSINESS',
    titleId: '5. Value Proposition Canvas',
    titleEn: '5. Value Proposition Canvas',
    shortDescId: 'Cocokkan Customer Jobs/Pains/Gains dengan Produk, Pain Relievers & Gain Creators.',
    shortDescEn: 'Match Customer Jobs/Pains/Gains with Products, Pain Relievers & Gain Creators.',
    toolMode: 'canvas',
    fields: [
      { key: 'customer_pains', labelId: 'Customer Jobs & Pains', labelEn: 'Customer Jobs & Pains', placeholderId: 'Tugas utama & rasa frustrasi pelanggan', placeholderEn: 'Core jobs and frustrations customers face' },
      { key: 'pain_relievers', labelId: 'Produk & Pain Relievers', labelEn: 'Product & Pain Relievers', placeholderId: 'Bagaimana produkmu menghilangkan masalah tersebut secara konkret?', placeholderEn: 'How does your offer concretely remove those pains?' },
      { key: 'gain_creators', labelId: 'Keunggulan & Gain Creators', labelEn: 'Differentiators & Gain Creators', placeholderId: 'Nilai tambah unik (kualitas, cerita dampak sosial, harga, kecepatan)', placeholderEn: 'Unique value drivers (quality, social impact story, price, speed)' },
    ],
    recommendedQuestId: 'Uji kalimat proposisi nilai di Value Proposition Canvas ke 3 calon pembeli',
    recommendedQuestEn: 'Pitch your Value Proposition statement to 3 prospective buyers',
    skillTag: 'Desain Proposisi Nilai',
  },
  {
    id: 'business_model',
    wing: 'discovery',
    dimension: 'BUSINESS',
    titleId: '6. Business Model Canvas (BMC)',
    titleEn: '6. Business Model Canvas (BMC)',
    shortDescId: 'Arsitektur 9 blok bisnis: Segmen, Nilai, Kanal, Relasi, Pendapatan, Sumber Daya, Aktivitas, Mitra & Biaya.',
    shortDescEn: 'Full 9-block business architecture connecting value creation to revenue & cost.',
    toolMode: 'canvas',
    fields: [
      { key: 'value_channels', labelId: 'Proposisi Nilai, Segmen & Kanal Distribusi', labelEn: 'Value Prop, Segments & Channels', placeholderId: 'Apa yang dijual, untuk siapa, lewat kanal online/offline apa?', placeholderEn: 'What you offer, to whom, via which online/offline channels' },
      { key: 'revenue_cost', labelId: 'Arus Pendapatan & Struktur Biaya', labelEn: 'Revenue Streams & Cost Structure', placeholderId: 'Sumber pemasukan utama dan pos biaya terbesar', placeholderEn: 'Primary revenue streams and major cost drivers' },
      { key: 'ops_partners', labelId: 'Aktivitas Kunci, Sumber Daya & Mitra Utama', labelEn: 'Key Activities, Resources & Partners', placeholderId: 'Proses inti, aset kritis, dan mitra komunitas/pemasok', placeholderEn: 'Core processes, critical assets, and community/supplier partners' },
    ],
    recommendedQuestId: 'Tinjau 1 asumsi paling berisiko di Business Model Canvas lalu rancang uji coba',
    recommendedQuestEn: 'Identify the riskiest assumption on your BMC and design an experiment',
    skillTag: 'Desain Model Bisnis',
  },

  // WING 2: PRODUCT & VALIDATION (2 tools)
  {
    id: 'product_prototyping',
    wing: 'product_validation',
    dimension: 'BUSINESS',
    titleId: '7. Product Prototyping',
    titleEn: '7. Product Prototyping',
    shortDescId: 'Spesifikasi MVP, kemasan, standar mutu, dan catatan iterasi dari umpan balik pengguna.',
    shortDescEn: 'MVP specification, packaging, quality standards, and user feedback iterations.',
    toolMode: 'canvas',
    fields: [
      { key: 'mvp_spec', labelId: 'Spesifikasi Versi Prototipe (MVP)', labelEn: 'Prototype (MVP) Specification', placeholderId: 'Ukuran, varian, komposisi/fitur, dan estimasi waktu produksi', placeholderEn: 'Size, variants, formulation/features, and production lead time' },
      { key: 'packaging', labelId: 'Kemasan & Identitas Produk', labelEn: 'Packaging & Product Identity', placeholderId: 'Jenis kemasan, label nutrisi/dampak, daya tahan simpan', placeholderEn: 'Packaging format, labeling, shelf life' },
      { key: 'feedback', labelId: 'Umpan Balik Uji Coba & Revisi', labelEn: 'Tester Feedback & Next Revision', placeholderId: 'Apa komentar penguji nyata dan apa yang diperbaiki di versi berikutnya?', placeholderEn: 'Real tester reactions and improvements for next iteration' },
    ],
    recommendedQuestId: 'Buat atau perbaiki 1 batch sampel prototipe produk & dokumentasikan hasilnya',
    recommendedQuestEn: 'Build or refine 1 prototype batch & document tester feedback',
    skillTag: 'Prototyping Produk',
  },
  {
    id: 'experiment_tracker',
    wing: 'product_validation',
    dimension: 'BUSINESS',
    titleId: '8. Business Experiment Tracker',
    titleEn: '8. Business Experiment Tracker',
    shortDescId: 'Catat hipotesis, metrik uji, sampel, dan hasil Validated / Invalidated / Pivoted.',
    shortDescEn: 'Track hypotheses, success metrics, sample sizes, and Validated / Invalidated / Pivoted outcomes.',
    toolMode: 'experiments',
    recommendedQuestId: 'Jalankan 1 eksperimen validasi pasar dari Experiment Tracker hari ini',
    recommendedQuestEn: 'Run 1 market validation experiment from Experiment Tracker today',
    skillTag: 'Validasi Pasar',
  },

  // WING 3: FINANCE & OPERATIONS (5 tools: 3 deterministic calculators + Marketing + Operations)
  {
    id: 'hpp_pricing',
    wing: 'finance_ops',
    dimension: 'FINANCIAL',
    titleId: '9. HPP & Pricing Calculator',
    titleEn: '9. COGS (HPP) & Pricing Calculator',
    shortDescId: 'Kalkulator deterministik Bahan Baku + Tenaga Kerja + Overhead → HPP/unit, Margin & Markup.',
    shortDescEn: 'Deterministic Materials + Labor + Overhead → Unit COGS, Gross Margin & Markup.',
    toolMode: 'hpp',
    recommendedQuestId: 'Cek ulang harga bahan baku pemasok untuk memperbarui Kalkulator HPP',
    recommendedQuestEn: 'Verify latest supplier material prices to update HPP Calculator',
    skillTag: 'Kalkulasi HPP & Keuangan',
  },
  {
    id: 'cash_flow',
    wing: 'finance_ops',
    dimension: 'FINANCIAL',
    titleId: '10. Cash Flow Projection',
    titleEn: '10. Cash Flow Projection',
    shortDescId: 'Proyeksi arus kas bulanan deterministik lengkap dengan peringatan defisit kas.',
    shortDescEn: 'Deterministic monthly cash flow table with automatic negative-balance alerts.',
    toolMode: 'cashflow',
    recommendedQuestId: 'Catat pemasukan & pengeluaran aktual bulan ini di Cash Flow Projection',
    recommendedQuestEn: 'Log actual monthly inflows & outflows in Cash Flow Projection',
    skillTag: 'Manajemen Arus Kas',
  },
  {
    id: 'bep',
    wing: 'finance_ops',
    dimension: 'FINANCIAL',
    titleId: '11. Break-Even Analysis (BEP)',
    titleEn: '11. Break-Even Analysis (BEP)',
    shortDescId: 'Hitung jumlah unit & omzet titik impas secara pasti + Margin of Safety.',
    shortDescEn: 'Compute exact break-even units, revenue target & Margin of Safety.',
    toolMode: 'bep',
    recommendedQuestId: 'Susun rencana penjualan mingguan untuk melampaui target unit BEP',
    recommendedQuestEn: 'Plan weekly sales actions to surpass monthly Break-Even units',
    skillTag: 'Analisis Titik Impas (BEP)',
  },
  {
    id: 'marketing_plan',
    wing: 'finance_ops',
    dimension: 'BUSINESS',
    titleId: '12. Marketing Plan',
    titleEn: '12. Marketing Plan',
    shortDescId: 'Pesan utama, kanal akuisisi, kalender konten/penjualan, dan target konversi.',
    shortDescEn: 'Core messaging, acquisition channels, campaign cadence, and conversion targets.',
    toolMode: 'canvas',
    fields: [
      { key: 'positioning', labelId: 'Pesan & Cerita Merek (Brand Story)', labelEn: 'Positioning & Brand Story', placeholderId: 'Mengapa pembeli memilih produkmu sekaligus bangga dengan dampaknya?', placeholderEn: 'Why buyers choose your product and share its impact story' },
      { key: 'channels', labelId: 'Kanal Pemasaran & Penjualan', labelEn: 'Marketing & Sales Channels', placeholderId: 'Sociopreneur.online, WhatsApp, Instagram/TikTok, reseller, B2B', placeholderEn: 'Sociopreneur.online, WhatsApp, social media, resellers, B2B' },
      { key: 'weekly_plan', labelId: 'Target Kampanye Mingguan', labelEn: 'Weekly Campaign Targets', placeholderId: 'Jumlah konten, outreach B2B, atau promo sampel per minggu', placeholderEn: 'Weekly content pieces, B2B outreach, or tasting demos' },
    ],
    recommendedQuestId: 'Eksekusi 1 aktivitas promosi/outreach dari Marketing Plan hari ini',
    recommendedQuestEn: 'Execute 1 promotion or outreach action from your Marketing Plan today',
    skillTag: 'Pemasaran & Penjualan',
  },
  {
    id: 'operational_planning',
    wing: 'finance_ops',
    dimension: 'BUSINESS',
    titleId: '13. Operational Planning',
    titleEn: '13. Operational Planning',
    shortDescId: 'Alur produksi (SOP), kapasitas bulanan, kontrol kualitas (QC), dan logistik.',
    shortDescEn: 'Production SOP, monthly capacity, quality control (QC), and fulfillment.',
    toolMode: 'canvas',
    fields: [
      { key: 'sop', labelId: 'Alur Produksi & Standar Mutu (SOP/QC)', labelEn: 'Production SOP & Quality Control', placeholderId: 'Tahapan produksi dari bahan baku hingga siap kirim & titik cek mutu', placeholderEn: 'End-to-end production flow and quality inspection gates' },
      { key: 'capacity', labelId: 'Kapasitas & Pemasok Cadangan', labelEn: 'Capacity & Backup Suppliers', placeholderId: 'Berapa unit/bulan kapasitas maksimal dan pemasok cadangannya?', placeholderEn: 'Max units/month capacity and backup supplier plan' },
    ],
    recommendedQuestId: 'Dokumentasikan 1 SOP produksi atau checklist kontrol kualitas di Operational Planning',
    recommendedQuestEn: 'Document 1 production SOP or QC checklist in Operational Planning',
    skillTag: 'Operasional Usaha',
  },

  // WING 4: READINESS & SOCIAL IMPACT (3 tools)
  {
    id: 'legal_readiness',
    wing: 'growth_impact',
    dimension: 'BUSINESS',
    titleId: '14. Legal Readiness',
    titleEn: '14. Legal Readiness',
    shortDescId: 'Checklist kesiapan legalitas usaha: NIB, NPWP, PIRT/BPOM, Halal, Merek/HKI & kontrak.',
    shortDescEn: 'Venture legal compliance checklist: NIB, tax ID, food/safety permits, Halal, trademark.',
    toolMode: 'checklist',
    checklistItems: [
      { key: 'nib', labelId: 'NIB (Nomor Induk Berusaha) via OSS terdaftar', labelEn: 'Business Registration Number (NIB / OSS) issued' },
      { key: 'npwp', labelId: 'NPWP Usaha / Pemilik terpisah untuk pembukuan', labelEn: 'Tax ID (NPWP) & separated business accounting' },
      { key: 'pirt_bpom', labelId: 'Izin Edar (PIRT / BPOM / Sertifikat Keamanan Produk)', labelEn: 'Product Distribution Permit (PIRT / BPOM / Safety cert)' },
      { key: 'halal', labelId: 'Sertifikasi Halal (Self-Declare / Reguler)', labelEn: 'Halal Certification (where applicable)' },
      { key: 'hki', labelId: 'Pengecekan / Pendaftaran Merek (DJKI / HKI)', labelEn: 'Trademark availability check / registration' },
      { key: 'bank_biz', labelId: 'Rekening operasional khusus usaha (tidak tercampur pribadi)', labelEn: 'Dedicated operational account (separated from personal)' },
    ],
    recommendedQuestId: 'Tuntaskan 1 dokumen legalitas yang belum tercentang di Legal Readiness',
    recommendedQuestEn: 'Complete 1 unchecked compliance item in Legal Readiness',
    skillTag: 'Kesiapan Legal Usaha',
  },
  {
    id: 'export_readiness',
    wing: 'growth_impact',
    dimension: 'BUSINESS',
    titleId: '15. Export Readiness',
    titleEn: '15. Export Readiness',
    shortDescId: 'Checklist kesiapan pasar global & B2B: HS Code, COA, MOQ, kemasan ekspor & Incoterms.',
    shortDescEn: 'Global B2B readiness checklist: HS Code, COA, MOQ, export packaging & Incoterms.',
    toolMode: 'checklist',
    checklistItems: [
      { key: 'hs_code', labelId: 'Kode HS (Harmonized System) produk teridentifikasi', labelEn: 'Product HS Code identified & verified' },
      { key: 'export_packaging', labelId: 'Kemasan tahan kirim internasional & label bahasa Inggris', labelEn: 'Export-grade protective packaging & English labeling' },
      { key: 'quality_cert', labelId: 'Uji Lab / COA / Phytosanitary sesuai negara tujuan', labelEn: 'Lab test / COA / Phytosanitary docs for target market' },
      { key: 'b2b_pricing', labelId: 'Daftar harga FOB/EXW (USD) & Minimum Order Quantity (MOQ)', labelEn: 'FOB/EXW B2B price sheet (USD) & MOQ defined' },
      { key: 'company_profile', labelId: 'Katalog produk & Company Profile bahasa Inggris siap kirim', labelEn: 'English product catalog & Company Profile ready' },
      { key: 'capacity_export', labelId: 'Kapasitas pasok konsisten untuk order berulang B2B', labelEn: 'Consistent supply capacity for repeat B2B orders' },
    ],
    recommendedQuestId: 'Lengkapi 1 syarat ekspor di Export Readiness untuk kesiapan katalog B2B',
    recommendedQuestEn: 'Complete 1 Export Readiness requirement for B2B catalog readiness',
    skillTag: 'Kesiapan Ekspor B2B',
  },
  {
    id: 'social_impact',
    wing: 'growth_impact',
    dimension: 'IMPACT',
    titleId: '16. Social Impact Measurement',
    titleEn: '16. Social Impact Measurement',
    shortDescId: 'Ukur penerima manfaat nyata, lapangan kerja, peningkatan pendapatan komunitas & SDG.',
    shortDescEn: 'Measure verified beneficiaries, jobs created, community income uplift & SDG alignment.',
    toolMode: 'canvas',
    fields: [
      { key: 'beneficiaries', labelId: 'Penerima Manfaat Nyata & Bukti', labelEn: 'Verified Beneficiaries & Evidence', placeholderId: 'Berapa rumah tangga/petani/pengrajin yang terbantu dan bagaimana verifikasinya?', placeholderEn: 'How many households/producers benefited and how is it verified?' },
      { key: 'economic_uplift', labelId: 'Dampak Ekonomi & Lapangan Kerja', labelEn: 'Economic Uplift & Jobs Sustained', placeholderId: 'Kenaikan harga jual mitra atau jumlah tenaga kerja lokal yang terlibat', placeholderEn: 'Partner income increase or local jobs sustained' },
      { key: 'sdg_env', labelId: 'Target SDG & Keberlanjutan Lingkungan', labelEn: 'SDG Alignment & Environmental Sustainability', placeholderId: 'Mis. SDG 1, SDG 8, SDG 12; pengurangan limbah atau pertanian ramah lingkungan', placeholderEn: 'E.g. SDG 1, SDG 8, SDG 12; waste reduction or regenerative practices' },
    ],
    recommendedQuestId: 'Dokumentasikan 1 data dampak nyata di Social Impact Measurement & simpan ke Evidence Vault',
    recommendedQuestEn: 'Document 1 verified impact metric in Social Impact Measurement & Evidence Vault',
    skillTag: 'Pengukuran Dampak Sosial',
  },
] as const;

export function createDefaultVenture(goal: string): VentureWorkspaceState {
  const now = Date.now();
  return {
    id: `vnt_${now}`,
    name: goal ? goal.slice(0, 60) : 'Usaha Sociopreneur Pertamaku',
    sector: 'Produk Lokal & Komunitas',
    summary: '',
    canvases: {},
    checklists: {
      legal_readiness: {},
      export_readiness: {},
    },
    experiments: [],
    hppInput: {
      batchUnits: 100,
      directMaterials: [{ name: 'Bahan baku utama', amountIdr: 1_500_000 }, { name: 'Kemasan & label', amountIdr: 400_000 }],
      directLabor: [{ name: 'Tenaga produksi & packing', amountIdr: 600_000 }],
      overheadCosts: [{ name: 'Listrik, gas & operasional batch', amountIdr: 300_000 }],
      targetMarginPct: 35,
    },
    bepInput: {
      fixedCostsPerMonthIdr: 3_000_000,
      sellingPricePerUnitIdr: 45_000,
      variableCostPerUnitIdr: 28_000,
      projectedMonthlyUnits: 220,
    },
    cashFlowStartingIdr: 5_000_000,
    cashFlowMonths: [
      { monthLabel: 'Bulan 1', cashInflowsIdr: 4_500_000, cashOutflowsIdr: 6_200_000 },
      { monthLabel: 'Bulan 2', cashInflowsIdr: 7_200_000, cashOutflowsIdr: 6_400_000 },
      { monthLabel: 'Bulan 3', cashInflowsIdr: 9_900_000, cashOutflowsIdr: 7_100_000 },
    ],
    updatedAt: now,
  };
}

export function buildQuestFromStudioTool(
  tool: StudioToolDefinition,
  lang: Language,
  activeDreamStepId?: string | null
): Quest {
  return {
    id: `studio_${tool.id}_${Date.now()}`,
    title: (lang === 'id' ? tool.recommendedQuestId : tool.recommendedQuestEn).slice(0, 140),
    category: 'CAREER',
    dimension: tool.dimension,
    unitType: 'MINUTES',
    defaultQty: 25,
    estMinutes: 25,
    skillTag: tool.skillTag,
    dreamStepId: activeDreamStepId ?? null,
    exp: 20,
    gold: 1,
    completed: false,
  };
}

export function computeChecklistPct(
  tool: StudioToolDefinition,
  checkedMap: Record<string, boolean> | undefined
): number {
  const items = tool.checklistItems || [];
  if (items.length === 0) return 0;
  const done = items.filter((item) => Boolean(checkedMap?.[item.key])).length;
  return Math.round((done / items.length) * 100);
}

function studioStorageKey(uid?: string): string {
  return uid ? `levelup_studio_v2:${uid}` : 'levelup_studio_v2:guest';
}

export function loadLocalVenture(uid: string | undefined, fallbackGoal: string): VentureWorkspaceState {
  try {
    const raw = localStorage.getItem(studioStorageKey(uid));
    if (!raw) return createDefaultVenture(fallbackGoal);
    const parsed = JSON.parse(raw) as Partial<VentureWorkspaceState>;
    return { ...createDefaultVenture(fallbackGoal), ...parsed };
  } catch {
    return createDefaultVenture(fallbackGoal);
  }
}

export function saveLocalVenture(venture: VentureWorkspaceState, uid?: string): void {
  try {
    localStorage.setItem(studioStorageKey(uid), JSON.stringify(venture));
  } catch {
    // Ignore storage errors
  }
}
