import { getActiveDreamStep, getCurrentDreamSteps, getNextRoadmapAction } from './coaching';
import type { DailyLogEntry, GrowthNewsItem, Language, PlayerProfile, QuestCategory, WorkoutFeedback } from '../types';

export type DayPhase = 'morning' | 'day' | 'evening';
export type MealPattern = '' | 'skipped' | 'partial' | 'varied';
export type EnergyFeeling = '' | 'fresh' | 'steady' | 'tired';
export interface CheckInInput {
  sleepHours: number | null;
  meal: MealPattern;
  mealNote: string;
  mealEnjoyment?: 'enjoyed' | 'neutral' | 'did_not_enjoy' | '';
  mealGroups?: string[];
  energy: EnergyFeeling;
  note: string;
  extraMinutes: number;
}
interface JournalRecord {
  id: string;
  dateKey: string;
  updatedAt: number;
}
export interface CheckIn extends JournalRecord, CheckInInput {
  kind: 'checkin';
  phase: DayPhase;
}
export interface LoggedActivity extends JournalRecord {
  kind: 'activity';
  title: string;
  minutes: number;
  category: QuestCategory;
  workout?: WorkoutFeedback;
}
export type JournalEntry = CheckIn | LoggedActivity;

export function getJournalMoment(now = new Date()) {
  const hour = now.getHours();
  const dateKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const phase: DayPhase = hour < 11 ? 'morning' : hour < 17 ? 'day' : 'evening';
  return { dateKey, phase };
}

export function mergeJournal(previous: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  const entries = new Map(previous.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    if ((entries.get(entry.id)?.updatedAt ?? -1) <= entry.updatedAt) entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.updatedAt - a.updatedAt).slice(0, 360);
}

export function getDailyEvidence(entries: JournalEntry[], logs: DailyLogEntry[], dateKey: string, age: number) {
  const today = entries.filter((entry) => entry.dateKey === dateKey);
  const checks = today.filter((entry): entry is CheckIn => entry.kind === 'checkin');
  const tasks = today.filter((entry): entry is LoggedActivity => entry.kind === 'activity');
  const latest = [...checks].sort((a, b) => b.updatedAt - a.updatedAt);
  const sleep = latest.find((entry) => entry.sleepHours !== null)?.sleepHours ?? null;
  const meal = latest.find((entry) => entry.meal)?.meal ?? '';
  const loggedMeal = latest.find((entry) => entry.mealNote || entry.mealGroups?.length || entry.mealEnjoyment);
  const mealNote = loggedMeal?.mealNote || '';
  const mealGroups = loggedMeal?.mealGroups || [];
  const mealEnjoyment = loggedMeal?.mealEnjoyment || '';
  const energy = latest.find((entry) => entry.energy)?.energy ?? '';
  const closed = logs.find((entry) => entry.dateKey === dateKey);
  const minutes = (category: QuestCategory, legacy = 0) => Math.max(legacy,
    tasks.filter((task) => task.category === category).reduce((sum, task) => sum + task.minutes, 0));
  const work = minutes('CAREER', closed?.workMinutes);
  const study = minutes('STUDY', closed?.studyMinutes);
  const fitness = minutes('FITNESS', closed?.fitnessMinutes);
  const extra = checks.filter((entry) => entry.phase !== 'morning').reduce((sum, entry) => sum + entry.extraMinutes, 0);
  const manual = checks.filter((entry) => entry.phase !== 'morning').flatMap((entry) =>
    entry.note.split('\n').map((line) => line.trim()).filter(Boolean));
  const finished = tasks.filter((task) => !(task.workout?.pain && task.minutes === 0));
  const completed = [...new Set([...finished.map((task) => task.title), ...manual])];
  const pastSleep = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === 'checkin' && entry.dateKey < dateKey && entry.sleepHours !== null && !pastSleep.has(entry.dateKey)) {
      pastSleep.set(entry.dateKey, entry.sleepHours);
    }
  }
  const recentSleep = [...pastSleep.values()].slice(0, 3);
  const sleepMinimum = age < 13 ? 9 : age < 18 ? 8 : 7;
  const shortSleep = sleep !== null && sleep < sleepMinimum;
  const shortPattern = recentSleep.filter((hours) => hours < sleepMinimum).length >= 2;
  const minutesTotal = work + study + fitness + extra;
  const busyDay = minutesTotal >= 360;
  const needsBreak = energy === 'tired' || (shortSleep && (busyDay || shortPattern || meal === 'skipped')) ||
    (busyDay && meal === 'skipped');
  const status = needsBreak ? 'rest' : shortSleep || shortPattern || busyDay || meal === 'skipped' ? 'watch' :
    energy === 'fresh' || energy === 'steady' || (sleep !== null && meal === 'varied') ? 'steady' : 'unknown';
  return { sleep, meal, mealNote, mealGroups, mealEnjoyment, energy, work, study, fitness, extra, minutesTotal, completed, recentSleep, shortSleep, shortPattern, busyDay, status,
    completedCount: Math.max(finished.length, closed?.completedTasks ?? 0),
    plan: checks.find((entry) => entry.phase === 'morning')?.note ?? '' } as const;
}

export type DailyEvidence = ReturnType<typeof getDailyEvidence>;

export function journalEncouragement(evidence: DailyEvidence, phase: DayPhase, lang: Language): string {
  const id = lang === 'id';
  // Reflections draw on Matthew 11:28, Galatians 6:9 and Proverbs 16:9.
  if (evidence.status === 'rest') {
    return id ? 'Kamu boleh berhenti sejenak dan menyerahkan beban yang masih terasa berat kepada Tuhan. Beristirahat juga bagian dari merawat diri.' :
      'You can pause and entrust what still feels heavy to God. Rest is part of caring for yourself.';
  }
  if (evidence.completed.length || evidence.completedCount || evidence.minutesTotal) {
    return id ? 'Usahamu hari ini layak dihargai. Kebaikan yang dikerjakan tekun tetap berarti, bahkan saat hasilnya belum terlihat.' :
      'Your effort today is worth recognizing. Small acts of faithful work matter even before you see their results.';
  }
  return phase === 'morning'
    ? (id ? 'Pilih satu langkah yang bisa kamu mulai. Bawa rencanamu kepada Tuhan dan beri ruang bila arah hari ini berubah.' :
      'Choose one step you can start. Bring your plans to God and leave room for the day to take a different direction.')
    : (id ? 'Sisakan ruang untuk berterima kasih atas hal kecil hari ini. Kamu bisa memulai lagi dengan satu langkah yang sanggup kamu jalani.' :
      'Make space to give thanks for one small thing today. You can begin again with a step you can actually take.');
}

export function getGrowthActions(player: PlayerProfile, logs: DailyLogEntry[], entries: JournalEntry[], evidence: DailyEvidence, lang: Language): GrowthNewsItem[] {
  const id = lang === 'id';
  const currentSteps = getCurrentDreamSteps(player);
  const milestones = currentSteps.filter((step) => step.completed);
  const active = getActiveDreamStep(player);
  const skills = [...player.shadows].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const forming = Object.values(player.skillProgress).filter((skill) => !skill.unlocked)
    .sort((a, b) => b.totalMinutes - a.totalMinutes || b.sessions - a.sessions);
  const activeDates = new Set([
    ...logs.filter((entry) => entry.completedTasks || entry.studyMinutes || entry.workMinutes || entry.fitnessMinutes).map((entry) => entry.dateKey),
    ...entries.filter((entry) => entry.kind === 'activity' || (entry.phase !== 'morning' && entry.note.trim())).map((entry) => entry.dateKey),
  ]);
  const dayCount = activeDates.size;
  const latestActivity = entries.find((entry): entry is LoggedActivity => entry.kind === 'activity' && !(entry.workout?.pain && entry.minutes === 0));
  const recentPlan = evidence.plan.split('\n')[0].slice(0, 90).trim();
  const results: GrowthNewsItem[] = [];
  if (active) results.push({
    id: 'roadmap-' + active.id, tag: id ? 'Peta impian' : 'Roadmap', title: active.title,
    summary: id ? `${milestones.length}/${currentSteps.length} tahap selesai. Tahap ini melatih ${active.skillName || player.profession}: ${active.completedMinutes}/${active.targetMinutes} menit.` :
      `${milestones.length}/${currentSteps.length} milestones complete. This step builds ${active.skillName || player.profession}: ${active.completedMinutes}/${active.targetMinutes} min.`,
    actionTask: getNextRoadmapAction(active, lang) || (id ? `Tinjau hasil tahap ${active.title}` : `Review the outcome of ${active.title}`),
  });
  if (forming[0]) {
    const skill = forming[0];
    results.push({ id: 'practice-' + skill.name, tag: id ? 'Latihan skill' : 'Skill practice', title: skill.name,
      summary: id ? `Kamu sudah berlatih ${skill.sessions} sesi dan ${skill.totalMinutes} menit. Lanjutkan latihan yang sama agar hasilnya bisa dibandingkan.` :
        `You have logged ${skill.sessions} sessions and ${skill.totalMinutes} minutes. Repeat the practice so you can compare results.`,
      actionTask: id ? `Latih ${skill.name} dan catat satu hal yang membaik` : `Practice ${skill.name} and note one improvement` });
  }
  if (skills[0]) {
    const skill = skills[0];
    results.push({ id: 'portfolio-' + skill.name, tag: id ? 'Portofolio' : 'Portfolio', title: id ? `Buktikan skill ${skill.name}` : `Show your ${skill.name} skill`,
      summary: id ? `Skill ini sudah ada di koleksimu (${skill.sessions} sesi, ${skill.totalMinutes} menit tercatat). Pilih satu contoh yang mendukung tujuan ${player.goal}.` :
        `This skill is in your collection (${skill.sessions} sessions, ${skill.totalMinutes} minutes logged). Pick one example that supports ${player.goal}.`,
      actionTask: id ? `Buat satu contoh portofolio untuk ${skill.name}` : `Create one portfolio example for ${skill.name}` });
  }
  results.push({ id: 'review-activity', tag: id ? 'Refleksi progres' : 'Progress review',
    title: id ? 'Pilih langkah berikutnya' : 'Choose a next step',
    summary: id
      ? `Ada aktivitas di ${dayCount} hari dalam riwayat yang tersedia. ${recentPlan ? `Rencana pagimu: ${recentPlan}.` : latestActivity ? `Aktivitas terakhir: ${latestActivity.title}. Pilih hasil yang bisa kamu lanjutkan.` : 'Pilih satu hasil kecil yang paling mendekatkanmu ke tujuan.'}`
      : `Activity is recorded on ${dayCount} days in your available history. ${recentPlan ? `Your morning plan: ${recentPlan}.` : latestActivity ? `Latest activity: ${latestActivity.title}. Pick a result you can build on.` : 'Pick a small deliverable that moves you toward your goal.'}`,
    actionTask: id ? 'Tinjau aktivitas terakhir dan pilih satu prioritas' : 'Review recent activity and choose one priority' });
  return results;
}
