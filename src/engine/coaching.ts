import type { CareerProfile, DreamStep, GymProfile, Language, PlayerProfile, Quest } from '../types';
import type { DailyEvidence, JournalEntry, LoggedActivity } from './journal';

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

export function workoutPlan(player: PlayerProfile, evidence: DailyEvidence, entries: JournalEntry[], lang: Language) {
  const id = lang === 'id';
  const gym = player.gym;
  if (!gym) return null;
  const sessions = entries.filter((entry): entry is LoggedActivity => entry.kind === 'activity' && entry.category === 'FITNESS' && !!entry.workout);
  const latest = sessions[0];
  const recent = latest && Date.now() - latest.updatedAt <= 48 * 3600000;
  const stop = gym.currentPain || Boolean(recent && latest.workout?.pain);
  const easy = evidence.status === 'rest' || evidence.shortSleep || evidence.meal === 'skipped' ||
    Boolean(recent && latest.workout?.fatigue && latest.workout.fatigue !== 'manageable') || !!gym.limitations.trim();
  const weekly = Math.min(player.age < 18 ? 2 : 5, gym.days);
  const readinessText = stop
    ? (id ? 'Ada catatan nyeri. Tunda gerakan yang memicu nyeri. Jika nyeri menetap atau bertambah, konsultasikan dengan tenaga kesehatan.' : 'Pain was logged. Pause movements that cause it. Consult a health professional if pain persists or worsens.')
    : easy
      ? (id ? 'Catatan tidur, makan, atau sesi terakhir menunjukkan kamu perlu menurunkan intensitas. Pilih sesi ringan bila nyaman.' : 'Your sleep, meals, or last session suggest easing up. Choose a light session if comfortable.')
      : (id ? 'Mulai dengan pemanasan ringan. Akhiri set sebelum teknik gerakan memburuk.' : 'Start with a light warm-up. End each set while you can maintain good form.');
  const sets = gym.level === 'regular' && gym.goal === 'strength' && !easy && player.age >= 18 ? 3 : easy ? 1 : 2;
  const reps = easy ? 6 : 8;
  const exercises: Array<{ title: string; minutes?: number; sets?: number; reps?: number }> = [];
  if (stop) return { weekly, readinessText, exercises };
  if (easy || gym.goal === 'endurance') {
    exercises.push({ title: id ? 'Jalan santai sesuai kenyamanan' : 'Comfortable walk', minutes: easy ? 10 : 20 });
  } else {
    exercises.push(
      { title: gym.equipment === 'gym' ? 'Leg press' : (id ? 'Duduk-berdiri dari kursi' : 'Chair sit-to-stand'), sets, reps },
      { title: gym.equipment === 'gym' ? 'Chest press' : 'Wall push-up', sets, reps },
      { title: gym.equipment === 'gym' ? 'Seated cable row' : (id ? 'Tarik siku ke belakang tanpa beban' : 'Unloaded elbow pull-back'), sets, reps },
    );
  }
  return { weekly, readinessText, exercises };
}

export function newWorkoutQuest(item: { title: string; minutes?: number; sets?: number; reps?: number }): Quest {
  const workout = item.sets && item.reps ? { sets: item.sets, reps: item.reps } : undefined;
  return {
    id: 'gym-' + crypto.randomUUID(), title: item.title, category: 'FITNESS', unitType: workout ? 'REPS' : 'MINUTES',
    defaultQty: workout ? workout.sets * workout.reps : item.minutes || 10,
    skillTag: workout ? 'Latihan kekuatan' : 'Stamina', exp: 35, gold: 25, completed: false,
    ...(workout ? { workout } : {}),
  };
}
