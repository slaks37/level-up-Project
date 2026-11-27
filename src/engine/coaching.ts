import type { CareerProfile, DreamStep, GymProfile, Language, PlayerProfile, Quest } from '../types';
import type { DayPhase, DailyEvidence, JournalEntry, LoggedActivity } from './journal';
import type { CalendarEvent } from '../services/googleCalendar';

export const getCurrentDreamSteps = (player: PlayerProfile) => player.dreamSteps.filter((step) => !step.archived);
export const getActiveDreamStep = (player: PlayerProfile) => getCurrentDreamSteps(player).find((step) => !step.completed);

export const defaultCareer: CareerProfile = {
  industry: '', responsibilities: '', managesTeam: false, usesSprints: false,
  project: '', projectStatus: 'planning', lastMeeting: '', nextAction: '',
};
export const defaultGym: GymProfile = { goal: 'general', level: 'beginner', equipment: 'home', days: 2, limitations: '', currentPain: false };

export function getCareerActions(player: PlayerProfile, lang: Language) {
  const id = lang === 'id';
  const work = player.career || defaultCareer;
  const role = player.profession;
  const manager = work.managesTeam || /manag|manajer|head|director|direktur|supervisor|lead|founder|owner/i.test(role);
  const sprint = work.usesSprints || /product|produk|software|agile|scrum/i.test(role);
  const actions = [
    id ? 'Buka catatan rapat terakhir, cek siapa pemilik tindak lanjut dan tenggatnya.' : 'Open your last meeting notes and check follow-up owners and deadlines.',
    id ? (sprint ? 'Cek sprint aktif: apa yang selesai, terhambat, dan perlu keputusan hari ini?' : 'Cek progres pekerjaan: apa yang selesai, terhambat, dan langkah berikutnya?') :
      (sprint ? 'Review the active sprint: what is done, blocked, or needs a decision?' : 'Review progress: what is done, blocked, and next?'),
    id ? (manager ? 'Cek progres dan kapasitas tim. Pilih satu hambatan yang bisa kamu bantu hari ini.' : 'Beri kabar singkat tentang progres dan tanyakan dukungan yang kamu perlukan.') :
      (manager ? 'Check team progress and capacity. Pick one blocker you can help remove.' : 'Share a short progress update and ask for any support you need.'),
    id ? 'Ada proyek baru? Catat hasil yang diharapkan, tenggat, dan langkah pertama.' : 'Any new project? Note the expected outcome, due date, and first action.',
  ];
  if (/educat|edutech|pendidik|guru|teacher|learning/i.test(role + ' ' + work.industry)) {
    actions.push(id ? 'Cek satu hasil belajar atau masukan peserta, lalu pilih perbaikan berikutnya.' : 'Review a learning outcome or learner feedback, then pick the next improvement.');
  } else if (/sales|market|penjualan|pemasaran|account exec/i.test(role)) {
    actions.push(id ? 'Tinjau pipeline dan jadwalkan tindak lanjut untuk satu peluang aktif.' : 'Review your pipeline and schedule one follow-up for an active opportunity.');
  } else if (/software|engineer|developer|produk|product/i.test(role)) {
    actions.push(id ? 'Cek satu bug, umpan balik pengguna, atau perubahan yang siap diuji.' : 'Check one bug, user insight, or change that is ready for validation.');
  }
  const job = work.responsibilities.trim().split(/[.\n]/)[0]?.slice(0, 88);
  if (job) actions.unshift(id ? `Cek hasil dan langkah berikutnya untuk tanggung jawab ini: ${job}.` :
    `Review the outcome and next action for this responsibility: ${job}.`);
  return [...new Set(work.nextAction ? [work.nextAction, ...actions] : actions)];
}

export function getRoadmapActions(step: DreamStep, lang: Language): string[] {
  const existing = (step.actions || []).filter((action) => typeof action === 'string' && action.trim()).slice(0, 6);
  if (existing.length) return existing;
  const subject = (step.skillName || step.title).slice(0, 70);
  if (/skill inti|core skill/i.test(step.phase)) return lang === 'id' ? [
    `Pilih satu alat atau teknik untuk berlatih ${subject}.`,
    'Kerjakan satu contoh kecil dan simpan hasilnya sebagai pembanding.',
    'Ulangi contoh dengan satu variasi, lalu catat kesalahan yang masih terjadi.',
  ] : [
    `Choose one tool or technique to practice ${subject}.`,
    'Complete a small example and save it as a baseline.',
    'Repeat with one variation and note the mistakes that remain.',
  ];
  if (/evaluasi|optimization/i.test(step.phase)) return lang === 'id' ? [
    'Pilih satu hasil yang sudah dibuat dan tentukan cara menilai kualitasnya.',
    'Bandingkan hasil dengan target, lalu catat selisih yang paling penting.',
    'Perbaiki satu bagian dan ukur kembali hasilnya.',
  ] : [
    'Pick a deliverable and decide how to measure its quality.',
    'Compare the result with your target and note the biggest gap.',
    'Improve one part and measure it again.',
  ];
  if (/hasil nyata|first output|target tercapai|target achieved/i.test(step.phase)) return lang === 'id' ? [
    `Tulis kriteria selesai untuk satu hasil dari ${subject}.`,
    'Buat versi terkecil yang sudah bisa dicoba atau diperlihatkan.',
    'Catat satu tanggapan atau hasil uji dan pilih perbaikan berikutnya.',
  ] : [
    `Write a clear definition of done for one result from ${subject}.`,
    'Make the smallest version someone can try or review.',
    'Record one reaction or test result and choose the next improvement.',
  ];
  return lang === 'id' ? [
    `Tulis satu hasil yang ingin kamu buktikan lewat ${subject}.`,
    `Catat satu contoh yang bisa dijadikan acuan untuk ${subject}.`,
    `Buat versi pertama dalam satu sesi dan tulis bagian yang masih perlu diperbaiki.`,
    'Minta satu masukan lalu revisi bagian yang paling penting.',
  ] : [
    `Write one outcome you want to demonstrate through ${subject}.`,
    `Find one example to use as a reference for ${subject}.`,
    'Build a first version in one session and note what needs improvement.',
    'Ask for one piece of feedback and revise the most important part.',
  ];
}

export function getNextRoadmapAction(step: DreamStep, lang: Language) {
  return getRoadmapActions(step, lang).map((action) => action.slice(0, 140))
    .find((action) => !step.completedActions?.includes(action));
}

export interface DailyTaskSuggestion {
  title: string;
  category: 'STUDY' | 'CAREER';
  minutes: number;
  skill: string;
  reason: string;
  stepId?: string;
  track?: 'career' | 'dream' | 'study';
}

export interface CapturedTaskPreview {
  quest: Quest;
  track: 'career' | 'dream' | 'study' | 'fitness';
  autoCompanion?: 'career' | 'dream';
}

const STOPWORDS = new Set([
  'yang', 'untuk', 'dengan', 'dalam', 'dari', 'pada', 'atau', 'akan', 'bisa', 'harus',
  'agar', 'supaya', 'menjadi', 'punya', 'buat', 'membuat', 'lebih', 'tinggi', 'baru',
  'kerja', 'hari', 'bulan', 'tahun', 'target', 'level', 'with', 'from', 'that', 'this',
  'into', 'your', 'have', 'make', 'more', 'build', 'work', 'goal', 'step',
]);

const FITNESS_REGEX =
  /\b(gym|workout|olahraga|lari|jogging|joging|running|run|push[\s-]?up|pull[\s-]?up|squat|plank|cardio|kardio|renang|swimming|swim|sepeda|gowes|cycling|yoga|stretching|senam|sit[\s-]?up|angkat beban|fitness|jalan cepat|jalan santai|skipping|badminton|futsal|basket|tennis|pilates|latihan fisik)\b/i;

const STUDY_REGEX =
  /\b(belajar|study|baca|reading|read|buku|kursus|course|riset|research|materi|modul|tutorial|latihan soal|kuliah|skripsi|pelajari|ngoding|coding|programming|bahasa|english|inggris|sertifikasi|webinar|workshop|review catatan|catatan belajar|nonton materi)\b/i;

const DREAM_HINT_REGEX =
  /\b(impian|dream|peta impian|usaha sendiri|bisnis sendiri|side project|portofolio|portfolio|passion|cita-cita|bisnis baru|produk sendiri)\b/i;

function extractKeywords(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  )];
}

export function parseDailyTargetLine(
  rawLine: string,
  player: PlayerProfile,
  lang: Language
): CapturedTaskPreview | null {
  const id = lang === 'id';
  const cleaned = rawLine
    .replace(/^\s*(?:[-*•–—]+|\d+[.)]|\[[ xX]?\])\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  if (cleaned.length < 2) return null;

  const isFitness = FITNESS_REGEX.test(cleaned);
  const isStudy = !isFitness && STUDY_REGEX.test(cleaned);
  const category: Quest['category'] = isFitness ? 'FITNESS' : isStudy ? 'STUDY' : 'CAREER';

  // Detect duration or reps from user phrasing
  let unitType: Quest['unitType'] = 'MINUTES';
  let defaultQty = isFitness ? 15 : 25;
  let estMinutes = defaultQty;

  const hourMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*(?:jam|hours?|hrs?|h)\b/i);
  const minMatch = cleaned.match(/(\d+)\s*(?:menit|mnt|minutes?|mins?|m)\b/i);
  const setRepMatch = cleaned.match(/(\d+)\s*[x×]\s*(\d+)/i);
  const repMatch = cleaned.match(/(\d+)\s*(?:reps?|repetisi|kali)\b/i);

  if (isFitness && setRepMatch) {
    const sets = Math.max(1, Math.min(8, Number(setRepMatch[1]) || 2));
    const reps = Math.max(1, Math.min(100, Number(setRepMatch[2]) || 10));
    unitType = 'REPS';
    defaultQty = sets * reps;
    estMinutes = Math.max(10, sets * 4);
  } else if (isFitness && repMatch) {
    unitType = 'REPS';
    defaultQty = Math.max(5, Math.min(500, Number(repMatch[1]) || 20));
    estMinutes = 15;
  } else if (hourMatch) {
    const hours = Number(hourMatch[1].replace(',', '.'));
    if (Number.isFinite(hours) && hours > 0) {
      defaultQty = Math.max(10, Math.min(240, Math.round(hours * 60)));
      estMinutes = defaultQty;
    }
  } else if (minMatch) {
    const mins = Number(minMatch[1]);
    if (Number.isFinite(mins) && mins > 0) {
      defaultQty = Math.max(5, Math.min(240, mins));
      estMinutes = defaultQty;
    }
  }

  const activeStep = getActiveDreamStep(player);
  const dreamKeywords = extractKeywords(
    [player.goal, activeStep?.title || '', activeStep?.skillName || ''].join(' ')
  );
  const lower = cleaned.toLowerCase();
  const matchesDreamKeyword =
    !isFitness &&
    (DREAM_HINT_REGEX.test(cleaned) ||
      dreamKeywords.some((kw) => lower.includes(kw)));

  const dreamStepId = matchesDreamKeyword && activeStep ? activeStep.id : null;
  const track: CapturedTaskPreview['track'] = isFitness
    ? 'fitness'
    : dreamStepId
      ? 'dream'
      : category === 'STUDY'
        ? 'study'
        : 'career';

  // Pick skill tag from player's existing skills if mentioned, else contextual default
  const existingSkillNames = [
    ...(player.shadows || []).map((s) => s.name),
    ...Object.values(player.skillProgress || {}).map((s) => s.name),
  ];
  const matchedSkill = existingSkillNames.find(
    (name) => name.length >= 3 && lower.includes(name.toLowerCase())
  );
  const skillTag =
    matchedSkill ||
    (dreamStepId && activeStep?.skillName) ||
    (isFitness
      ? (id ? 'Kebugaran Rutin' : 'Fitness Routine')
      : category === 'STUDY'
        ? (id ? 'Belajar Terarah' : 'Focused Study')
        : player.career?.project?.trim().slice(0, 40) ||
          (id ? 'Eksekusi Karier' : 'Career Execution'));

  const quest: Quest = {
    id: 'target-' + crypto.randomUUID(),
    title: cleaned,
    category,
    unitType,
    defaultQty,
    estMinutes,
    skillTag,
    dreamStepId,
    exp: 20,
    gold: 1,
    completed: false,
  };

  return { quest, track };
}

export function buildDualTrackCompanionTask(
  missingTrack: 'career' | 'dream',
  player: PlayerProfile,
  lang: Language,
  existingTitles: Set<string>
): CapturedTaskPreview | null {
  const id = lang === 'id';
  if (missingTrack === 'dream') {
    const active = getActiveDreamStep(player);
    if (!active) return null;
    const rawTitle =
      getNextRoadmapAction(active, lang) ||
      (id ? `Langkah kecil untuk impian: ${active.title}` : `Small dream step: ${active.title}`);
    const title = rawTitle.trim().slice(0, 140);
    if (!title || existingTitles.has(title.toLowerCase())) return null;
    const category: Quest['category'] = /fondasi|skill inti|foundation|core skill/i.test(active.phase)
      ? 'STUDY'
      : 'CAREER';
    return {
      quest: {
        id: 'daily-plan-' + crypto.randomUUID(),
        title,
        category,
        unitType: 'MINUTES',
        defaultQty: 15,
        estMinutes: 15,
        skillTag: active.skillName || (id ? 'Peta Impian' : 'Dream Roadmap'),
        dreamStepId: active.id,
        exp: 20,
        gold: 1,
        completed: false,
      },
      track: 'dream',
      autoCompanion: 'dream',
    };
  }

  // Missing Career track
  const work = player.career;
  const candidateTitle =
    (work?.project && work.projectStatus === 'blocked'
      ? (id
          ? `Urai 1 hambatan di proyek ${work.project}`
          : `Unblock 1 issue on ${work.project}`)
      : work?.nextAction?.trim()) || getCareerActions(player, lang)[0];
  const title = (candidateTitle || '').trim().slice(0, 140);
  if (!title || existingTitles.has(title.toLowerCase())) return null;
  return {
    quest: {
      id: 'daily-plan-' + crypto.randomUUID(),
      title,
      category: 'CAREER',
      unitType: 'MINUTES',
      defaultQty: 15,
      estMinutes: 15,
      skillTag: work?.project?.trim().slice(0, 40) || (id ? 'Eksekusi Karier' : 'Career Execution'),
      dreamStepId: null,
      exp: 20,
      gold: 1,
      completed: false,
    },
    track: 'career',
    autoCompanion: 'career',
  };
}

export function buildCapturedTargetPlan(
  noteText: string,
  player: PlayerProfile,
  lang: Language,
  options: { includeDualTrackCompanion?: boolean } = {}
): {
  userTasks: CapturedTaskPreview[];
  companionTasks: CapturedTaskPreview[];
  allQuestsToAdd: Quest[];
} {
  const existingTitles = new Set(
    player.quests.map((q) => q.title.trim().slice(0, 140).toLowerCase())
  );
  const rawLines = noteText
    .split(/\n+/)
    .flatMap((line) => (line.includes(';') ? line.split(';') : [line]));

  const userTasks: CapturedTaskPreview[] = [];
  for (const raw of rawLines) {
    if (userTasks.length >= 8) break;
    const parsed = parseDailyTargetLine(raw, player, lang);
    if (!parsed) continue;
    const key = parsed.quest.title.toLowerCase();
    if (existingTitles.has(key)) continue;
    existingTitles.add(key);
    userTasks.push(parsed);
  }

  const companionTasks: CapturedTaskPreview[] = [];
  if (options.includeDualTrackCompanion && userTasks.length > 0) {
    const hasCareerTrack =
      player.quests.some((q) => !q.completed && q.category === 'CAREER' && !q.dreamStepId) ||
      userTasks.some((t) => t.track === 'career');
    const hasDreamTrack =
      player.quests.some((q) => !q.completed && Boolean(q.dreamStepId)) ||
      userTasks.some((t) => t.track === 'dream');

    if (!hasDreamTrack) {
      const dreamComp = buildDualTrackCompanionTask('dream', player, lang, existingTitles);
      if (dreamComp) {
        existingTitles.add(dreamComp.quest.title.toLowerCase());
        companionTasks.push(dreamComp);
      }
    }
    if (!hasCareerTrack) {
      const careerComp = buildDualTrackCompanionTask('career', player, lang, existingTitles);
      if (careerComp) {
        existingTitles.add(careerComp.quest.title.toLowerCase());
        companionTasks.push(careerComp);
      }
    }
  }

  return {
    userTasks,
    companionTasks,
    allQuestsToAdd: [...userTasks.map((t) => t.quest), ...companionTasks.map((t) => t.quest)],
  };
}

export function planDailyFocus(player: PlayerProfile, evidence: DailyEvidence, events: CalendarEvent[],
  phase: DayPhase, now: number, lang: Language) {
  const id = lang === 'id';
  const active = getActiveDreamStep(player);
  const pending = player.quests.filter((task) => !task.completed);
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  const upcoming = events.filter((event) => !event.allDay && event.title.trim() &&
    Date.parse(event.start) > now && Date.parse(event.start) < endOfDay.getTime()).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const meeting = upcoming[0];
  const light = evidence.status === 'rest' || evidence.status === 'watch';
  const goalsDone = getCurrentDreamSteps(player).some((step) => step.completed);
  const note = evidence.status === 'rest'
    ? (id ? 'Sisihkan waktu untuk pulih. Pilih satu tindak lanjut singkat bila masih perlu.' : 'Make time to recover. Pick one short follow-up if needed.')
    : phase === 'evening'
      ? (id ? 'Tutup hari dengan mencatat hasil karier & impian, lalu siapkan satu langkah untuk besok.' : 'Close the day by recording career & dream wins, then pick one step for tomorrow.')
      : light
        ? (id ? 'Sisakan jeda dan pilih satu langkah ringan agar karier & impian tetap bergerak.' : 'Leave room for a break and pick one light step to keep career & dream moving.')
        : active
          ? (id ? `Jalankan 2 jalur hari ini: tugas karier harian + 1 langkah kecil Peta Impian (${active.title}).` : `Run both tracks today: daily career work + 1 small Dream Roadmap step (${active.title}).`)
          : goalsDone
            ? (id ? 'Tahapmu sudah selesai. Tinjau hasil sebelum memilih target berikutnya.' : 'Your milestones are complete. Review your results before picking the next goal.')
            : (id ? 'Pilih satu hasil karier dan satu langkah impian untuk hari ini.' : 'Choose one career outcome and one dream step for today.');

  const candidates: Array<Omit<DailyTaskSuggestion, 'minutes'>> = [];
  const projectSkill = id ? 'Manajemen proyek' : 'Project management';
  if (meeting) candidates.push({
    title: (id ? 'Siapkan bahan dan keputusan untuk ' : 'Prepare notes and decisions for ') + meeting.title,
    category: 'CAREER', skill: projectSkill, track: 'career',
    reason: id ? 'Jalur Karier · Ada acara berikutnya di agenda hari ini.' : 'Career track · Next event on your calendar today.',
  });
  if (evidence.status !== 'rest' && phase !== 'evening') {
    const work = player.career;
    if (work?.project && work.projectStatus === 'blocked') candidates.push({
      title: id ? `Catat satu hambatan di ${work.project} dan siapa yang bisa membantu.` : `Identify one blocker on ${work.project} and who can help.`,
      category: 'CAREER', skill: projectSkill, track: 'career',
      reason: id ? 'Jalur Karier · Proyek ini kamu tandai terhambat.' : 'Career track · You marked this project as blocked.',
    });
    const action = active && getNextRoadmapAction(active, lang);
    if (active && action) candidates.push({
      title: action,
      category: /fondasi|skill inti|foundation|core skill/i.test(active.phase) ? 'STUDY' : 'CAREER',
      skill: active.skillName, stepId: active.id, track: 'dream',
      reason: active.completedActions?.length
        ? (id ? 'Jalur Impian · Melanjutkan langkah Peta Impian yang sudah selesai.' : 'Dream track · Builds on your completed Dream Roadmap steps.')
        : (id ? 'Jalur Impian · Langkah berikutnya menuju impian utamamu.' : 'Dream track · Next small step toward your main dream.'),
    });
    if (work?.nextAction && work.projectStatus !== 'done') candidates.push({
      title: work.nextAction, category: 'CAREER', skill: projectSkill, track: 'career',
      reason: id ? 'Jalur Karier · Dari tindak lanjut di profil kerja.' : 'Career track · From your saved work follow-up.',
    });
    if (work?.project && work.projectStatus === 'planning' && !work.nextAction) candidates.push({
      title: id ? `Tentukan hasil pertama yang bisa ditunjukkan dari ${work.project}.` : `Define the first demonstrable outcome for ${work.project}.`,
      category: 'CAREER', skill: projectSkill, track: 'career',
      reason: id ? 'Jalur Karier · Proyek ini masih dalam tahap perencanaan.' : 'Career track · This project is still in planning.',
    });
    const practice = Object.values(player.skillProgress).filter((skill) => !skill.unlocked && skill.sessions > 0)
      .sort((a, b) => Number(b.name === active?.skillName) - Number(a.name === active?.skillName) || b.sessions - a.sessions || b.totalMinutes - a.totalMinutes)[0];
    if (practice) candidates.push({
      title: id ? `Latih ${practice.name} dan catat satu hal yang membaik` : `Practice ${practice.name} and note one improvement`,
      category: 'STUDY', skill: practice.name, track: 'study',
      reason: id ? `Kamu sudah mencatat ${practice.sessions} sesi skill ini.` : `You have logged ${practice.sessions} sessions of this skill.`,
    });
    if (!candidates.some((c) => c.track === 'career') && player.profession) candidates.push({
      title: getCareerActions(player, lang)[0], category: 'CAREER', skill: projectSkill, track: 'career',
      reason: id ? 'Jalur Karier · Saran berdasarkan peran kerjamu.' : 'Career track · Based on your work profile.',
    });
  }

  const known = new Set([...evidence.completed, ...player.quests.map((quest) => quest.title)].map((title) => title.trim().slice(0, 140).toLowerCase()));
  const hasCareerInList = player.quests.some((q) => !q.completed && q.category === 'CAREER' && !q.dreamStepId);
  const hasDreamInList = player.quests.some((q) => !q.completed && Boolean(q.dreamStepId));

  const suggestions: DailyTaskSuggestion[] = [];
  const defaultMin = light || phase === 'evening' ? 10 : 15;

  // Guarantee dual-track visibility: pick 1 Dream + 1 Career if missing, up to 3 suggestions total
  const ordered = [...candidates].sort((a, b) => {
    const score = (c: Omit<DailyTaskSuggestion, 'minutes'>) => {
      if (c.track === 'dream' && !hasDreamInList) return 0;
      if (c.track === 'career' && !hasCareerInList) return 1;
      return 2;
    };
    return score(a) - score(b);
  });

  for (const candidate of ordered) {
    if (suggestions.length >= 3) break;
    const title = candidate.title.trim().slice(0, 140);
    const key = title.toLowerCase();
    if (!title || known.has(key)) continue;
    suggestions.push({ ...candidate, title, minutes: defaultMin });
    known.add(key);
  }
  const planned = active && pending.find((task) => task.dreamStepId === active.id);
  const pendingNote = planned && !light && phase !== 'evening'
    ? (id ? `🎯 Jalur Impian aktif di daftar · ${planned.title}` : `🎯 Dream track on your list · ${planned.title}`)
    : '';
  return { note, pendingNote, suggestions };
}

export function workoutPlan(player: PlayerProfile, evidence: DailyEvidence, entries: JournalEntry[], lang: Language) {
  const id = lang === 'id';
  const gym = player.gym;
  if (!gym) return null;
  const sessions = entries.filter((entry): entry is LoggedActivity => entry.kind === 'activity' && entry.category === 'FITNESS' && !!entry.workout);
  const latest = sessions[0];
  const recent = latest && Date.now() - latest.updatedAt <= 48 * 3600000;
  const stop = gym.currentPain || Boolean(recent && latest.workout?.pain);
  const easy = evidence.status === 'rest' || evidence.busyDay || evidence.shortSleep || evidence.meal === 'skipped' ||
    Boolean(recent && latest.workout?.fatigue && latest.workout.fatigue !== 'manageable') || !!gym.limitations.trim();
  const weekly = Math.min(player.age < 18 ? 2 : 5, gym.days);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const activeDays = new Set(entries.filter((entry) => entry.kind === 'activity' && entry.category === 'FITNESS' &&
    entry.minutes > 0 && Date.parse(entry.dateKey + 'T00:00:00') >= weekStart.getTime()).map((entry) => entry.dateKey)).size;
  const readinessText = stop
    ? (id ? 'Ada catatan nyeri. Tunda gerakan yang memicu nyeri. Jika nyeri menetap atau bertambah, konsultasikan dengan tenaga kesehatan.' : 'Pain was logged. Pause movements that cause it. Consult a health professional if pain persists or worsens.')
    : easy
      ? (id ? 'Catatan aktivitas atau kondisi hari ini menyarankan sesi yang lebih ringan. Pilih latihan yang terasa nyaman.' : 'Your activity or check-in suggests a lighter session. Choose exercise that feels comfortable.')
      : (id ? 'Mulai dengan pemanasan ringan. Akhiri set sebelum teknik gerakan memburuk.' : 'Start with a light warm-up. End each set while you can maintain good form.');
  const sets = gym.level === 'regular' && gym.goal === 'strength' && !easy && player.age >= 18 ? 3 : easy ? 1 : 2;
  const reps = easy ? 6 : 8;
  const exercises: Array<{ title: string; minutes?: number; sets?: number; reps?: number }> = [];
  if (stop) return { weekly, activeDays, readinessText, exercises };
  if (easy || gym.goal === 'endurance') {
    exercises.push({ title: id ? 'Jalan santai sesuai kenyamanan' : 'Comfortable walk', minutes: easy ? 10 : 20 });
  } else {
    exercises.push(
      { title: gym.equipment === 'gym' ? 'Leg press' : (id ? 'Duduk-berdiri dari kursi' : 'Chair sit-to-stand'), sets, reps },
      { title: gym.equipment === 'gym' ? 'Chest press' : 'Wall push-up', sets, reps },
      { title: gym.equipment === 'gym' ? 'Seated cable row' : (id ? 'Tarik siku ke belakang tanpa beban' : 'Unloaded elbow pull-back'), sets, reps },
    );
  }
  return { weekly, activeDays, readinessText, exercises };
}

export function newWorkoutQuest(item: { title: string; minutes?: number; sets?: number; reps?: number }): Quest {
  const workout = item.sets && item.reps ? { sets: item.sets, reps: item.reps } : undefined;
  return {
    id: 'gym-' + crypto.randomUUID(), title: item.title, category: 'FITNESS', unitType: workout ? 'REPS' : 'MINUTES',
    defaultQty: workout ? workout.sets * workout.reps : item.minutes || 10,
    skillTag: workout ? 'Latihan kekuatan' : 'Stamina', exp: 20, gold: 1, completed: false,
    ...(workout ? { workout } : {}),
  };
}
