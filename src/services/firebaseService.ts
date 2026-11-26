import { assignableAdminRoles, type AdminRole, type AssignableAdminRole } from '../engine/access';
import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
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
  getDocFromServer,
  writeBatch,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
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
import type { JournalEntry } from '../engine/journal';
import { requestGoogleToken } from './googleCalendar';

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

export async function reloadCurrentUser(): Promise<User | null> {
  if (!firebaseAuth?.currentUser) return null;
  await firebaseAuth.currentUser.reload();
  await firebaseAuth.currentUser.getIdToken(true);
  return firebaseAuth.currentUser;
}

export async function signOutUser(): Promise<void> {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
}

// =========================================================================
// ADMIN ROLE DETECTION & MANAGEMENT
// =========================================================================
function grantRole(value: unknown): AssignableAdminRole | null {
  const role = value ?? 'admin';
  return assignableAdminRoles.find((item) => item === role) ?? null;
}

export async function checkIsUserAdmin(user: User | null) {
  const email = user?.email?.trim().toLowerCase() || '';
  const isUnverifiedBootstrapAdmin = Boolean(email && email === BOOTSTRAP_ADMIN_EMAIL && !user?.emailVerified);
  if (!user?.emailVerified || !email) return { role: null, isAdmin: false, isUnverifiedBootstrapAdmin };
  if (email === BOOTSTRAP_ADMIN_EMAIL) return { role: 'owner' as const, isAdmin: true, isUnverifiedBootstrapAdmin: false };
  if (!firestoreDb) return { role: null, isAdmin: false, isUnverifiedBootstrapAdmin: false };
  const [grant, invitation] = await Promise.all([
    getDocFromServer(doc(firestoreDb, 'admins', user.uid)).catch(() => null),
    getDocFromServer(doc(firestoreDb, 'adminEmails', email)).catch(() => null),
  ]);
  const role = invitation?.exists() ? grantRole(invitation.data().role) :
    grant?.exists() && String(grant.data().email).toLowerCase() === email ? 'admin' as const : null;
  return { role, isAdmin: Boolean(role), isUnverifiedBootstrapAdmin: false };
}

export function watchAdminAccess(user: User, onChange: (role: AdminRole | null) => void): Unsubscribe {
  const email = user.email?.trim().toLowerCase();
  if (!firestoreDb || !user.emailVerified || !email || email === BOOTSTRAP_ADMIN_EMAIL) return () => {};
  const db = firestoreDb;
  let currentEmail: { role: AdminRole | null } | null | undefined;
  let legacy: AdminRole | null | undefined;
  const notify = () => {
    if (currentEmail !== undefined && legacy !== undefined) onChange(currentEmail ? currentEmail.role : legacy);
  };
  const stops = [
    onSnapshot(doc(db, 'adminEmails', email), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      currentEmail = snapshot.exists() ? { role: grantRole(snapshot.data().role) } : null;
      notify();
    }, () => {}),
    onSnapshot(doc(db, 'admins', user.uid), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      legacy = snapshot.exists() && String(snapshot.data().email).toLowerCase() === email ? 'admin' : null;
      notify();
    }, () => {}),
  ];
  return () => stops.forEach((stop) => stop());
}

export async function requireAdminSession(user: User): Promise<User> {
  const access = await checkIsUserAdmin(user);
  if (!access.isAdmin && !access.isUnverifiedBootstrapAdmin) {
    if (firebaseAuth?.currentUser?.uid === user.uid) await signOut(firebaseAuth);
    throw new Error('ADMIN_ACCESS_REQUIRED');
  }
  return user;
}

export async function signInExistingAdminWithGoogle(): Promise<User> {
  if (!firebaseAuth || !firebaseApp) throw new Error('Firebase belum siap.');
  const auth = firebaseAuth;
  const apiKey = firebaseApp.options.apiKey;
  const projectId = firebaseApp.options.projectId;
  const accessToken = await requestGoogleToken('openid email profile');
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + encodeURIComponent(apiKey || ''), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoCreate: false, returnSecureToken: true, requestUri: location.origin,
      postBody: new URLSearchParams({ access_token: accessToken, providerId: 'google.com' }).toString() }),
  });
  const result = await response.json();
  if (!response.ok || result.isNewUser || !result.emailVerified || !result.localId || !result.idToken) throw new Error('ADMIN_ACCESS_REQUIRED');
  const email = String(result.email || '').trim().toLowerCase();
  if (!email) throw new Error('ADMIN_ACCESS_REQUIRED');
  if (email !== BOOTSTRAP_ADMIN_EMAIL) {
    const documents = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/';
    const headers = { Authorization: 'Bearer ' + result.idToken };
    const [invitation, grant] = await Promise.all([
      fetch(documents + 'adminEmails/' + encodeURIComponent(email), { headers }),
      fetch(documents + 'admins/' + encodeURIComponent(result.localId), { headers }),
    ]);
    const legacy = grant.ok ? await grant.json() : null;
    if (!invitation.ok && legacy?.fields?.email?.stringValue?.toLowerCase() !== email) throw new Error('ADMIN_ACCESS_REQUIRED');
  }
  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(null, accessToken));
  return requireAdminSession(credential.user);
}

export interface AdminRoleGrant {
  email: string;
  role: AssignableAdminRole;
}

export async function fetchAdminRoleGrants(): Promise<AdminRoleGrant[]> {
  if (!firestoreDb) return [];
  const [assigned, legacy] = await Promise.all([
    getDocs(collection(firestoreDb, 'adminEmails')),
    getDocs(collection(firestoreDb, 'admins')),
  ]);
  const roles = new Map<string, AssignableAdminRole>();
  for (const entry of legacy.docs) {
    const email = String(entry.data().email || '').trim().toLowerCase();
    if (email) roles.set(email, 'admin');
  }
  for (const entry of assigned.docs) {
    const role = grantRole(entry.data().role);
    if (role) roles.set(entry.id, role);
  }
  roles.delete(BOOTSTRAP_ADMIN_EMAIL);
  return [...roles].sort(([left], [right]) => left.localeCompare(right)).map(([email, role]) => ({ email, role }));
}

export async function setAdminRoleGrant(actor: User, address: string, role: AssignableAdminRole | null): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const db = firestoreDb;
  const email = address.trim().toLowerCase();
  if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email) || email.length > 254) throw new Error('Email tidak valid.');
  if (email === BOOTSTRAP_ADMIN_EMAIL || email === actor.email?.trim().toLowerCase()) {
    throw new Error('Peran Super Admin dan akun sendiri tidak dapat diubah di sini.');
  }
  const ref = doc(db, 'adminEmails', email);
  if (role) {
    await runTransaction(db, async (transaction) => {
      if ((await transaction.get(ref)).exists()) {
        transaction.update(ref, { role, updatedBy: actor.uid, updatedAt: serverTimestamp() });
      } else {
        transaction.set(ref, { email, role, grantedBy: actor.uid, createdAt: serverTimestamp() });
      }
    });
  } else {
    const legacy = await getDocs(collection(db, 'admins'));
    const batch = writeBatch(db);
    batch.delete(ref);
    legacy.docs.filter((entry) => String(entry.data().email).trim().toLowerCase() === email)
      .forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
}

export async function upsertUserMeta(
  user: User,
  lang: Language,
  adminRole: AdminRole | null = null
): Promise<void> {
  if (!firestoreDb) return;
  const userRef = doc(firestoreDb, 'users', user.uid);
  const accountRole = adminRole === 'owner' ? 'admin' : adminRole || 'user';
  const existing = await getDoc(userRef);

  const safeName = (user.displayName || user.email?.split('@')[0] || 'Hunter').slice(0, 120);
  const safeEmail = (user.email || '').slice(0, 254);

  if (!existing.exists()) {
    await setDoc(userRef, {
      ownerUid: user.uid,
      displayName: safeName,
      email: safeEmail,
      language: lang,
      role: accountRole,
      status: 'active',
      aiRequestsToday: 0,
      aiTotalRequests: 0,
      aiQuotaDate: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      displayName: safeName,
      email: safeEmail,
      language: lang,
      role: accountRole,
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
  const database = firestoreDb;
  const url = new URL(payload.baseUrl.trim());
  if (url.origin !== 'https://apihub.agnes-ai.com' || url.username || url.password || url.hash || url.search) {
    throw new Error('Gunakan URL HTTPS resmi Agnes AI.');
  }
  const updatedBy = (adminUser.email || adminUser.uid).slice(0, 128);
  const cleanLimit = Math.max(0, Math.min(500, Math.round(payload.dailyLimit)));
  const secretRef = doc(database, 'adminSecrets', 'aiProvider');
  const savedKey = payload.apiKey.trim() || (await getDocFromServer(secretRef)).data()?.apiKey || '';
  const batch = writeBatch(database);
  batch.set(secretRef, {
    baseUrl: url.toString().slice(0, 300),
    model: payload.model.trim().slice(0, 80),
    apiKey: savedKey.slice(0, 500),
    enabled: Boolean(payload.enabled),
    dailyLimit: cleanLimit,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
  batch.set(doc(database, 'appConfig', 'aiPublic'), {
    enabled: Boolean(payload.enabled),
    providerName: 'Agnes AI',
    model: payload.model.trim().slice(0, 80),
    dailyLimit: cleanLimit,
    proxyConfigured: Boolean(savedKey),
    maintenanceNotice: payload.maintenanceNotice.trim().slice(0, 300),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
  await batch.commit();
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
      role: grantRole(data.role ?? 'user') ?? 'user',
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
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

function sanitizeProfileForFirestore(uid: string, player: PlayerProfile) {
  return {
    ownerUid: uid,
    schemaVersion: PLAYER_SCHEMA_VERSION,
    updatedAt: serverTimestamp(),
    name: (player.name || 'Hunter').slice(0, 100),
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
    ...(player.career ? { career: stripUndefined(player.career) } : {}),
    ...(player.gym ? { gym: stripUndefined(player.gym) } : {}),
    profession: (player.profession || 'Entrepreneur').slice(0, 160),
    classTitle: (player.classTitle || 'Awakened Vanguard').slice(0, 120),
    goal: (player.goal || 'Level Up').slice(0, 300),
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
    stages: stripUndefined((player.stages || []).slice(0, 20)),
    quests: stripUndefined((player.quests || []).slice(0, 100)),
    shadows: stripUndefined((player.shadows || []).slice(0, 200)),
    skillProgress: stripUndefined(player.skillProgress || {}),
    dreamSteps: stripUndefined((player.dreamSteps || []).slice(0, 50)),
    rewards: stripUndefined((player.rewards || []).slice(0, 50)),
    discoveredPerks: stripUndefined((player.discoveredPerks || []).slice(0, 30)),
    growthNews: stripUndefined((player.growthNews || []).slice(0, 30)),
    groundingSources: stripUndefined((player.groundingSources || []).slice(0, 30)),
    boss: {
      name: (player.boss?.name || player.goal || '').slice(0, 300),
      desc: (player.boss?.desc || player.goal || '').slice(0, 500),
      hp: Math.max(0, Math.round(player.boss?.hp ?? 1000)),
      maxHp: Math.max(1, Math.round(player.boss?.maxHp ?? 1000)),
    },
  };
}

export async function saveProfileToCloud(uid: string, player: PlayerProfile): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore unavailable');
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  await setDoc(profileRef, sanitizeProfileForFirestore(uid, player));
}

export async function initializeCloudProfile(uid: string, player: PlayerProfile,
  history?: { logs: DailyLogEntry[]; journal: JournalEntry[] }): Promise<boolean> {
  if (!firestoreDb) throw new Error('Firestore unavailable');
  const db = firestoreDb;
  return runTransaction(db, async (transaction) => {
    const owner = doc(db, 'users', uid);
    const profile = doc(owner, 'profile', 'main');
    if ((await transaction.get(profile)).exists()) return false;
    const logs = (history?.logs || []).filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey)).slice(0, 60);
    const journal = (history?.journal || []).filter((entry) => typeof entry.id === 'string' && entry.id && !entry.id.includes('/')).slice(0, 360);
    const pending = [
      ...logs.map((entry) => ({ ref: doc(owner, 'dailyLogs', entry.dateKey), data: dailyLogDocument(uid, entry) })),
      ...journal.map(({ id, ...data }) => ({ ref: doc(owner, 'journal', id), data: stripUndefined(data) })),
    ];
    const prior = await Promise.all(pending.map(({ ref }) => transaction.get(ref)));
    transaction.set(profile, sanitizeProfileForFirestore(uid, player));
    pending.forEach(({ ref, data }, index) => {
      if (!prior[index].exists()) transaction.set(ref, data);
    });
    return true;
  });
}

export async function deleteProfileFromCloud(uid: string): Promise<void> {
  if (!firestoreDb) return;
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  await deleteDoc(profileRef);
}

export function subscribeProfileFromCloud(
  uid: string,
  lang: Language,
  onProfile: (profile: PlayerProfile | null, metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!firestoreDb) return () => {};
  const profileRef = doc(firestoreDb, 'users', uid, 'profile', 'main');
  return onSnapshot(
    profileRef,
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) {
        onProfile(null, snap.metadata);
        return;
      }
      const data = snap.data() as Partial<PlayerProfile>;
      onProfile(normalizePlayerProfile(data, lang), snap.metadata);
    },
    (err) => {
      onError(err);
    }
  );
}

export async function saveDailyLogToCloud(uid: string, entry: DailyLogEntry): Promise<void> {
  if (!firestoreDb) return;
  const logRef = doc(firestoreDb, 'users', uid, 'dailyLogs', entry.dateKey);
  await setDoc(logRef, dailyLogDocument(uid, entry));
}

function dailyLogDocument(uid: string, entry: DailyLogEntry) {
  return {
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
  };
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

export function subscribeJournal(
  uid: string,
  onEntries: (entries: JournalEntry[], fromCache: boolean) => void,
  onError: () => void,
): Unsubscribe {
  if (!firestoreDb) return () => {};
  const entries = query(collection(firestoreDb, 'users', uid, 'journal'), orderBy('dateKey', 'desc'), limit(360));
  return onSnapshot(entries, { includeMetadataChanges: true }, (snapshot) => {
    onEntries(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }) as JournalEntry), snapshot.metadata.fromCache);
  }, onError);
}

export async function saveJournalEntry(uid: string, entry: JournalEntry): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore unavailable');
  const { id, ...data } = entry;
  await setDoc(doc(firestoreDb, 'users', uid, 'journal', id), data);
}
