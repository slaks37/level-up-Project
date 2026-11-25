import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DailyLogEntry,
  FirebaseRuntimeConfig,
  Language,
  PlayerProfile,
} from '../types';
import { normalizePlayerProfile, PLAYER_SCHEMA_VERSION } from '../engine/science';
import { loadRuntimeFirebaseConfig } from './storageService';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let activeConfigKey = '';

function makeConfigKey(cfg: FirebaseRuntimeConfig): string {
  return `${cfg.projectId}:${cfg.appId}:${cfg.apiKey}`;
}

export function isFirebaseReady(): boolean {
  return Boolean(firebaseApp && firebaseAuth && firestoreDb);
}

export function getActiveFirebaseProjectId(): string | null {
  return firebaseApp?.options?.projectId ?? null;
}

export async function initFirebaseFromConfig(
  cfg?: FirebaseRuntimeConfig | null
): Promise<boolean> {
  const target = cfg ?? loadRuntimeFirebaseConfig();
  if (!target) return false;

  const key = makeConfigKey(target);
  if (firebaseApp && activeConfigKey === key && firebaseAuth && firestoreDb) {
    return true;
  }

  try {
    if (getApps().length > 0) {
      await Promise.all(getApps().map((app) => deleteApp(app)));
    }

    firebaseApp = initializeApp(target);
    firebaseAuth = getAuth(firebaseApp);

    try {
      firestoreDb = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      firestoreDb = getFirestore(firebaseApp);
    }

    activeConfigKey = key;

    // Resolve any pending mobile redirect sign-in silently
    getRedirectResult(firebaseAuth).catch(() => {});

    return true;
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err);
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    activeConfigKey = '';
    return false;
  }
}

export function subscribeAuth(callback: (user: User | null) => void): Unsubscribe {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!firebaseAuth) throw new Error('Firebase Auth belum dikonfigurasi.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }
    throw err;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!firebaseAuth) throw new Error('Firebase Auth belum dikonfigurasi.');
  const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return cred.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  if (!firebaseAuth) throw new Error('Firebase Auth belum dikonfigurasi.');
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
}

export async function upsertUserMeta(user: User, lang: Language): Promise<void> {
  if (!firestoreDb) return;
  const userRef = doc(firestoreDb, 'users', user.uid);
  const existing = await getDoc(userRef);

  const safeName = (user.displayName || user.email?.split('@')[0] || 'Hunter').slice(0, 120);
  const safeEmail = (user.email || '').slice(0, 254);

  if (!existing.exists()) {
    await setDoc(userRef, {
      ownerUid: user.uid,
      displayName: safeName,
      email: safeEmail,
      language: lang,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      displayName: safeName,
      email: safeEmail,
      language: lang,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Strips any unexpected fields (and guarantees no API keys ever enter Firestore)
 * to comply strictly with `firestore.rules` `hasOnly(...)` validation.
 */
function sanitizeProfileForFirestore(uid: string, player: PlayerProfile) {
  return {
    ownerUid: uid,
    schemaVersion: PLAYER_SCHEMA_VERSION,
    updatedAt: serverTimestamp(),
    name: player.name.slice(0, 100),
    gender: player.gender === 'female' ? 'female' : 'male',
    age: Math.max(10, Math.min(120, Number(player.age) || 24)),
    height: Math.max(100, Math.min(250, Number(player.height) || 170)),
    weight: Math.max(25, Math.min(300, Number(player.weight) || 65)),
    city: (player.city || '').slice(0, 100),
    rewardInterest: (player.rewardInterest || '').slice(0, 300),
    bio: {
      bmi: Number(player.bio.bmi) || 22,
      bmiCategory: String(player.bio.bmiCategory || 'Ideal').slice(0, 40),
      bmr: Number(player.bio.bmr) || 1600,
      proteinTarget: Number(player.bio.proteinTarget) || 100,
    },
    profession: (player.profession || 'Entrepreneur').slice(0, 160),
    classTitle: (player.classTitle || 'Awakened Vanguard').slice(0, 120),
    goal: (player.goal || '').slice(0, 300),
    targetLevel: Math.max(1, Math.min(999, Math.round(player.targetLevel || 15))),
    dailyBreakdown: {
      total: Math.max(0, Math.round(player.dailyBreakdown.total || 150)),
      study: Math.max(0, Math.round(player.dailyBreakdown.study || 45)),
      work: Math.max(0, Math.round(player.dailyBreakdown.work || 70)),
      fitness: Math.max(0, Math.round(player.dailyBreakdown.fitness || 35)),
    },
    dailyDurationLog: {
      study: Math.max(0, Math.round(player.dailyDurationLog.study || 0)),
      work: Math.max(0, Math.round(player.dailyDurationLog.work || 0)),
      fitness: Math.max(0, Math.round(player.dailyDurationLog.fitness || 0)),
    },
    coachAdvice: (player.coachAdvice || '').slice(0, 1000),
    level: Math.max(1, Math.min(999, Math.round(player.level || 1))),
    exp: Math.max(0, Math.min(10000000, Math.round(player.exp || 0))),
    maxExp: Math.max(100, Math.min(10000000, Math.round(player.maxExp || 100))),
    gold: Math.max(0, Math.min(10000000, Math.round(player.gold || 0))),
    streak: Math.max(0, Math.min(100000, Math.round(player.streak || 0))),
    coreCharge: Math.max(0, Math.min(4, Math.round(player.coreCharge || 0))),
    sleepCondition: player.sleepCondition || 'moderate',
    nutritionCondition: player.nutritionCondition || 'balanced',
    stats: {
      str: Math.max(0, Number(player.stats.str) || 10),
      vit: Math.max(0, Number(player.stats.vit) || 10),
      int: Math.max(0, Number(player.stats.int) || 10),
      agi: Math.max(0, Number(player.stats.agi) || 10),
      cha: Math.max(0, Number(player.stats.cha) || 10),
    },
    stages: (player.stages || []).slice(0, 20),
    quests: (player.quests || []).slice(0, 100),
    shadows: (player.shadows || []).slice(0, 200),
    skillProgress: player.skillProgress || {},
    dreamSteps: (player.dreamSteps || []).slice(0, 50),
    rewards: (player.rewards || []).slice(0, 50),
    discoveredPerks: (player.discoveredPerks || []).slice(0, 30),
    growthNews: (player.growthNews || []).slice(0, 30),
    groundingSources: (player.groundingSources || []).slice(0, 30),
    boss: {
      name: (player.boss?.name || player.goal || '').slice(0, 300),
      desc: (player.boss?.desc || player.goal || '').slice(0, 500),
      hp: Math.max(0, Math.round(player.boss?.hp ?? 1000)),
      maxHp: Math.max(1, Math.round(player.boss?.maxHp ?? 1000)),
    },
  };
}

export async function saveProfileToCloud(uid: string, player: PlayerProfile): Promise<void> {
  if (!firestoreDb) return;
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  await setDoc(profileRef, sanitizeProfileForFirestore(uid, player));
}

export async function deleteProfileFromCloud(uid: string): Promise<void> {
  if (!firestoreDb) return;
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  await deleteDoc(profileRef);
}

export function subscribeProfileFromCloud(
  uid: string,
  lang: Language,
  onProfile: (profile: PlayerProfile | null, fromCache: boolean) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!firestoreDb) return () => {};
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  return onSnapshot(
    profileRef,
    (snap) => {
      if (!snap.exists()) {
        onProfile(null, snap.metadata.fromCache);
        return;
      }
      const data = snap.data() as Partial<PlayerProfile>;
      onProfile(normalizePlayerProfile(data, lang), snap.metadata.fromCache);
    },
    (err) => {
      onError(err);
    }
  );
}

export async function saveDailyLogToCloud(uid: string, entry: DailyLogEntry): Promise<void> {
  if (!firestoreDb) return;
  const logRef = doc(firestoreDb, 'users', uid, 'dailyLogs', entry.dateKey);
  await setDoc(logRef, {
    ownerUid: uid,
    dateKey: entry.dateKey,
    completedTasks: Math.max(0, Math.min(100, Math.round(entry.completedTasks))),
    totalTasks: Math.max(0, Math.min(100, Math.round(entry.totalTasks))),
    studyMinutes: Math.max(0, Math.min(1440, Math.round(entry.studyMinutes))),
    workMinutes: Math.max(0, Math.min(1440, Math.round(entry.workMinutes))),
    fitnessMinutes: Math.max(0, Math.min(1440, Math.round(entry.fitnessMinutes))),
    expEarned: Math.max(0, Math.min(100000, Math.round(entry.expEarned))),
    goldEarned: Math.max(0, Math.min(100000, Math.round(entry.goldEarned))),
    streakAfter: Math.max(0, Math.min(100000, Math.round(entry.streakAfter))),
    sleepCondition: entry.sleepCondition,
    nutritionCondition: entry.nutritionCondition,
    createdAt: serverTimestamp(),
  });
}

export async function fetchRecentDailyLogs(uid: string, maxCount = 14): Promise<DailyLogEntry[]> {
  if (!firestoreDb) return [];
  const logsCol = collection(firestoreDb, 'users', uid, 'dailyLogs');
  const q = query(logsCol, orderBy('dateKey', 'desc'), limit(maxCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      dateKey: String(data.dateKey || d.id),
      completedTasks: Number(data.completedTasks) || 0,
      totalTasks: Number(data.totalTasks) || 0,
      studyMinutes: Number(data.studyMinutes) || 0,
      workMinutes: Number(data.workMinutes) || 0,
      fitnessMinutes: Number(data.fitnessMinutes) || 0,
      expEarned: Number(data.expEarned) || 0,
      goldEarned: Number(data.goldEarned) || 0,
      streakAfter: Number(data.streakAfter) || 1,
      sleepCondition: data.sleepCondition || 'moderate',
      nutritionCondition: data.nutritionCondition || 'balanced',
    };
  });
}
