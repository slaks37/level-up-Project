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
      ? (id ? 'Tutup hari dengan mencatat hasil dan satu langkah untuk besok.' : 'Close the day by recording what you finished and one step for tomorrow.')
      : light
        ? (id ? 'Sisakan jeda dan pilih satu pekerjaan yang bisa selesai dalam waktu singkat.' : 'Leave room for a break and pick one short task.')
        : active
          ? (id ? `Lanjutkan tahap aktifmu · ${active.title}` : `Continue your active milestone · ${active.title}`)
          : goalsDone
            ? (id ? 'Tahapmu sudah selesai. Tinjau hasil sebelum memilih target berikutnya.' : 'Your milestones are complete. Review your results before picking the next goal.')
            : (id ? 'Pilih satu hasil yang ingin kamu capai hari ini.' : 'Choose one outcome to achieve today.');

  const candidates: Array<Omit<DailyTaskSuggestion, 'minutes'>> = [];
  const projectSkill = id ? 'Manajemen proyek' : 'Project management';
  if (meeting) candidates.push({
    title: (id ? 'Siapkan bahan dan keputusan untuk ' : 'Prepare notes and decisions for ') + meeting.title,
    category: 'CAREER', skill: projectSkill,
    reason: id ? 'Ada acara berikutnya di agenda hari ini.' : 'This is the next event on your calendar today.',
  });
  if (evidence.status !== 'rest' && phase !== 'evening') {
    const work = player.career;
    if (work?.project && work.projectStatus === 'blocked') candidates.push({
      title: id ? `Catat satu hambatan di ${work.project} dan siapa yang bisa membantu.` : `Identify one blocker on ${work.project} and who can help.`,
      category: 'CAREER', skill: projectSkill,
      reason: id ? 'Proyek ini kamu tandai terhambat.' : 'You marked this project as blocked.',
    });
    const action = active && getNextRoadmapAction(active, lang);
    if (active && action) candidates.push({
      title: action, category: 'CAREER', skill: active.skillName, stepId: active.id,
      reason: active.completedActions?.length
        ? (id ? 'Melanjutkan langkah yang sudah kamu selesaikan.' : 'Builds on the steps you have finished.')
        : (id ? 'Langkah berikutnya pada tahap aktifmu.' : 'The next action for your active milestone.'),
    });
    if (work?.nextAction && work.projectStatus !== 'done') candidates.push({
      title: work.nextAction, category: 'CAREER', skill: projectSkill,
      reason: id ? 'Berasal dari tindak lanjut yang kamu catat di profil kerja.' : 'From the follow-up you saved in your work profile.',
    });
    if (work?.project && work.projectStatus === 'planning' && !work.nextAction) candidates.push({
      title: id ? `Tentukan hasil pertama yang bisa ditunjukkan dari ${work.project}.` : `Define the first demonstrable outcome for ${work.project}.`,
      category: 'CAREER', skill: projectSkill,
      reason: id ? 'Proyek ini masih dalam tahap perencanaan.' : 'This project is still in planning.',
    });
    const practice = Object.values(player.skillProgress).filter((skill) => !skill.unlocked && skill.sessions > 0)
      .sort((a, b) => Number(b.name === active?.skillName) - Number(a.name === active?.skillName) || b.sessions - a.sessions || b.totalMinutes - a.totalMinutes)[0];
    if (practice) candidates.push({
      title: id ? `Latih ${practice.name} dan catat satu hal yang membaik` : `Practice ${practice.name} and note one improvement`,
      category: 'STUDY', skill: practice.name,
      reason: id ? `Kamu sudah mencatat ${practice.sessions} sesi skill ini.` : `You have logged ${practice.sessions} sessions of this skill.`,
    });
    if (candidates.length <= 1 && !evidence.work && player.profession) candidates.push({
      title: getCareerActions(player, lang)[0], category: 'CAREER', skill: projectSkill,
      reason: id ? 'Saran berdasarkan profil kerja dan aktivitas hari ini.' : 'Based on your work profile and today’s activity.',
    });
  }

  const known = new Set([...evidence.completed, ...player.quests.map((quest) => quest.title)].map((title) => title.trim().slice(0, 140).toLowerCase()));
  const available = {
    CAREER: player.dailyBreakdown.work - Math.max(evidence.work, player.dailyDurationLog.work),
    STUDY: player.dailyBreakdown.study - Math.max(evidence.study, player.dailyDurationLog.study),
  };
  for (const task of pending) {
    if (task.category === 'CAREER' || task.category === 'STUDY') {
      available[task.category] -= task.unitType === 'MINUTES' ? task.defaultQty : task.estMinutes ?? 0;
    }
  }
  let remaining = Math.max(0, player.dailyBreakdown.total - Math.max(evidence.minutesTotal,
    player.dailyDurationLog.work + player.dailyDurationLog.study + player.dailyDurationLog.fitness));
  remaining = Math.min(remaining, phase === 'evening' ? 10 : light ? 15 : 35);
  const suggestions: DailyTaskSuggestion[] = [];
  for (const candidate of candidates) {
    const title = candidate.title.trim().slice(0, 140);
    const key = title.toLowerCase();
    const minutes = Math.min(light || phase === 'evening' ? 10 : 15, available[candidate.category], remaining);
    if (!title || known.has(key) || minutes < 5) continue;
    suggestions.push({ ...candidate, title, minutes });
    known.add(key);
    available[candidate.category] -= minutes;
    remaining -= minutes;
  }
  const planned = active && pending.find((task) => task.dreamStepId === active.id);
  const pendingNote = planned && !light && phase !== 'evening'
    ? (id ? `Sudah ada di daftar · ${planned.title}` : `Already on your list · ${planned.title}`)
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
