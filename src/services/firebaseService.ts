import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  AdminAISecretConfig,
  AIUsageLogRecord,
  DailyLogEntry,
  FirebaseRuntimeConfig,
  Language,
  PlayerProfile,
  SharedAIPublicConfig,
  UserAccountRecord,
} from '../types';
import { normalizePlayerProfile, PLAYER_SCHEMA_VERSION } from '../engine/science';
import { loadRuntimeFirebaseConfig } from './storageService';

export const BOOTSTRAP_ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || 'stefenlaksana.sl@gmail.com'
)
  .trim()
  .toLowerCase();

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

export async function getCurrentUserIdToken(): Promise<string | null> {
  if (!firebaseAuth?.currentUser) return null;
  try {
    return await firebaseAuth.currentUser.getIdToken();
  } catch {
    return null;
  }
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
  sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!firebaseAuth) throw new Error('Firebase Auth belum dikonfigurasi.');
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

export async function sendCurrentUserVerificationEmail(): Promise<void> {
  if (!firebaseAuth?.currentUser) throw new Error('Belum login.');
  await sendEmailVerification(firebaseAuth.currentUser);
}

export async function signOutUser(): Promise<void> {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
}

// =========================================================================
// ADMIN ROLE DETECTION & MANAGEMENT
// =========================================================================
export async function checkIsUserAdmin(user: User | null): Promise<{
  isAdmin: boolean;
  isUnverifiedBootstrapAdmin: boolean;
}> {
  if (!user) return { isAdmin: false, isUnverifiedBootstrapAdmin: false };
  const emailLower = (user.email || '').trim().toLowerCase();
  const isBootstrapEmail = Boolean(emailLower && emailLower === BOOTSTRAP_ADMIN_EMAIL);

  if (isBootstrapEmail && user.emailVerified) {
    return { isAdmin: true, isUnverifiedBootstrapAdmin: false };
  }

  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'admins', user.uid));
      if (snap.exists()) {
        return { isAdmin: true, isUnverifiedBootstrapAdmin: false };
      }
    } catch {
      // ignore permission/offline errors
    }
  }

  return {
    isAdmin: false,
    isUnverifiedBootstrapAdmin: isBootstrapEmail && !user.emailVerified,
  };
}

export async function upsertUserMeta(
  user: User,
  lang: Language,
  isAdmin = false
): Promise<void> {
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
      role: isAdmin ? 'admin' : 'user',
      status: 'active',
      aiRequestsToday: 0,
      aiTotalRequests: 0,
      aiQuotaDate: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const data = existing.data() || {};
    await updateDoc(userRef, {
      displayName: safeName,
      email: safeEmail,
      language: lang,
      role: data.role || (isAdmin ? 'admin' : 'user'),
      status: data.status || 'active',
      aiRequestsToday: typeof data.aiRequestsToday === 'number' ? data.aiRequestsToday : 0,
      aiTotalRequests: typeof data.aiTotalRequests === 'number' ? data.aiTotalRequests : 0,
      aiQuotaDate: typeof data.aiQuotaDate === 'string' ? data.aiQuotaDate : '',
      updatedAt: serverTimestamp(),
    });
  }
}

// =========================================================================
// SHARED AI PUBLIC CONFIG & ADMIN SECRETS
// =========================================================================
export async function fetchSharedAIPublicConfig(): Promise<SharedAIPublicConfig | null> {
  if (!firestoreDb) return null;
  const snap = await getDoc(doc(firestoreDb, 'appConfig', 'aiPublic'));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    enabled: Boolean(d.enabled),
    providerName: String(d.providerName || 'Agnes AI'),
    model: String(d.model || 'agnes-2.5-flash'),
    dailyLimit: Number(d.dailyLimit ?? 20),
    proxyConfigured: Boolean(d.proxyConfigured),
    maintenanceNotice: String(d.maintenanceNotice || ''),
    updatedBy: String(d.updatedBy || ''),
  };
}

export function subscribeSharedAIPublicConfig(
  callback: (cfg: SharedAIPublicConfig | null) => void
): Unsubscribe {
  if (!firestoreDb) return () => {};
  return onSnapshot(
    doc(firestoreDb, 'appConfig', 'aiPublic'),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const d = snap.data();
      callback({
        enabled: Boolean(d.enabled),
        providerName: String(d.providerName || 'Agnes AI'),
        model: String(d.model || 'agnes-2.5-flash'),
        dailyLimit: Number(d.dailyLimit ?? 20),
        proxyConfigured: Boolean(d.proxyConfigured),
        maintenanceNotice: String(d.maintenanceNotice || ''),
        updatedBy: String(d.updatedBy || ''),
      });
    },
    () => callback(null)
  );
}

export async function fetchAdminAISecret(): Promise<AdminAISecretConfig | null> {
  if (!firestoreDb) return null;
  const snap = await getDoc(doc(firestoreDb, 'adminSecrets', 'aiProvider'));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    baseUrl: String(d.baseUrl || 'https://apihub.agnes-ai.com/v1'),
    model: String(d.model || 'agnes-2.5-flash'),
    apiKey: String(d.apiKey || ''),
    enabled: Boolean(d.enabled),
    dailyLimit: Number(d.dailyLimit ?? 20),
    updatedBy: String(d.updatedBy || ''),
  };
}

export async function saveAdminSharedAIConfig(
  adminUser: User,
  payload: {
    baseUrl: string;
    model: string;
    apiKey: string;
    enabled: boolean;
    dailyLimit: number;
    maintenanceNotice: string;
  }
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const updatedBy = (adminUser.email || adminUser.uid).slice(0, 128);
  const cleanLimit = Math.max(0, Math.min(500, Math.round(payload.dailyLimit)));

  await setDoc(doc(firestoreDb, 'adminSecrets', 'aiProvider'), {
    baseUrl: payload.baseUrl.trim().slice(0, 300),
    model: payload.model.trim().slice(0, 80),
    apiKey: payload.apiKey.trim().slice(0, 500),
    enabled: Boolean(payload.enabled),
    dailyLimit: cleanLimit,
    updatedAt: serverTimestamp(),
    updatedBy,
  });

  await setDoc(doc(firestoreDb, 'appConfig', 'aiPublic'), {
    enabled: Boolean(payload.enabled),
    providerName: 'Agnes AI',
    model: payload.model.trim().slice(0, 80),
    dailyLimit: cleanLimit,
    proxyConfigured: Boolean(payload.apiKey.trim()),
    maintenanceNotice: payload.maintenanceNotice.trim().slice(0, 300),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function fetchAllUsersForAdmin(): Promise<UserAccountRecord[]> {
  if (!firestoreDb) return [];
  const q = query(collection(firestoreDb, 'users'), orderBy('updatedAt', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ownerUid: String(data.ownerUid || d.id),
      displayName: String(data.displayName || 'Hunter'),
      email: String(data.email || ''),
      language: data.language === 'en' ? 'en' : 'id',
      role: data.role === 'admin' ? 'admin' : 'user',
      status: data.status === 'suspended' ? 'suspended' : 'active',
      aiRequestsToday: Number(data.aiRequestsToday || 0),
      aiTotalRequests: Number(data.aiTotalRequests || 0),
      aiQuotaDate: String(data.aiQuotaDate || ''),
    };
  });
}

export async function updateUserStatusByAdmin(
  uid: string,
  status: 'active' | 'suspended'
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  await updateDoc(doc(firestoreDb, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function resetUserDailyQuota(uid: string): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  await updateDoc(doc(firestoreDb, 'users', uid), {
    aiRequestsToday: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function grantOrRevokeAdmin(
  actingAdmin: User,
  target: UserAccountRecord,
  makeAdmin: boolean
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const adminRef = doc(firestoreDb, 'admins', target.ownerUid);
  const userRef = doc(firestoreDb, 'users', target.ownerUid);

  if (makeAdmin) {
    await setDoc(adminRef, {
      uid: target.ownerUid,
      email: target.email || target.displayName,
      grantedBy: (actingAdmin.email || actingAdmin.uid).slice(0, 128),
      createdAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(adminRef);
  }

  await updateDoc(userRef, {
    role: makeAdmin ? 'admin' : 'user',
    updatedAt: serverTimestamp(),
  });
}

export async function fetchAdminUsageLogs(maxCount = 40): Promise<AIUsageLogRecord[]> {
  if (!firestoreDb) return [];
  const q = query(
    collection(firestoreDb, 'aiUsageLogs'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : '';
    return {
      id: d.id,
      uid: String(data.uid || ''),
      email: String(data.email || ''),
      feature: String(data.feature || 'chat'),
      model: String(data.model || ''),
      status:
        data.status === 'error' || data.status === 'quota_exceeded' ? data.status : 'ok',
      latencyMs: Number(data.latencyMs || 0),
      createdAt: ts,
    };
  });
}

// =========================================================================
// USER PROFILE & DAILY LOGS SYNC
// =========================================================================
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
