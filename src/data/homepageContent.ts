export interface HomepageProfessionStory {
  role: string;
  tag: string;
  story: string;
  impactFocus: string;
}

export interface TransformationStage {
  level: string;
  code: string;
  headline: string;
  description: string;
}

export interface GrowthDimensionItem {
  number: string;
  title: string;
  headline: string;
  description: string;
  accent: 'amber' | 'emerald' | 'sky' | 'indigo' | 'orange' | 'teal';
  span?: 'wide' | 'normal';
}

export interface ExperienceFeatureItem {
  number: string;
  name: string;
  officialModule: string;
  headline: string;
  description: string;
  cta: string;
  status: 'active' | 'coming_soon';
  previewKey?: 'quest' | 'studio' | 'agnes' | 'academy';
}

export interface PersonaPathItem {
  id: string;
  code: string;
  title: string;
  quote: string;
  cta: string;
  professionPresetId: string;
  presetCategory: 'ALL' | 'AGRI' | 'BIZ' | 'TECH' | 'EDU';
  suggestedGoal: string;
}

export interface EcosystemNodeItem {
  number: string;
  name: string;
  role: string;
  subtitle: string;
  description: string;
  cta: string;
  href?: string;
  internalAction?: 'register';
  urlLabel: string;
}

export const HERO_YOUTUBE_ID = 'ZP_SPrmzwo0';
export const HERO_YOUTUBE_WATCH_URL = `https://youtu.be/${HERO_YOUTUBE_ID}`;
export const HERO_AMBIENT_EMBED_URL = `https://www.youtube.com/embed/${HERO_YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${HERO_YOUTUBE_ID}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1`;
export const HERO_PLAYER_EMBED_URL = `https://www.youtube.com/embed/${HERO_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export const PUBLIC_NAV_LINKS = [
  { href: '#beranda', label: 'Beranda' },
  { href: '#tentang', label: 'Tentang Kami' },
  { href: '#perjalanan', label: 'Perjalananmu' },
  { href: '#fitur', label: 'Fitur' },
  { href: '#ekosistem', label: 'Ekosistem' },
  { href: '#kolaborasi', label: 'Kolaborasi' },
] as const;

export const HERO_ROTATING_PROFESSIONS = [
  'Seorang Pelajar?',
  'Seorang Mahasiswa?',
  'Seorang Pekerja Kantoran?',
  'Seorang Admin?',
  'Seorang Pegawai Bank?',
  'Seorang ASN?',
  'Seorang Guru?',
  'Seorang Petani?',
  'Seorang Freelancer?',
  'Seorang Profesional?',
  'Seorang Pengusaha?',
  'Seseorang yang Sedang Mencari Arah Hidup?',
] as const;

export const AWAKENING_ROUTINE_LINES = [
  'Bangun pagi.',
  'Bekerja.',
  'Menerima penghasilan.',
  'Membayar kebutuhan.',
  'Beristirahat.',
  'Lalu mengulang semuanya kembali.',
] as const;

export const AWAKENING_REFLECTION_QUESTIONS = [
  'Apakah aku sudah menggunakan seluruh potensiku?',
  'Apakah pekerjaanku hari ini masih relevan di masa depan?',
  'Apakah aku bisa memiliki kehidupan yang lebih baik?',
  'Apakah aku bisa membangun sesuatu yang bernilai?',
  'Apakah keberadaanku membawa perubahan bagi orang lain?',
] as const;

export const WORLD_CHANGES = [
  {
    code: '01',
    title: 'Transformasi Pekerjaan',
    description:
      'Dunia kerja membutuhkan manusia yang mampu beradaptasi, berpikir kritis, dan menciptakan nilai baru.',
    context: 'Adaptasi & Relevansi Masa Depan',
  },
  {
    code: '02',
    title: 'Kesenjangan Ekonomi',
    description:
      'Masih banyak masyarakat yang membutuhkan akses terhadap keterampilan, pekerjaan, penghasilan, dan kesempatan usaha.',
    context: 'Akses Peluang & Pemberdayaan',
  },
  {
    code: '03',
    title: 'Perkembangan Teknologi',
    description:
      'Artificial Intelligence dan teknologi digital membuka cara baru untuk belajar, bekerja, dan menyelesaikan masalah.',
    context: 'AI & Transformasi Digital',
  },
  {
    code: '04',
    title: 'Permasalahan Sosial',
    description:
      'Pendidikan, kesehatan, lingkungan, pertanian, dan kesejahteraan masyarakat membutuhkan lebih banyak orang yang bersedia mengambil bagian.',
    context: 'Solusi Nyata di Masyarakat',
  },
] as const;

export const PROFESSION_STORIES: HomepageProfessionStory[] = [
  {
    role: 'Petani',
    tag: 'Pangan & Komoditas Lokal',
    story: 'Seorang petani yang mengembangkan produk bernilai tambah dan meningkatkan kesejahteraan petani lainnya.',
    impactFocus: 'Nilai tambah panen & ekonomi desa',
  },
  {
    role: 'Guru',
    tag: 'Pendidikan & Generasi',
    story: 'Seorang guru yang menciptakan metode pembelajaran untuk menjangkau lebih banyak anak.',
    impactFocus: 'Akses belajar yang lebih luas',
  },
  {
    role: 'ASN',
    tag: 'Pelayanan Publik',
    story: 'Seorang ASN yang menghadirkan inovasi pelayanan publik.',
    impactFocus: 'Birokrasi yang melayani lebih baik',
  },
  {
    role: 'Pekerja Kantoran',
    tag: 'Organisasi & Tim',
    story: 'Seorang pekerja kantoran yang membangun solusi untuk meningkatkan produktivitas timnya.',
    impactFocus: 'Budaya kerja yang sehat & efektif',
  },
  {
    role: 'Mahasiswa',
    tag: 'Riset & Inisiatif Muda',
    story: 'Seorang mahasiswa yang mengembangkan ide untuk menjawab persoalan di masyarakat.',
    impactFocus: 'Karya kampus yang berdampak nyata',
  },
  {
    role: 'Pengusaha',
    tag: 'Usaha & Komunitas',
    story: 'Seorang pengusaha yang membuka kesempatan kerja dan memberdayakan komunitas lokal.',
    impactFocus: 'Lapangan kerja & rantai nilai lokal',
  },
];

export const TRANSFORMATION_STAGES: TransformationStage[] = [
  {
    level: 'LEVEL 01',
    code: 'DISCOVER YOURSELF',
    headline: 'Kenali dirimu.',
    description:
      'Temukan potensi, nilai hidup, kekuatan, keterbatasan, dan tujuan yang ingin kamu perjuangkan.',
  },
  {
    level: 'LEVEL 02',
    code: 'DEVELOP YOURSELF',
    headline: 'Kembangkan dirimu.',
    description:
      'Bangun keterampilan, karakter, pola pikir, kesehatan, serta kebiasaan yang mendukung pertumbuhanmu.',
  },
  {
    level: 'LEVEL 03',
    code: 'EMPOWER YOURSELF',
    headline: 'Berdayakan dirimu.',
    description:
      'Bangun kemandirian melalui karier, pengelolaan keuangan, peluang pekerjaan, dan kewirausahaan.',
  },
  {
    level: 'LEVEL 04',
    code: 'CREATE VALUE',
    headline: 'Ciptakan nilai.',
    description:
      'Gunakan pengetahuan, keterampilan, dan kreativitasmu untuk menyelesaikan persoalan nyata.',
  },
  {
    level: 'LEVEL 05',
    code: 'MAKE AN IMPACT',
    headline: 'Hadirkan perubahan.',
    description:
      'Jadikan pekerjaan, usaha, dan kontribusimu sebagai sarana untuk meningkatkan kualitas kehidupan orang lain.',
  },
];

export const SIX_GROWTH_DIMENSIONS: GrowthDimensionItem[] = [
  {
    number: '01',
    title: 'PERSONAL GROWTH',
    headline: 'Bangun dirimu dari dalam.',
    description:
      'Kenali potensi, temukan arah hidup, kembangkan karakter, dan bangun pola pikir yang mendukung pertumbuhan jangka panjang.',
    accent: 'amber',
    span: 'wide',
  },
  {
    number: '02',
    title: 'HEALTH & HABITS',
    headline: 'Bangun kehidupan yang lebih sehat.',
    description:
      'Kelola waktu, bentuk kebiasaan positif, dan jaga keseimbangan kesehatan fisik, mental, serta kehidupan sehari-hari.',
    accent: 'emerald',
  },
  {
    number: '03',
    title: 'SKILLS & CAREER',
    headline: 'Persiapkan dirimu untuk masa depan.',
    description:
      'Kembangkan keterampilan yang relevan, tingkatkan kompetensi profesional, dan bangun perjalanan karier yang lebih terarah.',
    accent: 'sky',
  },
  {
    number: '04',
    title: 'FINANCIAL GROWTH',
    headline: 'Bangun kemandirian finansial.',
    description:
      'Pelajari pengelolaan penghasilan, pengeluaran, tabungan, perencanaan keuangan, serta peluang menciptakan sumber pendapatan.',
    accent: 'indigo',
  },
  {
    number: '05',
    title: 'ENTREPRENEURSHIP',
    headline: 'Ubah ide menjadi peluang.',
    description:
      'Temukan kebutuhan pasar, rancang solusi, bangun produk, dan kembangkan usaha yang berkelanjutan.',
    accent: 'orange',
  },
  {
    number: '06',
    title: 'SOCIAL IMPACT',
    headline: 'Jadikan pertumbuhanmu berarti bagi orang lain.',
    description:
      'Gunakan kemampuan dan sumber daya yang kamu miliki untuk menjawab kebutuhan masyarakat serta menciptakan perubahan nyata.',
    accent: 'teal',
    span: 'wide',
  },
];

export const EXPERIENCE_FEATURES: ExperienceFeatureItem[] = [
  {
    number: '01',
    name: 'AWAKENING',
    officialModule: 'Awakening & Awakening 2.0',
    headline: 'Sadari potensimu.',
    description:
      'Mulai dengan refleksi untuk memahami siapa dirimu, di mana kamu berada saat ini, dan ke mana kamu ingin melangkah.',
    cta: 'Kenali Dirimu',
    status: 'active',
  },
  {
    number: '02',
    name: 'DREAM MAP',
    officialModule: 'Peta Impian (5 & 10 Tahap)',
    headline: 'Rancang masa depanmu.',
    description:
      'Ubah impian menjadi tujuan yang jelas, langkah yang terarah, dan rencana pengembangan diri yang dapat kamu jalankan.',
    cta: 'Bangun Dream Map',
    status: 'active',
  },
  {
    number: '03',
    name: 'DAILY QUEST',
    officialModule: 'Daily Quests & Habit Streaks',
    headline: 'Bertumbuh satu langkah setiap hari.',
    description:
      'Bangun konsistensi melalui aktivitas, tantangan, dan kebiasaan kecil yang mendukung tujuan hidupmu.',
    cta: 'Mulai Tantangan',
    status: 'active',
    previewKey: 'quest',
  },
  {
    number: '04',
    name: 'LEVEL UP ACADEMY',
    officialModule: 'LevelUp Academy (7 Trek)',
    headline: 'Pelajari keterampilan. Terapkan dalam kehidupan.',
    description:
      'Eksplorasi pengetahuan dan keterampilan praktis yang dapat membantumu berkembang dalam kehidupan, pekerjaan, dan usaha.',
    cta: 'Jelajahi Academy',
    status: 'active',
    previewKey: 'academy',
  },
  {
    number: '05',
    name: 'CAREER DEVELOPMENT',
    officialModule: 'Career Coach & 30+ Profesi',
    headline: 'Bangun karier yang siap menghadapi perubahan.',
    description:
      'Kenali arah kariermu, tingkatkan kompetensi, dan tunjukkan kemampuanmu melalui karya nyata.',
    cta: 'Kembangkan Karier',
    status: 'active',
  },
  {
    number: '06',
    name: 'BUSINESS STUDIO',
    officialModule: 'Business Studio (16 Tools)',
    headline: 'Bangun usaha dari sebuah persoalan nyata.',
    description:
      'Temukan peluang, pahami pelanggan, rancang model bisnis, validasi ide, dan kembangkan solusi yang bernilai bagi masyarakat.',
    cta: 'Mulai Bangun Bisnis',
    status: 'active',
    previewKey: 'studio',
  },
  {
    number: '07',
    name: 'AGNES AI',
    officialModule: 'Agnes AI 2.0 (10 Mode Copilot)',
    headline: 'Teman berpikir dalam perjalananmu.',
    description:
      'Gunakan AI untuk membantumu berefleksi, belajar, mengeksplorasi ide, menyusun strategi, dan merencanakan langkah berikutnya.',
    cta: 'Kenali Agnes',
    status: 'active',
    previewKey: 'agnes',
  },
  {
    number: '08',
    name: 'MY PORTFOLIO',
    officialModule: 'Evidence Vault & Sertifikat',
    headline: 'Tunjukkan apa yang telah kamu ciptakan.',
    description:
      'Dokumentasikan pembelajaran, proyek, keterampilan, pencapaian, dan kontribusimu sebagai bukti perjalanan pertumbuhan.',
    cta: 'Bangun Portofolio',
    status: 'active',
  },
  {
    number: '09',
    name: 'COMMUNITY',
    officialModule: 'Roadmap Komunitas & Kolaborasi',
    headline: 'Bertumbuh bersama orang-orang yang ingin membawa perubahan.',
    description:
      'Ruang komunitas kolaboratif sedang disiapkan pada fase pengembangan berikutnya. Kamu dapat mendaftar lebih awal dan terhubung lewat ekosistem Sociopreneur.',
    cta: 'Ikuti Perkembangan',
    status: 'coming_soon',
  },
];

export const LEARNING_CYCLE_STEPS = [
  {
    step: '01',
    key: 'LEARN',
    description: 'Pelajari pengetahuan dan keterampilan baru.',
  },
  {
    step: '02',
    key: 'THINK',
    description: 'Pahami kebutuhan, tantangan, dan peluang.',
  },
  {
    step: '03',
    key: 'CREATE',
    description: 'Ubah ide menjadi karya dan solusi.',
  },
  {
    step: '04',
    key: 'ACT',
    description: 'Terapkan solusi dalam kehidupan nyata.',
  },
  {
    step: '05',
    key: 'REFLECT',
    description: 'Evaluasi hasil, pelajari pengalaman, dan terus bertumbuh.',
  },
] as const;

export const PERSONA_PATHS: PersonaPathItem[] = [
  {
    id: 'pelajar_mahasiswa',
    code: 'PATH 01',
    title: 'PELAJAR & MAHASISWA',
    quote: 'Saya ingin mengenali potensi, menemukan tujuan, mengembangkan keterampilan, dan mempersiapkan masa depan.',
    cta: 'Temukan Arahku',
    professionPresetId: 'college_student',
    presetCategory: 'EDU',
    suggestedGoal: 'Mengenali potensi, membangun keterampilan masa depan, dan merancang karya berdampak sebelum lulus.',
  },
  {
    id: 'pekerja_profesional',
    code: 'PATH 02',
    title: 'PEKERJA & PROFESIONAL',
    quote: 'Saya ingin meningkatkan kemampuan, mengembangkan karier, dan menciptakan nilai lebih melalui pekerjaan saya.',
    cta: 'Tingkatkan Kompetensiku',
    professionPresetId: 'hr_operations',
    presetCategory: 'BIZ',
    suggestedGoal: 'Meningkatkan kompetensi profesional, produktivitas kerja, dan kontribusi nyata bagi tim serta lingkungan.',
  },
  {
    id: 'pencari_kerja',
    code: 'PATH 03',
    title: 'PENCARI KERJA',
    quote: 'Saya ingin membangun keterampilan, portofolio, dan menemukan peluang untuk kembali berdaya.',
    cta: 'Persiapkan Masa Depanku',
    professionPresetId: 'freelance_consultant',
    presetCategory: 'BIZ',
    suggestedGoal: 'Membangun keterampilan terapan, portofolio bukti karya, dan kemandirian penghasilan.',
  },
  {
    id: 'pengusaha_umkm',
    code: 'PATH 04',
    title: 'PENGUSAHA & UMKM',
    quote: 'Saya ingin mengembangkan usaha, menjangkau pasar, meningkatkan penghasilan, dan memberdayakan masyarakat.',
    cta: 'Kembangkan Usahaku',
    professionPresetId: 'umkm_merchant',
    presetCategory: 'BIZ',
    suggestedGoal: 'Menata HPP, arus kas, validasi produk, serta memperluas pasar dan dampak sosial usaha.',
  },
  {
    id: 'petani_produsen',
    code: 'PATH 05',
    title: 'PETANI & PRODUSEN LOKAL',
    quote: 'Saya ingin meningkatkan nilai produk, mengembangkan potensi lokal, dan membangun peluang ekonomi yang lebih luas.',
    cta: 'Kembangkan Potensi Lokal',
    professionPresetId: 'farmer_modern',
    presetCategory: 'AGRI',
    suggestedGoal: 'Meningkatkan nilai tambah produk lokal, kualitas pascapanen, dan memperluas akses pasar komunitas.',
  },
  {
    id: 'pendidik_komunitas',
    code: 'PATH 06',
    title: 'PENDIDIK & PENGGERAK KOMUNITAS',
    quote: 'Saya ingin meningkatkan kapasitas diri, memberdayakan orang lain, dan membangun perubahan bersama.',
    cta: 'Perluas Dampakku',
    professionPresetId: 'educator_researcher',
    presetCategory: 'EDU',
    suggestedGoal: 'Memperkuat kapasitas mendampingi orang lain dan membangun inisiatif pemberdayaan berkelanjutan.',
  },
];

export const ECOSYSTEM_NODES: EcosystemNodeItem[] = [
  {
    number: 'ECOSYSTEM 01',
    name: 'LEVEL UP',
    role: 'Human Development',
    subtitle: 'Prepare Yourself',
    description:
      'Tempat kamu mengembangkan diri, keterampilan, karier, dan kemampuan kewirausahaan sebagai persiapan menjadi sociopreneur.',
    cta: 'Mulai Bertumbuh',
    internalAction: 'register',
    urlLabel: 'levelup.sociopreneur.online',
  },
  {
    number: 'ECOSYSTEM 02',
    name: 'SOCIOPRENEUR.ONLINE',
    role: 'Value Creation',
    subtitle: 'Create Sustainable Value',
    description:
      'Ruang untuk mengenal sociopreneurship, mengembangkan peluang usaha, mengeksplorasi produk, dan menjangkau pasar yang lebih luas.',
    cta: 'Jelajahi Sociopreneur',
    href: 'https://sociopreneur.online',
    urlLabel: 'sociopreneur.online',
  },
  {
    number: 'ECOSYSTEM 03',
    name: 'SOCIOLINE',
    role: 'Mission & Calling',
    subtitle: 'Live Your Calling',
    description:
      'Ruang untuk menemukan peran dalam pelayanan misi melalui The Word, The World, dan The Work — menghubungkan iman, pemahaman terhadap kebutuhan manusia, serta tindakan nyata.',
    cta: 'Jelajahi Socioline',
    href: 'https://socioline.sociopreneur.online',
    urlLabel: 'socioline.sociopreneur.online',
  },
];

export const IMPACT_GOALS = [
  { code: '01', text: 'Manusia yang semakin berdaya.' },
  { code: '02', text: 'Generasi muda yang semakin siap menghadapi masa depan.' },
  { code: '03', text: 'Masyarakat yang memiliki akses terhadap peluang ekonomi.' },
  { code: '04', text: 'Usaha lokal yang bertumbuh dan menciptakan nilai.' },
  { code: '05', text: 'Komunitas yang mampu mengembangkan solusinya sendiri.' },
] as const;

export const IMPACT_FRAMEWORK_INDICATORS = [
  {
    label: 'People Empowered',
    note: 'Individu yang bertumbuh melalui kebiasaan, refleksi, dan arah hidup yang jelas.',
  },
  {
    label: 'Skills Developed',
    note: 'Kompetensi nyata yang diverifikasi lewat praktik, bukan sekadar jam tonton.',
  },
  {
    label: 'Projects Created',
    note: 'Karya, inisiatif, dan solusi terapan yang terdokumentasi di portofolio.',
  },
  {
    label: 'Businesses Developed',
    note: 'Usaha yang terbangun dengan model bisnis, HPP, dan validasi pasar yang sehat.',
  },
  {
    label: 'Economic Opportunities Created',
    note: 'Peluang kerja, penghasilan, dan rantai nilai ekonomi yang terbuka.',
  },
  {
    label: 'Communities Impacted',
    note: 'Komunitas lokal yang merasakan manfaat nyata secara berkelanjutan.',
  },
] as const;

export const PARTNERSHIP_CATEGORIES = [
  'Educational Institutions',
  'Government',
  'Corporate & CSR',
  'Community',
  'Social Organizations',
  'Churches & Mission Organizations',
  'Mentors & Professionals',
  'Entrepreneurs',
] as const;

export const SAMPLE_DEMO_QUESTS = [
  {
    time: '07:00',
    tag: 'HABITS',
    title: 'Olahraga ringan 20 menit & check-in energi pagi',
    xp: 20,
  },
  {
    time: '10:00',
    tag: 'ACADEMY',
    title: 'Pelajari modul Riset Pelanggan & validasi masalah nyata',
    xp: 25,
  },
  {
    time: '14:00',
    tag: 'STUDIO',
    title: 'Hitung HPP, harga jual & BEP di Business Studio',
    xp: 30,
  },
  {
    time: '19:30',
    tag: 'PORTFOLIO',
    title: 'Dokumentasikan bukti wawancara lapangan ke Evidence Vault',
    xp: 35,
  },
] as const;

export const PUBLIC_FAQ_ITEMS = [
  {
    q: 'Apakah Level Up hanya untuk orang yang ingin mendirikan perusahaan?',
    a: 'Tidak. Level Up terbuka untuk pelajar, mahasiswa, pekerja kantoran, ASN, guru, petani, freelancer, hingga pengusaha. Kamu bisa membangun pola pikir sociopreneur dan membawa dampak dari profesimu hari ini.',
  },
  {
    q: 'Apa bedanya Level Up dengan platform kursus online biasa?',
    a: 'Level Up tidak berhenti pada materi belajar. Kami menghubungkan refleksi diri (Awakening), Dream Map, kebiasaan harian (Daily Quest), LevelUp Academy, Business Studio, Agnes AI, hingga dokumentasi portofolio bukti karya nyata.',
  },
  {
    q: 'Bagaimana privasi jurnal dan data pribadi saya dijaga?',
    a: 'Level Up menerapkan Privacy by Default. Jurnal pribadi, catatan refleksi, tidur, dan kesehatan bersifat privat milik akunmu sendiri dan tidak dibagikan ke pihak lain tanpa persetujuan eksplisit.',
  },
  {
    q: 'Bagaimana cara memulai perjalanan di Level Up?',
    a: 'Klik tombol "Mulai Perjalananmu", buat akun menggunakan Email atau Google, lalu ikuti tahap Awakening untuk memetakan profesi, tujuan hidup, dan langkah pertamamu.',
  },
] as const;
