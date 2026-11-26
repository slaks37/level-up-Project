export type Language = 'id' | 'en';
export type Gender = 'male' | 'female';
export type SleepCondition = 'poor' | 'moderate' | 'optimal';
export type NutritionCondition = 'deficit' | 'balanced' | 'high_protein';
export type QuestCategory = 'STUDY' | 'CAREER' | 'FITNESS';
export type QuestFilter = 'ALL' | QuestCategory;
export type QuestUnitType = 'MINUTES' | 'REPS';
export type ProfessionCategory = 'AGRI' | 'BIZ' | 'TECH' | 'EDU';
export type MobileTab = 'status' | 'tasks' | 'dream' | 'skills' | 'perks';

export interface Biometrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  proteinTarget: number;
}

export interface DailyBreakdown {
  total: number;
  study: number;
  work: number;
  fitness: number;
}

export interface DailyDurationLog {
  study: number;
  work: number;
  fitness: number;
}

export interface PlayerStats {
  str: number;
  vit: number;
  int: number;
  agi: number;
  cha: number;
}

export interface CareerStage {
  rank: string;
  title: string;
  minLvl: number;
}

export interface Quest {
  id: string;
  title: string;
  category: QuestCategory;
  unitType: QuestUnitType;
  defaultQty: number;
  estMinutes?: number;
  skillTag: string;
  dreamStepId?: string | null;
  exp: number;
  gold: number;
  completed: boolean;
  completedQty?: number;
  completedRpe?: number;
}

export interface DreamStep {
  id: string;
  phase: string;
  title: string;
  coachTip: string;
  targetLevel: number;
  studyMinutes: number;
  workMinutes: number;
  targetMinutes: number;
  completedMinutes: number;
  skillName: string;
  completed: boolean;
}

export interface PermanentSkill {
  name: string;
  rank: string;
  sessions: number;
  totalMinutes: number;
}

export interface SkillProgressEntry {
  name: string;
  sessions: number;
  totalMinutes: number;
  unlocked: boolean;
}

export interface SelfReward {
  id: string;
  name: string;
  cost: number;
  desc: string;
}

export interface DiscoveredPerk {
  id: string;
  type: string;
  title: string;
  desc: string;
  cost: number;
  actionTip: string;
  sourceUrl?: string;
}

export interface GrowthNewsItem {
  id: string;
  tag: string;
  title: string;
  summary: string;
  actionTask: string;
  sourceUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BossMeta {
  name: string;
  desc: string;
  hp: number;
  maxHp: number;
}

export interface PlayerProfile {
  schemaVersion: number;
  name: string;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  city: string;
  rewardInterest: string;
  bio: Biometrics;
  profession: string;
  classTitle: string;
  goal: string;
  targetLevel: number;
  dailyBreakdown: DailyBreakdown;
  dailyDurationLog: DailyDurationLog;
  coachAdvice: string;
  level: number;
  exp: number;
  maxExp: number;
  gold: number;
  streak: number;
  coreCharge: number;
  sleepCondition: SleepCondition;
  nutritionCondition: NutritionCondition;
  stats: PlayerStats;
  stages: CareerStage[];
  quests: Quest[];
  shadows: PermanentSkill[];
  skillProgress: Record<string, SkillProgressEntry>;
  dreamSteps: DreamStep[];
  rewards: SelfReward[];
  discoveredPerks: DiscoveredPerk[];
  growthNews: GrowthNewsItem[];
  groundingSources: GroundingSource[];
  boss: BossMeta;
}

export interface DailyLogEntry {
  dateKey: string;
  completedTasks: number;
  totalTasks: number;
  studyMinutes: number;
  workMinutes: number;
  fitnessMinutes: number;
  expEarned: number;
  goldEarned: number;
  streakAfter: number;
  sleepCondition: SleepCondition;
  nutritionCondition: NutritionCondition;
}

export interface ProfessionPreset {
  id: string;
  name: string;
  cat: ProfessionCategory;
  classTitle: string;
  tags: string;
  stages: CareerStage[];
  defaultShadows: PermanentSkill[];
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  useDevProxy: boolean;
  preferSharedProxy?: boolean;
  proxyBaseUrl?: string;
}

export interface SharedAIPublicConfig {
  enabled: boolean;
  providerName: string;
  model: string;
  dailyLimit: number;
  proxyConfigured: boolean;
  maintenanceNotice: string;
  updatedBy?: string;
}

export interface AdminAISecretConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  dailyLimit: number;
  updatedBy?: string;
}

export interface UserAccountRecord {
  ownerUid: string;
  displayName: string;
  email: string;
  language: Language;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  aiRequestsToday: number;
  aiTotalRequests: number;
  aiQuotaDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIUsageLogRecord {
  id: string;
  uid: string;
  email: string;
  feature: string;
  model: string;
  status: 'ok' | 'error' | 'quota_exceeded';
  latencyMs: number;
  createdAt: string;
}

export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
