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
  CoinEconomyConfig,
  CoinPartnerSecretConfig,
  CoinTransactionRecord,
  CoinTransactionSource,
  CoinTransactionType,
  DailyLogEntry,
  FirebaseRuntimeConfig,
  Language,
  PlayerProfile,
  SharedAIPublicConfig,
  SyncedCalendarEventItem,
  SyncedCalendarRecord,
  UserAccountRecord,
  UserTelemetrySummary,
} from '../types';
import { DEFAULT_COIN_ECONOMY, normalizePlayerProfile, PLAYER_SCHEMA_VERSION } from '../engine/science';
import { loadRuntimeFirebaseConfig } from './storageService';
import type { JournalEntry } from '../engine/journal';
import { requestGoogleToken } from './googleCalendar';
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
  subscribeFeatureFlags,
  type FeatureFlagsConfig,
} from './featureFlags';
import { DEFAULT_USER_PRIVACY_SETTINGS, type UserPrivacySettings } from '../engine/v2/privacy';
import { normalizePrivacySettings } from './privacyStorage';
import type { EvidenceRecord } from '../engine/v2/evidence';
import type { VentureWorkspaceState } from '../engine/v2/businessStudio';

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

function parseCoinEconomy(data: Record<string, unknown> | undefined): CoinEconomyConfig {
  if (!data) return { ...DEFAULT_COIN_ECONOMY };
  const clampInt = (v: unknown, fallback: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  };
  const idrNum = Number(data.idrPerCoin);
  return {
    coinName: String(data.coinName || DEFAULT_COIN_ECONOMY.coinName).trim().slice(0, 60) || DEFAULT_COIN_ECONOMY.coinName,
    coinSymbol: String(data.coinSymbol || DEFAULT_COIN_ECONOMY.coinSymbol).trim().slice(0, 16) || DEFAULT_COIN_ECONOMY.coinSymbol,
    pointPerTask: clampInt(data.pointPerTask, DEFAULT_COIN_ECONOMY.pointPerTask, 0, 1000),
    pointPerWorkout: clampInt(data.pointPerWorkout, DEFAULT_COIN_ECONOMY.pointPerWorkout, 0, 1000),
    pointPerCheckIn: clampInt(data.pointPerCheckIn, DEFAULT_COIN_ECONOMY.pointPerCheckIn, 0, 1000),
    pointPerMilestone: clampInt(data.pointPerMilestone, DEFAULT_COIN_ECONOMY.pointPerMilestone, 0, 1000),
    pointPerOverdrive: clampInt(data.pointPerOverdrive, DEFAULT_COIN_ECONOMY.pointPerOverdrive, 0, 1000),
    pointPerDayClear: clampInt(data.pointPerDayClear, DEFAULT_COIN_ECONOMY.pointPerDayClear, 0, 1000),
    pointPerLevelUp: clampInt(data.pointPerLevelUp, DEFAULT_COIN_ECONOMY.pointPerLevelUp, 0, 1000),
    startingCoins: clampInt(data.startingCoins, DEFAULT_COIN_ECONOMY.startingCoins, 0, 10000),
    idrPerCoin: Number.isFinite(idrNum) ? Math.max(0, Math.min(1000000, idrNum)) : 0,
    partnerName: String(data.partnerName ?? DEFAULT_COIN_ECONOMY.partnerName).slice(0, 80),
    partnerEnabled: Boolean(data.partnerEnabled),
    partnerEndpoint: String(data.partnerEndpoint ?? '').slice(0, 300),
    minRedeemCoins: clampInt(data.minRedeemCoins, DEFAULT_COIN_ECONOMY.minRedeemCoins, 1, 100000),
    transactionNote: String(data.transactionNote ?? '').slice(0, 300),
    updatedBy: String(data.updatedBy || ''),
  };
}

export async function fetchCoinEconomyConfig(): Promise<CoinEconomyConfig> {
  if (!firestoreDb) return { ...DEFAULT_COIN_ECONOMY };
  const snap = await getDoc(doc(firestoreDb, 'appConfig', 'coinEconomy'));
  if (!snap.exists()) return { ...DEFAULT_COIN_ECONOMY };
  return parseCoinEconomy(snap.data());
}

export function subscribeCoinEconomyConfig(
  callback: (cfg: CoinEconomyConfig) => void
): Unsubscribe {
  if (!firestoreDb) return () => {};
  return onSnapshot(
    doc(firestoreDb, 'appConfig', 'coinEconomy'),
    (snap) => {
      callback(snap.exists() ? parseCoinEconomy(snap.data()) : { ...DEFAULT_COIN_ECONOMY });
    },
    () => callback({ ...DEFAULT_COIN_ECONOMY })
  );
}

export async function saveCoinEconomyConfig(
  adminUser: User,
  payload: Omit<CoinEconomyConfig, 'updatedBy'>
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const endpoint = payload.partnerEndpoint.trim();
  if (endpoint && !/^https?:\/\/.+/.test(endpoint)) {
    throw new Error('URL endpoint partner harus diawali http:// atau https://');
  }
  const updatedBy = (adminUser.email || adminUser.uid).slice(0, 128);
  const clean = parseCoinEconomy({ ...payload, partnerEndpoint: endpoint, updatedBy });
  await setDoc(doc(firestoreDb, 'appConfig', 'coinEconomy'), {
    coinName: clean.coinName,
    coinSymbol: clean.coinSymbol,
    pointPerTask: clean.pointPerTask,
    pointPerWorkout: clean.pointPerWorkout,
    pointPerCheckIn: clean.pointPerCheckIn,
    pointPerMilestone: clean.pointPerMilestone,
    pointPerOverdrive: clean.pointPerOverdrive,
    pointPerDayClear: clean.pointPerDayClear,
    pointPerLevelUp: clean.pointPerLevelUp,
    startingCoins: clean.startingCoins,
    idrPerCoin: clean.idrPerCoin,
    partnerName: clean.partnerName,
    partnerEnabled: clean.partnerEnabled,
    partnerEndpoint: clean.partnerEndpoint,
    minRedeemCoins: clean.minRedeemCoins,
    transactionNote: clean.transactionNote,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function fetchCoinPartnerSecret(): Promise<CoinPartnerSecretConfig | null> {
  if (!firestoreDb) return null;
  const snap = await getDoc(doc(firestoreDb, 'adminSecrets', 'coinPartner'));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    partnerName: String(d.partnerName || 'MyValue'),
    merchantId: String(d.merchantId || ''),
    apiEndpoint: String(d.apiEndpoint || ''),
    apiKey: String(d.apiKey || ''),
    webhookSecret: String(d.webhookSecret || ''),
    updatedBy: String(d.updatedBy || ''),
  };
}

export async function saveCoinPartnerSecret(
  adminUser: User,
  payload: Omit<CoinPartnerSecretConfig, 'updatedBy'>
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const endpoint = payload.apiEndpoint.trim();
  if (endpoint && !/^https?:\/\/.+/.test(endpoint)) {
    throw new Error('URL endpoint partner harus diawali http:// atau https://');
  }
  const updatedBy = (adminUser.email || adminUser.uid).slice(0, 128);
  await setDoc(doc(firestoreDb, 'adminSecrets', 'coinPartner'), {
    partnerName: payload.partnerName.trim().slice(0, 80),
    merchantId: payload.merchantId.trim().slice(0, 120),
    apiEndpoint: endpoint.slice(0, 300),
    apiKey: payload.apiKey.trim().slice(0, 500),
    webhookSecret: payload.webhookSecret.trim().slice(0, 500),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

function parseUserTelemetry(raw: unknown): UserTelemetrySummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  return {
    name: String(d.name || ''),
    profession: String(d.profession || ''),
    goal: String(d.goal || ''),
    level: Math.max(1, Number(d.level) || 1),
    gold: Math.max(0, Number(d.gold) || 0),
    streak: Math.max(0, Number(d.streak) || 0),
    taskStreak: Math.max(0, Number(d.taskStreak) || 0),
    workoutStreak: Math.max(0, Number(d.workoutStreak) || 0),
    completedTasksTotal: Math.max(0, Number(d.completedTasksTotal) || 0),
    completedWorkoutsTotal: Math.max(0, Number(d.completedWorkoutsTotal) || 0),
    lastMood: String(d.lastMood || ''),
    lastEnergy: String(d.lastEnergy || ''),
    lastSleepHours: typeof d.lastSleepHours === 'number' && Number.isFinite(d.lastSleepHours) ? d.lastSleepHours : null,
    hasPainAlert: Boolean(d.hasPainAlert),
    projectBlocked: Boolean(d.projectBlocked),
    lastActiveDate: String(d.lastActiveDate || ''),
    updatedAt: Number(d.updatedAt) || 0,
  };
}

function sanitizeTelemetryForFirestore(t: UserTelemetrySummary) {
  return {
    name: (t.name || '').slice(0, 100),
    profession: (t.profession || '').slice(0, 160),
    goal: (t.goal || '').slice(0, 300),
    level: Math.max(1, Math.min(999, Math.round(t.level || 1))),
    gold: Math.max(0, Math.min(10000000, Math.round(t.gold || 0))),
    streak: Math.max(0, Math.min(100000, Math.round(t.streak || 0))),
    taskStreak: Math.max(0, Math.min(100000, Math.round(t.taskStreak || 0))),
    workoutStreak: Math.max(0, Math.min(100000, Math.round(t.workoutStreak || 0))),
    completedTasksTotal: Math.max(0, Math.min(1000000, Math.round(t.completedTasksTotal || 0))),
    completedWorkoutsTotal: Math.max(0, Math.min(1000000, Math.round(t.completedWorkoutsTotal || 0))),
    lastMood: (t.lastMood || '').slice(0, 30),
    lastEnergy: (t.lastEnergy || '').slice(0, 30),
    lastSleepHours:
      typeof t.lastSleepHours === 'number' && Number.isFinite(t.lastSleepHours)
        ? Math.max(0, Math.min(24, t.lastSleepHours))
        : null,
    hasPainAlert: Boolean(t.hasPainAlert),
    projectBlocked: Boolean(t.projectBlocked),
    lastActiveDate: (t.lastActiveDate || '').slice(0, 10),
    updatedAt: Math.max(0, Math.round(t.updatedAt || Date.now())),
  };
}

export async function syncUserTelemetrySummary(
  uid: string,
  summary: UserTelemetrySummary
): Promise<void> {
  if (!firestoreDb) return;
  const userRef = doc(firestoreDb, 'users', uid);
  await updateDoc(userRef, {
    telemetry: sanitizeTelemetryForFirestore(summary),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchAllUsersForAdmin(): Promise<UserAccountRecord[]> {
  if (!firestoreDb) return [];
  const q = query(collection(firestoreDb, 'users'), orderBy('updatedAt', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined;
    const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined;
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
      telemetry: parseUserTelemetry(data.telemetry),
      createdAt: created,
      updatedAt: updated,
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
  const hasV4Fields =
    player.schemaVersion === 4 ||
    Boolean(player.pathwayId) ||
    Boolean(player.awakeningV2Completed) ||
    Boolean(player.purposeStatement);

  return {
    ownerUid: uid,
    schemaVersion: hasV4Fields ? 4 : PLAYER_SCHEMA_VERSION,
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
    taskStreak: Math.max(0, Math.min(100000, Math.round(player.taskStreak || 0))),
    workoutStreak: Math.max(0, Math.min(100000, Math.round(player.workoutStreak || 0))),
    longestStreak: Math.max(0, Math.min(100000, Math.round(player.longestStreak || player.streak || 0))),
    longestTaskStreak: Math.max(0, Math.min(100000, Math.round(player.longestTaskStreak || player.taskStreak || 0))),
    longestWorkoutStreak: Math.max(0, Math.min(100000, Math.round(player.longestWorkoutStreak || player.workoutStreak || 0))),
    lastActiveStreakDate: (player.lastActiveStreakDate || '').slice(0, 10),
    lastTaskStreakDate: (player.lastTaskStreakDate || '').slice(0, 10),
    lastWorkoutStreakDate: (player.lastWorkoutStreakDate || '').slice(0, 10),
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
    ...(player.pathwayId ? { pathwayId: player.pathwayId } : {}),
    ...(player.purposeStatement ? { purposeStatement: player.purposeStatement.trim().slice(0, 500) } : {}),
    ...(typeof player.awakeningV2Completed === 'boolean'
      ? { awakeningV2Completed: player.awakeningV2Completed }
      : {}),
    ...(player.availableResources?.length
      ? { availableResources: player.availableResources.slice(0, 20).map((r) => String(r).slice(0, 80)) }
      : {}),
    ...(player.preferredActiveDays?.length
      ? { preferredActiveDays: player.preferredActiveDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).slice(0, 7) }
      : {}),
    ...(player.skillSelfRatings && Object.keys(player.skillSelfRatings).length > 0
      ? { skillSelfRatings: stripUndefined(player.skillSelfRatings) }
      : {}),
    ...(typeof player.competencyLevel === 'number' ? { competencyLevel: Math.max(1, Math.min(10, Math.round(player.competencyLevel))) } : {}),
    ...(typeof player.competencyPoints === 'number' ? { competencyPoints: Math.max(0, Math.round(player.competencyPoints)) } : {}),
    ...(typeof player.businessLevel === 'number' ? { businessLevel: Math.max(0, Math.min(10, Math.round(player.businessLevel))) } : {}),
    ...(player.businessStage ? { businessStage: player.businessStage } : {}),
    ...(player.activeVentureId !== undefined ? { activeVentureId: player.activeVentureId } : {}),
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

// =========================================================================
// COIN TRANSACTIONS, CALENDAR RECORDS & ADMIN DEEP PARTICIPANT INSPECTOR
// =========================================================================
export async function recordCoinTransaction(
  uid: string,
  payload: {
    type: CoinTransactionType;
    source: CoinTransactionSource;
    amount: number;
    balanceAfter: number;
    note: string;
    partnerRef?: string;
    actorUid: string;
    actorEmail: string;
  }
): Promise<void> {
  if (!firestoreDb) return;
  const amount = Math.round(payload.amount);
  if (amount === 0) return;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(firestoreDb, 'users', uid, 'coinTransactions', id), {
    ownerUid: uid,
    type: payload.type,
    source: payload.source,
    amount: Math.max(-1000000, Math.min(1000000, amount)),
    balanceAfter: Math.max(0, Math.min(10000000, Math.round(payload.balanceAfter))),
    note: payload.note.trim().slice(0, 240),
    partnerRef: (payload.partnerRef || '').trim().slice(0, 120),
    actorUid: payload.actorUid.slice(0, 128),
    actorEmail: payload.actorEmail.slice(0, 254),
    createdAt: Date.now(),
  });
}

export async function fetchCoinTransactions(
  uid: string,
  maxCount = 80
): Promise<CoinTransactionRecord[]> {
  if (!firestoreDb) return [];
  const q = query(
    collection(firestoreDb, 'users', uid, 'coinTransactions'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ownerUid: String(data.ownerUid || uid),
      type: (['earn', 'redeem', 'admin_adjust', 'partner_tx'].includes(String(data.type))
        ? data.type
        : 'earn') as CoinTransactionType,
      source: String(data.source || 'admin') as CoinTransactionSource,
      amount: Number(data.amount) || 0,
      balanceAfter: Math.max(0, Number(data.balanceAfter) || 0),
      note: String(data.note || ''),
      partnerRef: String(data.partnerRef || ''),
      actorUid: String(data.actorUid || ''),
      actorEmail: String(data.actorEmail || ''),
      createdAt: Number(data.createdAt) || 0,
    };
  });
}

export async function adjustParticipantCoinsByAdmin(
  adminUser: User,
  targetUid: string,
  options: {
    mode: 'add' | 'deduct' | 'set';
    value: number;
    txType: 'admin_adjust' | 'partner_tx';
    note: string;
    partnerRef?: string;
  }
): Promise<{ previousBalance: number; nextBalance: number; delta: number }> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const db = firestoreDb;
  const cleanVal = Math.max(0, Math.min(10000000, Math.round(options.value)));
  const profileRef = doc(db, 'users', targetUid, 'profile', 'main');
  const userRef = doc(db, 'users', targetUid);

  return runTransaction(db, async (tx) => {
    const [profSnap, userSnap] = await Promise.all([tx.get(profileRef), tx.get(userRef)]);
    if (!profSnap.exists()) {
      throw new Error('Peserta ini belum membuat profil permainan.');
    }
    const currentGold = Math.max(0, Math.round(Number(profSnap.data().gold) || 0));
    let nextBalance = currentGold;
    if (options.mode === 'add') nextBalance = Math.min(10000000, currentGold + cleanVal);
    else if (options.mode === 'deduct') nextBalance = Math.max(0, currentGold - cleanVal);
    else nextBalance = cleanVal;

    const delta = nextBalance - currentGold;
    if (delta === 0) {
      throw new Error('Saldo koin tidak berubah (selisih 0).');
    }

    tx.update(profileRef, {
      gold: nextBalance,
      updatedAt: serverTimestamp(),
    });

    if (userSnap.exists()) {
      const existingTelemetry = parseUserTelemetry(userSnap.data().telemetry);
      if (existingTelemetry) {
        tx.update(userRef, {
          telemetry: sanitizeTelemetryForFirestore({
            ...existingTelemetry,
            gold: nextBalance,
            updatedAt: Date.now(),
          }),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const txId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    tx.set(doc(db, 'users', targetUid, 'coinTransactions', txId), {
      ownerUid: targetUid,
      type: options.txType,
      source: options.txType === 'partner_tx' ? 'partner' : 'admin',
      amount: delta,
      balanceAfter: nextBalance,
      note: (options.note.trim() || 'Penyesuaian saldo koin oleh Admin').slice(0, 240),
      partnerRef: (options.partnerRef || '').trim().slice(0, 120),
      actorUid: adminUser.uid.slice(0, 128),
      actorEmail: (adminUser.email || '').slice(0, 254),
      createdAt: Date.now(),
    });

    return { previousBalance: currentGold, nextBalance, delta };
  });
}

export async function saveCalendarSummaryToCloud(
  uid: string,
  source: 'google_oauth' | 'ics' | 'none',
  events: SyncedCalendarEventItem[]
): Promise<void> {
  if (!firestoreDb) return;
  const trimmed = events.slice(0, 50).map((e) => ({
    id: String(e.id || '').slice(0, 120),
    title: String(e.title || '').slice(0, 120),
    start: String(e.start || '').slice(0, 40),
    end: String(e.end || '').slice(0, 40),
    allDay: Boolean(e.allDay),
  }));
  await setDoc(doc(firestoreDb, 'users', uid, 'calendar', 'latest'), {
    ownerUid: uid,
    source,
    syncedAt: Date.now(),
    eventCount: trimmed.length,
    events: trimmed,
  });
}

export async function fetchCalendarSummaryFromCloud(
  uid: string
): Promise<SyncedCalendarRecord | null> {
  if (!firestoreDb) return null;
  const snap = await getDoc(doc(firestoreDb, 'users', uid, 'calendar', 'latest'));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ownerUid: String(d.ownerUid || uid),
    source: d.source === 'google_oauth' || d.source === 'ics' ? d.source : 'none',
    syncedAt: Number(d.syncedAt) || 0,
    eventCount: Number(d.eventCount) || 0,
    events: Array.isArray(d.events) ? (d.events as SyncedCalendarEventItem[]) : [],
  };
}

export function subscribeAppFeatureFlags(
  callback: (flags: FeatureFlagsConfig) => void
): Unsubscribe {
  return subscribeFeatureFlags(firestoreDb, callback);
}

export async function fetchAppFeatureFlags(): Promise<FeatureFlagsConfig> {
  if (!firestoreDb) return { ...DEFAULT_FEATURE_FLAGS };
  try {
    const snap = await getDoc(doc(firestoreDb, 'appConfig', 'featureFlags'));
    if (!snap.exists()) return { ...DEFAULT_FEATURE_FLAGS };
    return normalizeFeatureFlags(snap.data() as Partial<FeatureFlagsConfig>);
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

export async function saveAppFeatureFlags(
  actor: User,
  rawFlags: FeatureFlagsConfig
): Promise<FeatureFlagsConfig> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  const safe = normalizeFeatureFlags(rawFlags);
  await setDoc(doc(firestoreDb, 'appConfig', 'featureFlags'), {
    awakeningV2: safe.awakeningV2,
    pathways: safe.pathways,
    academy: safe.academy,
    businessStudio: safe.businessStudio,
    agnesV2: safe.agnesV2,
    serverWallet: safe.serverWallet,
    myValueRedemption: safe.serverWallet && safe.myValueRedemption,
    ecosystemSync: safe.ecosystemSync,
    cohortAllowlist: safe.cohortAllowlist,
    updatedBy: (actor.email || actor.uid).slice(0, 128),
    updatedAt: serverTimestamp(),
  });
  return safe;
}

export function subscribeUserPrivacySettings(
  uid: string,
  callback: (settings: UserPrivacySettings) => void
): Unsubscribe {
  if (!firestoreDb) {
    callback({ ...DEFAULT_USER_PRIVACY_SETTINGS });
    return () => {};
  }
  return onSnapshot(
    doc(firestoreDb, 'users', uid, 'privacy', 'settings'),
    (snap) => {
      callback(
        snap.exists()
          ? normalizePrivacySettings(snap.data() as Partial<UserPrivacySettings>)
          : { ...DEFAULT_USER_PRIVACY_SETTINGS }
      );
    },
    () => {
      callback({ ...DEFAULT_USER_PRIVACY_SETTINGS });
    }
  );
}

export async function saveUserPrivacySettings(
  uid: string,
  raw: UserPrivacySettings
): Promise<UserPrivacySettings> {
  const safe = normalizePrivacySettings(raw);
  if (!firestoreDb) return safe;
  await setDoc(doc(firestoreDb, 'users', uid, 'privacy', 'settings'), {
    ownerUid: uid,
    shareCoachingProgressWithMentor: safe.shareCoachingProgressWithMentor,
    shareBusinessCanvasesWithMentor: safe.shareBusinessCanvasesWithMentor,
    shareWellnessWithCoach: safe.shareWellnessWithCoach,
    sharePrivateJournalWithAgnes: safe.sharePrivateJournalWithAgnes,
    shareHealthMetricsWithAgnes: safe.shareHealthMetricsWithAgnes,
    shareAggregatedImpactWithEcosystem: safe.shareAggregatedImpactWithEcosystem,
    updatedAt: serverTimestamp(),
  });
  return safe;
}

export async function saveEvidenceRecordToCloud(uid: string, record: EvidenceRecord): Promise<void> {
  if (!firestoreDb) return;
  await setDoc(doc(firestoreDb, 'users', uid, 'evidence', record.id), {
    ownerUid: uid,
    dimension: record.dimension,
    targetType: record.targetType,
    targetId: record.targetId.slice(0, 128),
    title: record.title.slice(0, 140),
    summary: record.summary.slice(0, 2000),
    evidenceKind: record.evidenceKind,
    ...(record.artifactUrl ? { artifactUrl: record.artifactUrl.slice(0, 500) } : {}),
    sourceTag: 'validated_evidence',
    reviewStatus: record.reviewStatus === 'submitted' ? 'submitted' : 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchUserEvidenceRecords(uid: string, maxCount = 80): Promise<EvidenceRecord[]> {
  if (!firestoreDb) return [];
  const q = query(collection(firestoreDb, 'users', uid, 'evidence'), limit(maxCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ownerUid: String(data.ownerUid || uid),
      dimension: (data.dimension || 'BUSINESS') as EvidenceRecord['dimension'],
      targetType: (data.targetType || 'dream_step') as EvidenceRecord['targetType'],
      targetId: String(data.targetId || ''),
      title: String(data.title || ''),
      summary: String(data.summary || ''),
      evidenceKind: (data.evidenceKind || 'reflection') as EvidenceRecord['evidenceKind'],
      ...(typeof data.artifactUrl === 'string' && data.artifactUrl ? { artifactUrl: data.artifactUrl } : {}),
      sourceTag: 'validated_evidence',
      reviewStatus: (data.reviewStatus || 'draft') as EvidenceRecord['reviewStatus'],
      ...(typeof data.reviewerFeedback === 'string' ? { reviewerFeedback: data.reviewerFeedback } : {}),
      ...(typeof data.rubricScore === 'number' ? { rubricScore: data.rubricScore } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
}

export async function saveVentureToCloud(
  uid: string,
  venture: VentureWorkspaceState,
  pathwayId = 'sociopreneur'
): Promise<void> {
  if (!firestoreDb) return;
  const ventureRef = doc(firestoreDb, 'users', uid, 'ventures', venture.id);
  const existing = await getDoc(ventureRef).catch(() => null);
  if (!existing || !existing.exists()) {
    await setDoc(ventureRef, {
      ownerUid: uid,
      name: venture.name.trim().slice(0, 140) || 'My Venture',
      sector: venture.sector.trim().slice(0, 120) || 'General',
      pathwayId,
      businessStage: 'idea',
      businessLevel: 0,
      marketplaceStatus: 'not_submitted',
      summary: venture.summary.trim().slice(0, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ventureRef, {
      name: venture.name.trim().slice(0, 140) || 'My Venture',
      sector: venture.sector.trim().slice(0, 120) || 'General',
      summary: venture.summary.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function publishAcademyCourseToCloud(
  actor: User,
  course: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    pathwayIds: string[];
    accessType: 'free' | 'paid_external' | 'cohort_only';
    status: 'draft' | 'published' | 'archived';
  }
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  await setDoc(doc(firestoreDb, 'courses', course.id), {
    slug: course.slug.trim().slice(0, 100),
    title: course.title.trim().slice(0, 160),
    summary: course.summary.trim().slice(0, 1000),
    pathwayIds: course.pathwayIds.slice(0, 6),
    accessType: course.accessType,
    status: course.status,
    updatedBy: (actor.email || actor.uid).slice(0, 128),
    updatedAt: serverTimestamp(),
  });
}

export interface SubmissionReviewItem {
  id: string;
  uid: string;
  courseId: string;
  lessonId: string;
  type: 'quiz' | 'assignment';
  status: 'submitted' | 'graded' | 'revision_requested';
  passed: boolean;
  score?: number;
  feedback?: string;
}

export async function fetchPendingSubmissionsForReview(maxCount = 50): Promise<SubmissionReviewItem[]> {
  if (!firestoreDb) return [];
  const snap = await getDocs(query(collection(firestoreDb, 'submissions'), limit(maxCount)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: String(data.uid || ''),
      courseId: String(data.courseId || ''),
      lessonId: String(data.lessonId || ''),
      type: data.type === 'quiz' ? 'quiz' : 'assignment',
      status: (data.status || 'submitted') as SubmissionReviewItem['status'],
      passed: Boolean(data.passed),
      ...(typeof data.score === 'number' ? { score: data.score } : {}),
      ...(typeof data.feedback === 'string' ? { feedback: data.feedback } : {}),
    };
  });
}

export async function gradeSubmissionByMentor(
  reviewer: User,
  submissionId: string,
  decision: { status: 'graded' | 'revision_requested'; passed: boolean; score: number; feedback: string }
): Promise<void> {
  if (!firestoreDb) throw new Error('Firestore belum siap.');
  await updateDoc(doc(firestoreDb, 'submissions', submissionId), {
    status: decision.status,
    passed: Boolean(decision.passed),
    score: Math.max(0, Math.min(100, Math.round(decision.score))),
    feedback: decision.feedback.trim().slice(0, 1000),
    gradedBy: reviewer.uid,
    gradedAt: serverTimestamp(),
  });
}

export interface ParticipantFullRecord {
  profile: PlayerProfile | null;
  journal: JournalEntry[];
  dailyLogs: DailyLogEntry[];
  coinTransactions: CoinTransactionRecord[];
  calendar: SyncedCalendarRecord | null;
  privacy: UserPrivacySettings;
  tier1Restricted: boolean;
}

export async function fetchParticipantFullRecord(
  uid: string,
  lang: Language
): Promise<ParticipantFullRecord> {
  if (!firestoreDb) {
    return {
      profile: null,
      journal: [],
      dailyLogs: [],
      coinTransactions: [],
      calendar: null,
      privacy: { ...DEFAULT_USER_PRIVACY_SETTINGS },
      tier1Restricted: false,
    };
  }
  const db = firestoreDb;
  let journalDenied = false;
  let calendarDenied = false;

  const [profileSnap, journalSnap, dailyLogs, coinTransactions, calendar, privacySnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'profile', 'main')).catch(() => null),
    getDocs(
      query(collection(db, 'users', uid, 'journal'), orderBy('dateKey', 'desc'), limit(360))
    ).catch(() => {
      journalDenied = true;
      return null;
    }),
    fetchRecentDailyLogs(uid, 60).catch(() => []),
    fetchCoinTransactions(uid, 100).catch(() => []),
    fetchCalendarSummaryFromCloud(uid).catch(() => {
      calendarDenied = true;
      return null;
    }),
    getDoc(doc(db, 'users', uid, 'privacy', 'settings')).catch(() => null),
  ]);

  const profile =
    profileSnap && profileSnap.exists()
      ? normalizePlayerProfile(profileSnap.data() as Partial<PlayerProfile>, lang)
      : null;

  const journal: JournalEntry[] = journalSnap
    ? journalSnap.docs
        .map((d) => ({ ...d.data(), id: d.id }) as JournalEntry)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.updatedAt - a.updatedAt)
    : [];

  const privacy =
    privacySnap && privacySnap.exists()
      ? normalizePrivacySettings(privacySnap.data() as Partial<UserPrivacySettings>)
      : { ...DEFAULT_USER_PRIVACY_SETTINGS };

  return {
    profile,
    journal,
    dailyLogs,
    coinTransactions,
    calendar,
    privacy,
    tier1Restricted: journalDenied || calendarDenied,
  };
}
