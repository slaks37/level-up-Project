import type { AdminRole } from './engine/access';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  AIConfig,
  CoinEconomyConfig,
  CoinTransactionRecord,
  CoinTransactionSource,
  CoinTransactionType,
  DailyLogEntry,
  GrowthNewsItem,
  DreamStep,
  WorkoutFeedback,
  FirebaseRuntimeConfig,
  Language,
  MobileTab,
  PlayerProfile,
  Quest,
  QuestFilter,
  SharedAIPublicConfig,
  SyncStatus,
} from './types';
import {
  advanceStreakCounter,
  applyExpAndLevelUp,
  applyQuestCompletion,
  calculateBiometrics,
  computeDailyDurationBreakdown,
  createInitialPlayerProfile,
  createDefaultDreamSteps,
  DEFAULT_COIN_ECONOMY,
  getTodayDateKey,
  normalizePlayerProfile,
  playSFX,
  setSfxMuted,
  type CreateProfileInput,
} from './engine/science';
import { buildUserTelemetrySummary } from './engine/analytics';
import {
  loadAIConfig,
  loadLocalLogs,
  loadLocalPlayer,
  loadSavedLanguage,
  loadSfxMuted,
  saveAIConfig,
  saveLanguage,
  saveLocalLogs,
  saveLocalPlayer,
  saveRuntimeFirebaseConfig,
  saveSfxMuted,
} from './services/storageService';
import {
  checkIsUserAdmin,
  deleteProfileFromCloud,
  fetchCoinTransactions,
  fetchRecentDailyLogs,
  fetchUserEvidenceRecords,
  initFirebaseFromConfig,
  initializeCloudProfile,
  isFirebaseReady,
  recordCoinTransaction,
  saveCalendarSummaryToCloud,
  saveDailyLogToCloud,
  saveEvidenceRecordToCloud,
  saveProfileToCloud,
  saveUserPrivacySettings,
  subscribeAppFeatureFlags,
  subscribeAuth,
  subscribeCoinEconomyConfig,
  subscribeProfileFromCloud,
  subscribeSharedAIPublicConfig,
  subscribeUserPrivacySettings,
  syncUserTelemetrySummary,
  upsertUserMeta,
  watchAdminAccess,
} from './services/firebaseService';
import { DEFAULT_FEATURE_FLAGS, isFeatureEnabled, type FeatureFlagsConfig } from './services/featureFlags';
import type { UserPrivacySettings } from './engine/v2/privacy';
import { loadLocalPrivacySettings, saveLocalPrivacySettings } from './services/privacyStorage';
import {
  clearSelectedPersona,
  getSelectedPersona,
  saveSelectedPersona,
  trackHomepageEvent,
} from './services/homepageEvents';
import { createPathwayDreamSteps } from './engine/v2/pathways';
import type { DevelopmentDimension } from './engine/v2/dimensions';
import {
  loadLocalEvidence,
  saveLocalEvidence,
  type EvidenceRecord,
  type EvidenceTargetType,
} from './engine/v2/evidence';
import type { StudioCanvasId } from './engine/v2/businessStudio';
import { DimensionsHudPanel } from './components/DimensionsHudPanel';
import type { AwakeningV2Result } from './components/AwakeningV2Modal';
import { splitRoadmapTasks } from './services/aiService';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { AuthView } from './components/AuthView';
import { AwakeningView } from './components/AwakeningView';
import { buildCapturedTargetPlan, getActiveDreamStep, getCurrentDreamSteps, getRoadmapActions, planDailyFocus, type DailyTaskSuggestion } from './engine/coaching';
import type { CalendarEvent } from './services/googleCalendar';
import { CareerCoach, CoachSetupModal, GymCoach } from './components/CoachPanels';
import { BodyConditionPanel, DailyCheckInModal, DailyReflectionCard, NutritionPanel, type CheckInCaptureOptions } from './components/JournalPanels';
import { deriveWellnessConditions, getDailyEvidence, getGrowthActions, getJournalMoment, mergeJournal, type CheckIn, type CheckInInput, type DayPhase } from './engine/journal';
import { createDailyReflection } from './engine/reflection';
import { loadGuestJournal, useJournal } from './services/useJournal';
import { avatarOwnerKey, deleteAvatarPhoto } from './services/avatarStorage';
import { useToasts } from './hooks/useToasts';
import { usePwaInstall } from './hooks/usePwaInstall';
import {
  DailyTasksPanel,
  DreamRoadmapPanel,
  RewardsAndGrowth,
  SkillArsenalPanel,
  StatusPanel,
} from './components/DashboardPanels';
import {
  AddDreamStepModal,
  AddQuestModal,
  AddRewardModal,
  AddSkillModal,
  CompleteDayModal,
  CompleteQuestModal,
  EditBioModal,
  EditDreamModal,
  ResetConfirmModal,
  ScienceModal,
} from './components/Modals';
import { ToastContainer } from './components/ToastContainer';
import { ADMIN_HOST, ADMIN_URL, isAdminPath, PUBLIC_HOST, PUBLIC_URL } from './routes';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal }))
);
const AwakeningV2Modal = lazy(() =>
  import('./components/AwakeningV2Modal').then((module) => ({ default: module.AwakeningV2Modal }))
);
const EvidenceModal = lazy(() =>
  import('./components/EvidenceModal').then((module) => ({ default: module.EvidenceModal }))
);
const AcademyWorkspace = lazy(() =>
  import('./components/AcademyWorkspace').then((module) => ({ default: module.AcademyWorkspace }))
);
const BusinessStudioWorkspace = lazy(() =>
  import('./components/BusinessStudioWorkspace').then((module) => ({ default: module.BusinessStudioWorkspace }))
);
const AgnesCopilotWorkspace = lazy(() =>
  import('./components/AgnesCopilotWorkspace').then((module) => ({ default: module.AgnesCopilotWorkspace }))
);
const LandingHomepage = lazy(() =>
  import('./components/LandingHomepage').then((module) => ({ default: module.LandingHomepage }))
);

type ActiveWorkspace = 'today' | 'academy' | 'studio' | 'agnes';

type ActiveModal =
  | null
  | { type: 'science' }
  | { type: 'settings'; tab: 'ai' | 'cloud' | 'privacy' | 'app' }
  | { type: 'awakeningV2' }
  | {
      type: 'evidence';
      dimension: DevelopmentDimension;
      targetType: EvidenceTargetType;
      targetId: string;
      title: string;
    }
  | { type: 'reset' }
  | { type: 'editBio' }
  | { type: 'coachSetup'; section: 'career' | 'gym' }
  | { type: 'editDream' }
  | { type: 'addStep' }
  | { type: 'addQuest' }
  | { type: 'completeQuest'; quest: Quest }
  | { type: 'addSkill' }
  | { type: 'addReward' }
  | { type: 'checkIn'; dateKey: string; phase: DayPhase; owner: string }
  | { type: 'completeDay' };

export default function App() {
  const isDedicatedAdminHost = window.location.hostname === ADMIN_HOST;
  const isPublicHost = window.location.hostname === PUBLIC_HOST;
  const [lang, setLang] = useState<Language>(() => loadSavedLanguage());
  const [player, setPlayer] = useState<PlayerProfile | null>(() =>
    loadLocalPlayer(loadSavedLanguage())
  );
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>(() => loadLocalLogs());
  const [now, setNow] = useState(Date.now);
  const [agenda, setAgenda] = useState<{ owner: string; events: CalendarEvent[] }>();
  const promptedCheckIns = useRef(new Set<string>());
  const promptedGym = useRef(new Set<string>());
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => loadAIConfig());
  const [sfxMutedState, setSfxMutedState] = useState<boolean>(() => {
    const m = loadSfxMuted();
    setSfxMuted(m);
    return m;
  });

  const [mobileTab, setMobileTab] = useState<MobileTab>('status');
  const [questFilter, setQuestFilter] = useState<QuestFilter>('ALL');
  const [modal, setModal] = useState<ActiveModal>(null);
  const { toasts, notify } = useToasts();

  // Auth / Admin / Routing States (Landing Homepage -> Direct Account Login; no offline guest trial)
  const [authResolved, setAuthResolved] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(() => getSelectedPersona());
  const [isAdminView, setIsAdminView] = useState<boolean>(
    () => isDedicatedAdminHost || isAdminPath(window.location.pathname)
  );
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminAccessReady, setAdminAccessReady] = useState(false);
  const isAdmin = Boolean(adminRole);
  const [isUnverifiedBootstrapAdmin, setIsUnverifiedBootstrapAdmin] = useState(false);
  const [sharedAIConfig, setSharedAIConfig] = useState<SharedAIPublicConfig | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagsConfig>(() => ({ ...DEFAULT_FEATURE_FLAGS }));
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>(() => loadLocalPrivacySettings());
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('today');
  const [studioInitialTool, setStudioInitialTool] = useState<StudioCanvasId | undefined>(undefined);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(() => loadLocalEvidence());
  const [coinConfig, setCoinConfig] = useState<CoinEconomyConfig>(() => ({ ...DEFAULT_COIN_ECONOMY }));
  const [coinTransactions, setCoinTransactions] = useState<CoinTransactionRecord[]>([]);
  const coinConfigRef = useRef<CoinEconomyConfig>(coinConfig);
  coinConfigRef.current = coinConfig;
  const lastTelemetrySig = useRef('');

  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const breakdownRequest = useRef(0);

  // Firebase Cloud Sync States
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const journal = useJournal(isAdminView ? undefined : cloudUser?.uid);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [firebaseVersion, setFirebaseVersion] = useState(0);
  const [cloudProfileReady, setCloudProfileReady] = useState(false);
  const [savingNewProfile, setSavingNewProfile] = useState(false);

  // Refs for clean async sync without echo loops
  const playerRef = useRef<PlayerProfile | null>(player);
  playerRef.current = player;
  const langRef = useRef<Language>(lang);
  langRef.current = lang;
  const cloudUserRef = useRef<User | null>(cloudUser);
  cloudUserRef.current = cloudUser;
  const profileWrite = useRef(0);

  // PWA Install Prompt
  const { installPrompt, handleInstallPWA } = usePwaInstall(langRef, notify);

  // Browser back/forward sync for the legacy /admin route.
  useEffect(() => {
    if (isDedicatedAdminHost || isPublicHost) return;
    const onPopState = () => {
      setIsAdminView(isAdminPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDedicatedAdminHost, isPublicHost]);

  const navigateAdminView = (open: boolean) => {
    if (isDedicatedAdminHost && !open) {
      window.location.assign(PUBLIC_URL);
      return;
    }
    if (isPublicHost && open) {
      window.location.assign(ADMIN_URL);
      return;
    }
    setIsAdminView(open);
    const targetPath = open ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Online / Offline indicator
  useEffect(() => {
    const handleOffline = () => {
      if (cloudUserRef.current) setSyncStatus('offline');
    };
    const handleOnline = () => {
      if (cloudUserRef.current) setSyncStatus('syncing');
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const commitPlayerChange = useCallback((next: PlayerProfile) => {
    const uid = cloudUserRef.current?.uid;
    playerRef.current = next;
    setPlayer(next);
    saveLocalPlayer(next, uid);
    if (!uid) return;

    const revision = ++profileWrite.current;
    setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
    void saveProfileToCloud(uid, next).then(() => {
      if (profileWrite.current === revision && cloudUserRef.current?.uid === uid) setSyncStatus('synced');
    }).catch((error) => {
      console.error('[Cloud Sync] Write error:', error);
      if (profileWrite.current === revision && cloudUserRef.current?.uid === uid) setSyncStatus('error');
    });
  }, []);

  const logCoinActivity = useCallback(
    (
      type: CoinTransactionType,
      source: CoinTransactionSource,
      amount: number,
      balanceAfter: number,
      note: string
    ) => {
      const cleanAmount = Math.round(amount);
      if (cleanAmount === 0) return;
      const user = cloudUserRef.current;
      const localRecord: CoinTransactionRecord = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ownerUid: user?.uid || 'guest',
        type,
        source,
        amount: cleanAmount,
        balanceAfter: Math.max(0, Math.round(balanceAfter)),
        note: note.trim().slice(0, 240),
        partnerRef: '',
        actorUid: user?.uid || 'guest',
        actorEmail: user?.email || '',
        createdAt: Date.now(),
      };
      setCoinTransactions((prev) => [localRecord, ...prev].slice(0, 40));
      if (user) {
        void recordCoinTransaction(user.uid, {
          type,
          source,
          amount: cleanAmount,
          balanceAfter: localRecord.balanceAfter,
          note: localRecord.note,
          actorUid: user.uid,
          actorEmail: user.email || '',
        }).catch(() => {});
      }
    },
    []
  );

  // Initialize Firebase, Auth Listener, Admin Detection & Shared AI Config
  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;
    let unsubSharedAI: (() => void) | null = null;
    let unsubCoinEconomy: (() => void) | null = null;
    let unsubFeatureFlags: (() => void) | null = null;
    let unsubPrivacy: (() => void) | null = null;
    let unsubRole: (() => void) | null = null;
    let cancelled = false;
    let activeUid: string | undefined;

    const boot = async () => {
      const ready = await initFirebaseFromConfig();
      if (cancelled) return;
      if (!ready) {
        cloudUserRef.current = null;
        setCloudUser(null);
        setCloudProfileReady(false);
        const guest = loadLocalPlayer(langRef.current);
        playerRef.current = guest;
        setPlayer(guest);
        setDailyLogs(loadLocalLogs());
        setAdminRole(null);
        setAdminAccessReady(true);
        setIsUnverifiedBootstrapAdmin(false);
        setSyncStatus('local');
        setAuthResolved(true);
        return;
      }

      setSyncStatus('connecting');
      unsubAuth = subscribeAuth((user) => {
        if (cancelled) return;
        cloudUserRef.current = user;
        setCloudUser(user);
        setAdminRole(null);
        setAdminAccessReady(!user);
        setIsUnverifiedBootstrapAdmin(false);
        activeUid = user?.uid;
        const local = loadLocalPlayer(langRef.current, activeUid);
        playerRef.current = local;
        setPlayer(local);
        setDailyLogs(loadLocalLogs(activeUid));
        setCoinTransactions([]);
        lastTelemetrySig.current = '';
        setCloudProfileReady(false);
        setSavingNewProfile(false);
        setModal(null);
        profileWrite.current++;
        setAuthResolved(true);

        unsubRole?.();
        unsubRole = null;
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        if (unsubSharedAI) {
          unsubSharedAI();
          unsubSharedAI = null;
        }
        if (unsubCoinEconomy) {
          unsubCoinEconomy();
          unsubCoinEconomy = null;
        }
        if (unsubFeatureFlags) {
          unsubFeatureFlags();
          unsubFeatureFlags = null;
        }
        if (unsubPrivacy) {
          unsubPrivacy();
          unsubPrivacy = null;
        }

        if (!user) {
          setAdminRole(null);
          setIsUnverifiedBootstrapAdmin(false);
          setSharedAIConfig(null);
          setFeatureFlags({ ...DEFAULT_FEATURE_FLAGS });
          setPrivacySettings(loadLocalPrivacySettings());
          setEvidenceList(loadLocalEvidence());
          setActiveWorkspace('today');
          setCoinConfig({ ...DEFAULT_COIN_ECONOMY });
          setSyncStatus('local');
          return;
        }

        setShowAuthScreen(false);
        setSyncStatus(navigator.onLine ? 'syncing' : 'offline');

        // Check Admin privileges & register/update user directory doc
        void checkIsUserAdmin(user).then((adminStatus) => {
          if (cancelled || activeUid !== user.uid) return;
          setAdminRole(adminStatus.role);
          setAdminAccessReady(true);
          setIsUnverifiedBootstrapAdmin(adminStatus.isUnverifiedBootstrapAdmin);
          void upsertUserMeta(user, langRef.current, adminStatus.role).catch(() => {});
          unsubRole = watchAdminAccess(user, (role) => {
            if (cancelled || activeUid !== user.uid) return;
            setAdminRole(role);
            if (role !== adminStatus.role) void upsertUserMeta(user, langRef.current, role).catch(() => {});
          });
        });

        // Subscribe to Admin-configured Shared AI public status, Coin Economy, Feature Flags & Privacy
        unsubSharedAI = subscribeSharedAIPublicConfig((cfg) => {
          if (!cancelled) setSharedAIConfig(cfg);
        });
        unsubCoinEconomy = subscribeCoinEconomyConfig((cfg) => {
          if (!cancelled) setCoinConfig(cfg);
        });
        unsubFeatureFlags = subscribeAppFeatureFlags((flags) => {
          if (!cancelled) setFeatureFlags(flags);
        });
        setPrivacySettings(loadLocalPrivacySettings(user.uid));
        setEvidenceList(loadLocalEvidence(user.uid));
        void fetchUserEvidenceRecords(user.uid, 80)
          .then((cloudEv) => {
            if (!cancelled && activeUid === user.uid && cloudEv.length > 0) {
              setEvidenceList(cloudEv);
              saveLocalEvidence(cloudEv, user.uid);
            }
          })
          .catch(() => {});
        unsubPrivacy = subscribeUserPrivacySettings(user.uid, (settings) => {
          if (!cancelled && activeUid === user.uid) {
            setPrivacySettings(settings);
            saveLocalPrivacySettings(settings, user.uid);
          }
        });

        void fetchCoinTransactions(user.uid, 30)
          .then((txs) => {
            if (!cancelled && activeUid === user.uid) setCoinTransactions(txs);
          })
          .catch(() => {});

        void fetchRecentDailyLogs(user.uid, 60)
          .then((cloudLogs) => {
            if (cancelled || activeUid !== user.uid) return;
            const merged = new Map(loadLocalLogs(user.uid).map((entry) => [entry.dateKey, entry]));
            for (const entry of cloudLogs) merged.set(entry.dateKey, entry);
            const next = [...merged.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 60);
            saveLocalLogs(next, user.uid);
            setDailyLogs(next);
          })
          .catch(() => {});

        unsubProfile = subscribeProfileFromCloud(
          user.uid,
          langRef.current,
          (remoteProfile, { fromCache, hasPendingWrites }) => {
            if (cancelled || activeUid !== user.uid) return;
            if (hasPendingWrites) {
              setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
              return;
            }
            // An empty browser cache does not mean the account lacks a profile.
            if (fromCache && (!remoteProfile || playerRef.current)) return;
            playerRef.current = remoteProfile;
            setPlayer(remoteProfile);
            saveLocalPlayer(remoteProfile, user.uid);
            if (!fromCache) setCloudProfileReady(true);
            setSyncStatus(fromCache ? (navigator.onLine ? 'syncing' : 'offline') : 'synced');
          },
          (err) => {
            console.error('[Cloud Sync] Snapshot error:', err);
            if (!cancelled && activeUid === user.uid) setSyncStatus('error');
          }
        );
      });
    };

    void boot();

    return () => {
      cancelled = true;
      if (unsubAuth) unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubSharedAI) unsubSharedAI();
      if (unsubCoinEconomy) unsubCoinEconomy();
      if (unsubFeatureFlags) unsubFeatureFlags();
      if (unsubPrivacy) unsubPrivacy();
      unsubRole?.();
    };
  }, [firebaseVersion]);

  // Language handler
  const handleChangeLang = (nextLang: Language) => {
    setLang(nextLang);
    saveLanguage(nextLang);
    document.documentElement.lang = nextLang;
    playSFX('click');
    if (player) {
      const updatedBio = calculateBiometrics(
        player.age,
        player.height,
        player.weight,
        player.gender,
        nextLang
      );
      commitPlayerChange({ ...player, bio: updatedBio });
    }
    if (cloudUser) {
      void upsertUserMeta(cloudUser, nextLang, adminRole).catch(() => {});
    }
  };

  const hasTaskBreakdown = Boolean(aiConfig.apiKey.trim() || (cloudUser && sharedAIConfig?.enabled !== false &&
    (import.meta.env.VITE_AI_PROXY_URL || sharedAIConfig?.proxyConfigured)));

  const runTaskBreakdown = async (profile: PlayerProfile, silent = false) => {
    if (!hasTaskBreakdown || !navigator.onLine || !getActiveDreamStep(profile)) return;
    const request = ++breakdownRequest.current;
    const uid = cloudUserRef.current?.uid;
    setIsGeneratingRoadmap(true);

    try {
      const breakdowns = await splitRoadmapTasks(profile.goal, profile.dreamSteps, lang, aiConfig);
      const latest = playerRef.current;
      if (breakdownRequest.current !== request || latest?.goal !== profile.goal || cloudUserRef.current?.uid !== uid) return;
      const byId = new Map(breakdowns.map(({ id, actions }) => [id, actions]));
      let changed = false;
      const dreamSteps = latest.dreamSteps.map((step) => {
        const actions = byId.get(step.id);
        if (!actions || step.archived || step.completed || !profile.dreamSteps.some((original) => original.id === step.id && original.title === step.title)) return step;
        const oldActions = getRoadmapActions(step, lang).map((action) => action.slice(0, 140));
        const assigned = latest.quests.filter((quest) => quest.dreamStepId === step.id && oldActions.includes(quest.title)).map((quest) => quest.title);
        const preserved = new Set([...(step.completedActions || []), ...assigned]);
        const combined = [...new Set([...preserved, ...actions])].slice(0, 6);
        if (combined.length === oldActions.length && combined.every((action, index) => action === oldActions[index])) return step;
        changed = true;
        return { ...step, actions: combined };
      });
      if (changed) commitPlayerChange({ ...latest, dreamSteps });
      if (!silent) notify(
        changed
          ? (lang === 'id' ? 'Langkah kecil diperbarui.' : 'Small steps updated.')
          : (lang === 'id' ? 'Langkah yang sudah ada tetap siap dikerjakan.' : 'Your existing steps are ready to use.'),
        changed ? 'success' : 'info'
      );
    } catch {
      if (!silent && breakdownRequest.current === request && playerRef.current?.goal === profile.goal && cloudUserRef.current?.uid === uid) {
        notify(lang === 'id' ? 'Langkah dari aplikasi siap dipakai. Rancangan detail otomatis sedang belum bisa dijalankan.' : 'Your local steps are ready. Automatic breakdown is currently unavailable.', 'info');
      }
    } finally {
      if (breakdownRequest.current === request) setIsGeneratingRoadmap(false);
    }
  };

  const startProfile = async (created: PlayerProfile, recoverDevice = false) => {
    const uid = cloudUserRef.current?.uid;
    if (uid) {
      if (!cloudProfileReady || savingNewProfile) return;
      setSavingNewProfile(true);
      try {
        const history = recoverDevice ? { logs: loadLocalLogs(), journal: loadGuestJournal() } : undefined;
        const createdOnServer = await initializeCloudProfile(uid, created, history);
        if (!createdOnServer || cloudUserRef.current?.uid !== uid) return;
        if (history) {
          const logs = await fetchRecentDailyLogs(uid, 60).catch(() => null);
          if (logs && cloudUserRef.current?.uid === uid) {
            saveLocalLogs(logs, uid);
            setDailyLogs(logs);
          }
        }
      } catch (error) {
        console.error('[Cloud Sync] Profile initialization failed:', error);
        notify(lang === 'id' ? 'Profil belum tersimpan ke akun. Coba lagi saat terhubung.' : 'The profile could not be saved to your account. Try again when connected.', 'error');
        return;
      } finally {
        if (cloudUserRef.current?.uid === uid) setSavingNewProfile(false);
      }
      if (cloudUserRef.current?.uid !== uid) return;
      // The profile listener supplies the saved account document.
    } else {
      commitPlayerChange(created);
    }
    setMobileTab('status');
    notify(lang === 'id' ? `Profil ${created.name} siap dipakai.` : `${created.name}’s profile is ready.`, 'success');
    if (!recoverDevice) {
      if (uid && !playerRef.current) {
        playerRef.current = created;
        setPlayer(created);
        saveLocalPlayer(created, uid);
      }
      void runTaskBreakdown(created, true);
    }
  };

  const handleCompleteAwakening = (input: CreateProfileInput) => {
    trackHomepageEvent('registration_completed', {
      profession_id: input.selectedPreset?.id || 'custom',
      persona_id: selectedPersonaId || 'none',
    });
    clearSelectedPersona();
    setSelectedPersonaId(null);
    void startProfile(createInitialPlayerProfile(input, coinConfigRef.current));
  };

  // =========================================================================
  // GAMEPLAY & PROGRESS HANDLERS
  // =========================================================================
  const handleConfirmCompleteQuest = (quest: Quest, qty: number, rpe: number, workout?: WorkoutFeedback) => {
    if (!player) return;
    const { dateKey } = getJournalMoment();
    const cfg = coinConfigRef.current;
    const symbol = cfg.coinSymbol || 'KOIN';
    if (workout?.pain && qty <= 0) {
      journal.save({ id: dateKey + '-task-' + encodeURIComponent(quest.id), dateKey, kind: 'activity',
        title: (quest.title + (lang === 'id' ? ' (dihentikan)' : ' (stopped)')).slice(0, 140), category: 'FITNESS',
        minutes: 0, updatedAt: Date.now(), workout });
      setModal(null);
      notify(lang === 'id' ? 'Catatan latihan dan nyeri tersimpan.' : 'Workout and pain notes saved.', 'info');
      return;
    }
    try {
      const {
        nextPlayer,
        result,
        levelsGained,
        levelUpGold,
        milestoneGold,
        unlockedSkill,
        autoCompletedStepTitle,
        taskStreakIncremented,
        workoutStreakIncremented,
      } = applyQuestCompletion(player, quest.id, qty, rpe, lang, cfg, dateKey);

      journal.save({
        id: dateKey + '-task-' + encodeURIComponent(quest.id),
        dateKey,
        kind: 'activity',
        title: quest.title.slice(0, 140),
        category: quest.category,
        minutes: Math.min(1440, Math.max(0, Math.round(result.loggedMinutes))),
        updatedAt: Date.now(),
        ...(workout ? { workout } : {}),
      });
      const dreamSteps = nextPlayer.dreamSteps.map((step) => step.id === quest.dreamStepId &&
        getRoadmapActions(step, lang).some((action) => action.slice(0, 140) === quest.title)
        ? { ...step, completedActions: [...new Set([...(step.completedActions || []), quest.title])].slice(0, 30) }
        : step);
      commitPlayerChange({ ...nextPlayer, dreamSteps });
      setModal(null);

      // Record coin audit transactions
      let runningBalance = player.gold;
      if (result.goldEarned > 0) {
        runningBalance += result.goldEarned;
        logCoinActivity(
          'earn',
          quest.category === 'FITNESS' ? 'workout' : 'task',
          result.goldEarned,
          runningBalance,
          quest.title
        );
      }
      if (milestoneGold > 0 && autoCompletedStepTitle) {
        runningBalance += milestoneGold;
        logCoinActivity('earn', 'milestone', milestoneGold, runningBalance, autoCompletedStepTitle);
      }
      if (levelUpGold > 0) {
        runningBalance += levelUpGold;
        logCoinActivity('earn', 'level_up', levelUpGold, runningBalance, `Level Up ke Lv.${nextPlayer.level}`);
      }

      const streakNote = workoutStreakIncremented
        ? (lang === 'id' ? ` • 🔥 Streak Workout ${nextPlayer.workoutStreak}h` : ` • 🔥 Workout Streak ${nextPlayer.workoutStreak}d`)
        : taskStreakIncremented
          ? (lang === 'id' ? ` • 🔥 Streak Tugas ${nextPlayer.taskStreak}h` : ` • 🔥 Task Streak ${nextPlayer.taskStreak}d`)
          : '';

      if (levelsGained > 0) {
        playSFX('levelup');
        notify(
          lang === 'id'
            ? `LEVEL UP! Kamu naik ke Level ${nextPlayer.level}! (+${result.expEarned} EXP • +${result.goldEarned + levelUpGold} ${symbol})${streakNote}`
            : `LEVEL UP! You reached Level ${nextPlayer.level}! (+${result.expEarned} EXP • +${result.goldEarned + levelUpGold} ${symbol})${streakNote}`,
          'success'
        );
      } else {
        playSFX('quest');
        notify(
          lang === 'id'
            ? `${quest.category === 'FITNESS' ? 'Workout' : 'Tugas'} selesai! +${result.expEarned} EXP • +${result.goldEarned} ${symbol} (+${result.loggedMinutes}m)${streakNote}`
            : `${quest.category === 'FITNESS' ? 'Workout' : 'Task'} complete! +${result.expEarned} EXP • +${result.goldEarned} ${symbol} (+${result.loggedMinutes}m)${streakNote}`,
          'success'
        );
      }

      if (unlockedSkill) {
        notify(
          lang === 'id'
            ? `SKILL PERMANEN TERBUKA: "${unlockedSkill}"!`
            : `PERMANENT SKILL UNLOCKED: "${unlockedSkill}"!`,
          'success'
        );
      }

      if (autoCompletedStepTitle) {
        notify(
          lang === 'id'
            ? `Tahap Peta Impian tercapai: "${autoCompletedStepTitle}"${milestoneGold > 0 ? ` (+${milestoneGold} ${symbol})` : ''}!`
            : `Dream Milestone achieved: "${autoCompletedStepTitle}"${milestoneGold > 0 ? ` (+${milestoneGold} ${symbol})` : ''}!`,
          'success'
        );
      }
    } catch {
      setModal(null);
    }
  };

  const handleExtractCoreOverdrive = () => {
    if (!player) return;
    if (player.coreCharge < 4) {
      notify(
        lang === 'id'
          ? 'Selesaikan 4 tugas untuk mengisi penuh Energi Core (4/4)!'
          : 'Complete 4 tasks to charge Core Energy to 4/4!',
        'info'
      );
      return;
    }

    const cfg = coinConfigRef.current;
    const symbol = cfg.coinSymbol || 'KOIN';
    const overdriveGold = Math.max(0, Math.round(cfg.pointPerOverdrive));
    const base: PlayerProfile = {
      ...player,
      coreCharge: 0,
      gold: player.gold + overdriveGold,
    };
    const { nextPlayer, levelsGained, levelUpGold } = applyExpAndLevelUp(base, 20, cfg);
    commitPlayerChange(nextPlayer);
    if (overdriveGold > 0) {
      logCoinActivity('earn', 'overdrive', overdriveGold, player.gold + overdriveGold, 'Ekstrak Energi Core (4/4)');
    }
    if (levelUpGold > 0) {
      logCoinActivity('earn', 'level_up', levelUpGold, nextPlayer.gold, `Level Up ke Lv.${nextPlayer.level}`);
    }
    playSFX('levelup');
    notify(
      levelsGained > 0
        ? lang === 'id'
          ? `OVERDRIVE + LEVEL UP ke Lv.${nextPlayer.level}! (+${overdriveGold + levelUpGold} ${symbol})`
          : `OVERDRIVE + LEVEL UP to Lv.${nextPlayer.level}! (+${overdriveGold + levelUpGold} ${symbol})`
        : lang === 'id'
          ? `ENERGI CORE DIEKSTRAK! +${overdriveGold} ${symbol}`
          : `CORE ENERGY EXTRACTED! +${overdriveGold} ${symbol}`,
      'success'
    );
  };

  const handleToggleDreamStep = (stepId: string) => {
    if (!player) return;
    const cfg = coinConfigRef.current;
    const symbol = cfg.coinSymbol || 'KOIN';
    let newlyRewardedTitle = '';
    const nextSteps = player.dreamSteps.map((step) => {
      if (step.id !== stepId || step.archived) return step;
      const nextDone = !step.completed;
      if (nextDone && !step.rewarded) newlyRewardedTitle = step.title;
      return {
        ...step,
        completed: nextDone,
        rewarded: nextDone ? true : step.rewarded,
        completedMinutes: nextDone
          ? Math.max(step.completedMinutes, step.targetMinutes)
          : step.completedMinutes,
      };
    });

    const currentSteps = getCurrentDreamSteps({ ...player, dreamSteps: nextSteps });
    const completedCount = currentSteps.filter((s) => s.completed).length;
    const hp = Math.max(
      0,
      Math.round(
        ((Math.max(1, currentSteps.length) - completedCount) / Math.max(1, currentSteps.length)) *
          player.boss.maxHp
      )
    );

    let updated: PlayerProfile = {
      ...player,
      dreamSteps: nextSteps,
      boss: { ...player.boss, hp },
    };

    if (newlyRewardedTitle) {
      const milestoneGold = Math.max(0, Math.round(cfg.pointPerMilestone));
      const afterMilestoneGold = updated.gold + milestoneGold;
      updated = { ...updated, gold: afterMilestoneGold };
      const expRes = applyExpAndLevelUp(updated, 25, cfg);
      updated = expRes.nextPlayer;
      if (milestoneGold > 0) {
        logCoinActivity('earn', 'milestone', milestoneGold, afterMilestoneGold, newlyRewardedTitle);
      }
      if (expRes.levelUpGold > 0) {
        logCoinActivity('earn', 'level_up', expRes.levelUpGold, updated.gold, `Level Up ke Lv.${updated.level}`);
      }
      playSFX(expRes.levelsGained > 0 ? 'levelup' : 'quest');
      notify(
        lang === 'id'
          ? `Tahap Peta Impian tercapai!${milestoneGold > 0 ? ` +${milestoneGold} ${symbol}` : ''}`
          : `Dream Roadmap step complete!${milestoneGold > 0 ? ` +${milestoneGold} ${symbol}` : ''}`,
        'success'
      );
    } else {
      playSFX('click');
    }

    commitPlayerChange(updated);
  };

  const handleConfirmCompleteDay = () => {
    if (!player) return;
    const cfg = coinConfigRef.current;
    const symbol = cfg.coinSymbol || 'KOIN';
    const todayKey = getTodayDateKey();
    const completedCount = player.quests.filter((q) => q.completed).length;
    const qualifiesBonus = completedCount >= 1;
    const alreadyClaimedToday = dailyLogs.some((l) => l.dateKey === todayKey && l.goldEarned > 0);
    const streakRes = qualifiesBonus
      ? advanceStreakCounter(player.streak, player.longestStreak, player.lastActiveStreakDate, todayKey)
      : {
          count: player.streak,
          longest: player.longestStreak ?? player.streak,
          lastDate: player.lastActiveStreakDate || '',
          incremented: false,
        };
    const nextStreak = streakRes.count;
    const bonusExp = qualifiesBonus && !alreadyClaimedToday ? 15 : 0;
    const bonusGold = qualifiesBonus && !alreadyClaimedToday ? Math.max(0, Math.round(cfg.pointPerDayClear)) : 0;

    const todayEvidence = getDailyEvidence(journal.records, dailyLogs, todayKey, player.age);
    const { sleepCondition, nutritionCondition } = deriveWellnessConditions(
      todayEvidence,
      player.sleepCondition,
      player.nutritionCondition
    );

    const logEntry: DailyLogEntry = {
      dateKey: todayKey,
      completedTasks: completedCount,
      totalTasks: player.quests.length,
      studyMinutes: player.dailyDurationLog.study,
      workMinutes: player.dailyDurationLog.work,
      fitnessMinutes: player.dailyDurationLog.fitness,
      expEarned: bonusExp,
      goldEarned: bonusGold,
      streakAfter: nextStreak,
      sleepCondition,
      nutritionCondition,
    };

    const nextLogs = [
      logEntry,
      ...dailyLogs.filter((l) => l.dateKey !== logEntry.dateKey),
    ].slice(0, 60);
    setDailyLogs(nextLogs);
    saveLocalLogs(nextLogs, cloudUser?.uid);

    if (cloudUser) {
      void saveDailyLogToCloud(cloudUser.uid, logEntry).catch(() => {});
    }

    const refreshedQuests = player.quests.filter((quest) => {
      if (quest.id.startsWith('daily-plan-') || quest.id.startsWith('target-') || quest.id.startsWith('ai_q_')) return !quest.completed;
      return !player.dreamSteps.some((step) =>
        step.id === quest.dreamStepId && (step.completedActions?.includes(quest.title) || (step.archived && quest.completed)));
    }).map((quest) => {
      const { completedQty: _cq, completedRpe: _cr, ...cleanQuest } = quest;
      return { ...cleanQuest, completed: false };
    });

    const base: PlayerProfile = {
      ...player,
      streak: nextStreak,
      longestStreak: streakRes.longest,
      lastActiveStreakDate: streakRes.lastDate,
      sleepCondition,
      nutritionCondition,
      gold: player.gold + bonusGold,
      dailyDurationLog: { study: 0, work: 0, fitness: 0 },
      quests: refreshedQuests,
    };

    const { nextPlayer, levelUpGold } = applyExpAndLevelUp(base, bonusExp, cfg);
    commitPlayerChange(nextPlayer);
    if (bonusGold > 0) {
      logCoinActivity('earn', 'day_clear', bonusGold, player.gold + bonusGold, `Rekap harian ${todayKey}`);
    }
    if (levelUpGold > 0) {
      logCoinActivity('earn', 'level_up', levelUpGold, nextPlayer.gold, `Level Up ke Lv.${nextPlayer.level}`);
    }
    setModal(null);
    playSFX('levelup');
    notify(
      bonusGold > 0
        ? lang === 'id'
          ? `Hari ditutup! 🔥 Streak ${nextStreak} hari (+${bonusGold} ${symbol}). Tugas siap untuk besok!`
          : `Day complete! 🔥 ${nextStreak}-day streak (+${bonusGold} ${symbol}). Fresh tasks ready!`
        : lang === 'id'
          ? 'Log harian disimpan dan tugas disegarkan untuk sesi baru!'
          : 'Daily log saved and tasks refreshed for a fresh start!',
      'success'
    );
  };

  const handleBuyReward = (rewardId: string) => {
    if (!player) return;
    const symbol = coinConfigRef.current.coinSymbol || 'KOIN';
    const rew = player.rewards.find((r) => r.id === rewardId);
    if (!rew) return;
    if (player.gold < rew.cost) {
      notify(
        lang === 'id'
          ? `Koin belum cukup! Butuh ${rew.cost} ${symbol}.`
          : `Not enough coins! Need ${rew.cost} ${symbol}.`,
        'warning'
      );
      return;
    }
    const nextBalance = player.gold - rew.cost;
    commitPlayerChange({ ...player, gold: nextBalance });
    logCoinActivity('redeem', 'self_reward', -rew.cost, nextBalance, `Tukar hadiah: ${rew.name}`);
    playSFX('levelup');
    notify(
      lang === 'id'
        ? `Berhasil menukar "${rew.name}" (-${rew.cost} ${symbol})! Selamat menikmati hadiah kerjamu!`
        : `Redeemed "${rew.name}" (-${rew.cost} ${symbol})! Enjoy your well-earned reward!`,
      'success'
    );
  };

  const handleTurnNewsIntoQuest = (item: GrowthNewsItem) => {
    if (!player) return;
    const title = item.actionTask.slice(0, 140);
    if (player.quests.some((quest) => !quest.completed && quest.title === title)) return;
    const active = getActiveDreamStep(player);
    const activeStep = active && item.id === 'roadmap-' + active.id ? active : undefined;
    const nextQuest: Quest = {
      id: `opp_q_${Date.now()}`,
      title,
      category: 'STUDY',
      unitType: 'MINUTES',
      defaultQty: 20,
      skillTag: activeStep?.skillName || item.tag,
      dreamStepId: activeStep?.id ?? null,
      exp: 20,
      gold: 1,
      completed: false,
    };
    commitPlayerChange({
      ...player,
      quests: [nextQuest, ...player.quests],
    });
    playSFX('quest');
    notify(
      lang === 'id'
        ? 'Peluang ditambahkan ke Tugas Harian!'
        : 'Opportunity added to your Daily Tasks!',
      'success'
    );
  };

  const handleResetProfile = async () => {
    saveLocalPlayer(null, cloudUserRef.current?.uid);
    playerRef.current = null;
    setPlayer(null);
    setModal(null);
    await deleteAvatarPhoto(avatarOwnerKey(cloudUser?.uid)).catch(() => {});
    if (cloudUser) {
      try {
        await deleteProfileFromCloud(cloudUser.uid);
      } catch {
        // Ignore if doc doesn't exist
      }
    }
    notify(
      lang === 'id' ? 'Profil direset. Silakan mulai perjalanan baru!' : 'Profile reset!',
      'info'
    );
  };

  // Settings Handlers
  const handleSaveAIConfig = (cfg: AIConfig) => {
    setAIConfig(cfg);
    saveAIConfig(cfg);
  };

  const handleSavePrivacySettings = async (next: UserPrivacySettings) => {
    const uid = cloudUserRef.current?.uid;
    setPrivacySettings(next);
    saveLocalPrivacySettings(next, uid);
    if (uid) {
      await saveUserPrivacySettings(uid, next);
    }
  };

  const handleSubmitEvidence = async (record: EvidenceRecord) => {
    const uid = cloudUserRef.current?.uid;
    setEvidenceList((prev) => {
      const next = [record, ...prev.filter((item) => item.id !== record.id)].slice(0, 200);
      saveLocalEvidence(next, uid);
      return next;
    });
    if (uid) {
      await saveEvidenceRecordToCloud(uid, record).catch(() => {});
    }
    if (record.targetType === 'dream_step' && playerRef.current) {
      const cur = playerRef.current;
      commitPlayerChange({
        ...cur,
        dreamSteps: cur.dreamSteps.map((s) =>
          s.id === record.targetId ? { ...s, evidenceStatus: record.reviewStatus === 'submitted' ? 'submitted' : 'none' } : s
        ),
      });
    }
    playSFX('quest');
    notify(
      lang === 'id'
        ? record.reviewStatus === 'submitted'
          ? 'Bukti nyata terkirim ke Evidence Vault & antrean tinjauan Mentor!'
          : 'Draft bukti disimpan ke Evidence Vault.'
        : record.reviewStatus === 'submitted'
          ? 'Real-world proof submitted to Evidence Vault & Mentor review queue!'
          : 'Evidence draft saved.',
      'success'
    );
  };

  const handleSaveAwakeningV2 = (result: AwakeningV2Result) => {
    if (!player) return;
    let nextDreamSteps = player.dreamSteps;
    if (result.applyPathwayRoadmap) {
      const archived = player.dreamSteps
        .filter((s) => s.completed || s.completedMinutes > 0 || (s.completedActions?.length ?? 0) > 0)
        .slice(0, 35)
        .map((s) => ({ ...s, archived: true }));
      const freshSteps = createPathwayDreamSteps(
        result.pathwayId,
        player.goal,
        player.profession,
        player.targetLevel,
        player.dailyBreakdown,
        lang
      ).map((step) => ({ ...step, id: `v2_${result.pathwayId}_${crypto.randomUUID().slice(0, 8)}` }));
      nextDreamSteps = [...freshSteps, ...archived].slice(0, 50);
    }

    commitPlayerChange({
      ...player,
      schemaVersion: 4,
      pathwayId: result.pathwayId,
      purposeStatement: result.purposeStatement || undefined,
      awakeningV2Completed: true,
      availableResources: result.availableResources,
      preferredActiveDays: result.preferredActiveDays,
      skillSelfRatings: result.skillSelfRatings,
      dreamSteps: nextDreamSteps,
    });
    setModal(null);
    playSFX('levelup');
    notify(
      lang === 'id'
        ? 'Awakening 2.0 tersimpan! Jalur pengembangan aktif tanpa menghapus progres lamamu.'
        : 'Awakening 2.0 saved! Pathway activated while preserving all prior progress.',
      'success'
    );
  };

  const handleSaveFirebaseConfig = async (cfg: FirebaseRuntimeConfig | null) => {
    saveRuntimeFirebaseConfig(cfg);
    setFirebaseVersion((v) => v + 1);
    notify(
      lang === 'id'
        ? 'Konfigurasi Firebase disimpan! Silakan login untuk mulai Cloud Sync.'
        : 'Firebase config saved! Sign in to start Cloud Sync.',
      'success'
    );
  };

  const handleForceCloudSync = async () => {
    if (!cloudUser || !player || !cloudProfileReady) return;
    setSyncStatus('syncing');
    try {
      await saveProfileToCloud(cloudUser.uid, player);
      setSyncStatus('synced');
      notify(
        lang === 'id' ? 'Data berhasil disinkronkan ke Cloud!' : 'Data synced to Cloud!',
        'success'
      );
    } catch {
      setSyncStatus('error');
      notify(
        lang === 'id'
          ? 'Gagal sinkronisasi ke Firestore. Pastikan Firestore Rules sudah di-deploy.'
          : 'Failed to sync to Firestore. Ensure Firestore Rules are deployed.',
        'error'
      );
    }
  };

  const handleExportJSON = () => {
    if (!player) {
      notify(
        lang === 'id' ? 'Belum ada profil untuk di-export.' : 'No profile to export.',
        'warning'
      );
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      player,
      dailyLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-up-backup-${getTodayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(lang === 'id' ? 'File backup JSON diunduh!' : 'JSON backup downloaded!', 'success');
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedPlayer = parsed.player ?? parsed;
        if (!importedPlayer || !importedPlayer.name) {
          throw new Error('Invalid format');
        }
        const normalized = normalizePlayerProfile(importedPlayer, lang);
        commitPlayerChange(normalized);
        if (Array.isArray(parsed.dailyLogs)) {
          setDailyLogs(parsed.dailyLogs);
          saveLocalLogs(parsed.dailyLogs, cloudUser?.uid);
        }
        setModal(null);
        notify(
          lang === 'id'
            ? `Backup profil "${normalized.name}" berhasil dipulihkan!`
            : `Restored profile "${normalized.name}" from backup!`,
          'success'
        );
      } catch {
        notify(
          lang === 'id' ? 'File JSON backup tidak valid.' : 'Invalid JSON backup file.',
          'error'
        );
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, []);

  const CHECKIN_DAILY_PROMPT_STORAGE_KEY = 'levelup_daily_checkin_prompted_v1';
  const hasPromptedCheckInOnDate = (ownerKey: string, dayKey: string): boolean => {
    const composite = `${ownerKey}:${dayKey}`;
    if (promptedCheckIns.current.has(composite)) return true;
    try {
      const raw = window.localStorage.getItem(CHECKIN_DAILY_PROMPT_STORAGE_KEY);
      if (!raw) return false;
      const map = JSON.parse(raw) as Record<string, string>;
      return map[ownerKey] === dayKey;
    } catch {
      return false;
    }
  };
  const markCheckInPromptedOnDate = (ownerKey: string, dayKey: string): void => {
    promptedCheckIns.current.add(`${ownerKey}:${dayKey}`);
    try {
      const raw = window.localStorage.getItem(CHECKIN_DAILY_PROMPT_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[ownerKey] = dayKey;
      window.localStorage.setItem(CHECKIN_DAILY_PROMPT_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore storage quota / private mode restrictions
    }
  };

  const { dateKey, phase } = getJournalMoment(new Date(now));
  const hasCheckInToday = journal.records.some(
    (entry) => entry.dateKey === dateKey || entry.id.startsWith(`${dateKey}-`)
  );
  const isPlayerReady = Boolean(player) && authResolved && !isAdminView && !showAuthScreen && journal.ready;
  const missingGym = Boolean(player && !player.gym);
  useEffect(() => {
    if (modal?.type === 'checkIn' && modal.owner !== journal.key) {
      setModal(null);
      return;
    }
    if (!isPlayerReady || modal) return;
    if (!hasCheckInToday && !hasPromptedCheckInOnDate(journal.key, dateKey)) {
      markCheckInPromptedOnDate(journal.key, dateKey);
      setModal({ type: 'checkIn', dateKey, phase, owner: journal.key });
      return;
    }
    const gymKey = journal.key + ':' + dateKey;
    if (missingGym && !promptedGym.current.has(gymKey)) {
      promptedGym.current.add(gymKey);
      setModal({ type: 'coachSetup', section: 'gym' });
    }
  }, [isPlayerReady, hasCheckInToday, modal, journal.key, dateKey, phase, missingGym]);

  // Keep Admin directory telemetry synced whenever participant profile/journal/logs update
  useEffect(() => {
    if (!cloudUser || !player || isAdminView || !cloudProfileReady) return;
    const summary = buildUserTelemetrySummary(player, journal.records, dailyLogs, dateKey, privacySettings);
    const sig = JSON.stringify({ ...summary, updatedAt: 0 });
    if (sig === lastTelemetrySig.current) return;
    const timer = window.setTimeout(() => {
      lastTelemetrySig.current = sig;
      void syncUserTelemetrySummary(cloudUser.uid, summary).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [cloudUser, player, journal.records, dailyLogs, dateKey, isAdminView, cloudProfileReady, privacySettings]);

  const evidence = getDailyEvidence(journal.records, dailyLogs, dateKey, player?.age ?? 18);
  const calendarEvents = agenda?.owner === journal.key ? agenda.events : [];
  const focus = player ? planDailyFocus(player, evidence, calendarEvents, phase, now, lang) : null;
  const reflection = player ? createDailyReflection({ owner: journal.key, player, evidence, events: calendarEvents, dateKey, phase, now, lang }) : null;
  const updateAgenda = useCallback((owner: string, events: CalendarEvent[]) => setAgenda({ owner, events }), []);
  const handleCalendarSynced = useCallback((source: 'google_oauth' | 'ics' | 'none', events: CalendarEvent[]) => {
    const uid = cloudUserRef.current?.uid;
    if (!uid) return;
    void saveCalendarSummaryToCloud(uid, source, events).catch(() => {});
  }, []);
  const addCoachQuest = (quest: Quest) => {
    const current = playerRef.current;
    if (!current || current.quests.length >= 100 || current.quests.some((item) => item.title === quest.title && item.category === quest.category && item.dreamStepId === quest.dreamStepId)) return;
    commitPlayerChange({ ...current, quests: [quest, ...current.quests] });
    notify(lang === 'id' ? 'Ditambahkan ke tugas harian.' : 'Added to daily tasks.', 'success');
  };
  const addMicroTask = (title: string, step?: DreamStep) => {
    const clean = title.trim().slice(0, 140);
    if (!clean) return;
    addCoachQuest({
      id: crypto.randomUUID(), title: clean, category: 'CAREER', unitType: 'MINUTES',
      defaultQty: 15, skillTag: step?.skillName || (lang === 'id' ? 'Manajemen proyek' : 'Project management'),
      dreamStepId: step?.id ?? null,
      exp: 20, gold: 1, completed: false,
    });
  };

  const addSuggestedTask = (task: DailyTaskSuggestion) => addCoachQuest({
    id: 'daily-plan-' + crypto.randomUUID(), title: task.title, category: task.category, unitType: 'MINUTES',
    defaultQty: task.minutes, skillTag: task.skill, dreamStepId: task.stepId ?? null, exp: 20, gold: 1, completed: false,
  });

  const openCheckIn = () => setModal({ type: 'checkIn', ...getJournalMoment(), owner: journal.key });
  const saveCheckIn = (input: CheckInInput, options?: CheckInCaptureOptions) => {
    if (modal?.type !== 'checkIn' || modal.owner !== journal.key) return;
    const entryId = modal.dateKey + '-' + modal.phase;
    const isNewSlot = !journal.records.some((record) => record.id === entryId);
    const entry: CheckIn = { ...input, id: entryId,
      dateKey: modal.dateKey, phase: modal.phase, kind: 'checkin', updatedAt: Date.now() };
    journal.save(entry);
    markCheckInPromptedOnDate(journal.key, modal.dateKey);
    setModal(null);

    const cfg = coinConfigRef.current;
    const symbol = cfg.coinSymbol || 'KOIN';
    const checkInReward = isNewSlot ? Math.max(0, Math.round(cfg.pointPerCheckIn)) : 0;
    const checkInExp = isNewSlot ? 10 : 0;
    const current = playerRef.current;

    if (!current) {
      notify(lang === 'id' ? 'Check-in tersimpan.' : 'Check-in saved.', 'success');
      return;
    }

    const captureEnabled = options?.captureToTodo ?? (modal.phase === 'morning');
    const keepDualTrack = options?.keepDualTrack ?? true;
    const captured =
      captureEnabled && input.note.trim()
        ? buildCapturedTargetPlan(input.note, current, lang, { includeDualTrackCompanion: keepDualTrack })
        : { userTasks: [], companionTasks: [], allQuestsToAdd: [] };

    const addedCount = captured.allQuestsToAdd.length;
    const hasCompanion = captured.companionTasks.length > 0;

    if (checkInReward > 0 || checkInExp > 0 || addedCount > 0) {
      const nextQuests = addedCount > 0
        ? [...captured.allQuestsToAdd, ...current.quests].slice(0, 100)
        : current.quests;
      const basePlayer: PlayerProfile = {
        ...current,
        gold: current.gold + checkInReward,
        quests: nextQuests,
      };
      const expRes = checkInExp > 0
        ? applyExpAndLevelUp(basePlayer, checkInExp, cfg)
        : { nextPlayer: basePlayer, levelsGained: 0, levelUpGold: 0 };

      commitPlayerChange(expRes.nextPlayer);
      if (checkInReward > 0) {
        logCoinActivity('earn', 'checkin', checkInReward, current.gold + checkInReward, `Check-in ${modal.phase} (${modal.dateKey})`);
      }
      if (expRes.levelUpGold > 0) {
        logCoinActivity('earn', 'level_up', expRes.levelUpGold, expRes.nextPlayer.gold, `Level Up ke Lv.${expRes.nextPlayer.level}`);
      }
      playSFX(expRes.levelsGained > 0 ? 'levelup' : 'quest');

      const rewardParts = [
        checkInExp > 0 ? `+${checkInExp} EXP` : '',
        checkInReward > 0 ? `+${checkInReward} ${symbol}` : '',
        addedCount > 0
          ? (lang === 'id'
              ? `${addedCount} tugas masuk To-Do List${hasCompanion ? ' (Karier & Impian aktif)' : ''}`
              : `${addedCount} tasks added to To-Do List${hasCompanion ? ' (Career & Dream active)' : ''}`)
          : '',
      ].filter(Boolean);

      notify(
        lang === 'id'
          ? `Check-in tersimpan! ${rewardParts.join(' • ')}`
          : `Check-in saved! ${rewardParts.join(' • ')}`,
        'success'
      );
    } else {
      notify(lang === 'id' ? 'Check-in tersimpan.' : 'Check-in saved.', 'success');
    }
  };

  const avatarOwner = avatarOwnerKey(cloudUser?.uid);
  const canAccessAdmin = isAdmin || isUnverifiedBootstrapAdmin;
  const pendingTasksCount = player ? player.quests.filter((q) => !q.completed).length : 0;

  // Unauthenticated public visitors see the LevelUp Homepage first, then direct Email/Google login (no offline guest trial)
  const awaitingCloudProfile = Boolean(cloudUser && !isAdminView && !player && !cloudProfileReady);
  const availableDeviceProfile = cloudUser && cloudProfileReady && !player ? loadLocalPlayer(lang) : null;
  const shouldShowLandingHome =
    isFirebaseReady() &&
    !cloudUser &&
    !isAdminView &&
    !showAuthScreen;
  const shouldShowAuthGate =
    isFirebaseReady() &&
    authResolved &&
    !cloudUser &&
    (isAdminView || showAuthScreen);

  return (
    <div className="min-h-screen flex flex-col">
      {!shouldShowLandingHome && (
        <Header
          lang={lang}
          onChangeLang={handleChangeLang}
          hasPlayer={Boolean(player)}
          syncStatus={syncStatus}
          cloudUser={cloudUser}
          canAccessAdmin={canAccessAdmin}
          isAdminView={isAdminView}
          onToggleAdminView={() => navigateAdminView(!isAdminView)}
          onOpenAuthScreen={() => {
            setAuthInitialMode('login');
            setShowAuthScreen(true);
          }}
          canInstallPWA={!isDedicatedAdminHost && Boolean(installPrompt)}
          onInstallPWA={() => void handleInstallPWA()}
          onOpenScience={() => setModal({ type: 'science' })}
          onOpenSettings={(tab = 'ai') => setModal({ type: 'settings', tab })}
          onOpenReset={() => setModal({ type: 'reset' })}
          onOpenProfile={() => setModal({ type: 'editBio' })}
        />
      )}

      {/* Optional Admin Broadcast Notice */}
      {sharedAIConfig?.maintenanceNotice && !isAdminView && !shouldShowAuthGate && (
        <div className="bg-slate-900 text-sky-100 border-b border-sky-700 px-3 py-1.5 text-center font-mono text-[11px]">
          ⚡ {sharedAIConfig.maintenanceNotice}
        </div>
      )}

      <main
        className={`flex-grow w-full mx-auto ${
          shouldShowLandingHome ? 'p-0' : 'max-w-7xl px-3 sm:px-6 py-4 sm:py-5'
        } ${
          player && !isAdminView && !shouldShowAuthGate && !shouldShowLandingHome ? 'pb-24 lg:pb-8' : ''
        }`}
      >
        {shouldShowLandingHome ? (
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-200">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-xs text-slate-400">
                  {lang === 'id' ? 'Memuat Beranda Level Up...' : 'Loading Level Up Home...'}
                </p>
              </div>
            }
          >
            <LandingHomepage
              lang={lang}
              onChangeLang={handleChangeLang}
              onOpenAuth={(mode, personaId) => {
                if (personaId) {
                  saveSelectedPersona(personaId);
                  setSelectedPersonaId(personaId);
                }
                if (mode === 'register') {
                  trackHomepageEvent('registration_started', {
                    persona_id: personaId || selectedPersonaId || 'none',
                  });
                }
                setAuthInitialMode(mode);
                setShowAuthScreen(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </Suspense>
        ) : isFirebaseReady() && !authResolved ? (
          <div className="max-w-md mx-auto py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-mono text-xs text-slate-600">
              {lang === 'id' ? 'Memeriksa sesi akun Cloud...' : 'Checking Cloud session...'}
            </p>
          </div>
        ) : shouldShowAuthGate ? (
          <AuthView
            key={authInitialMode}
            lang={lang}
            adminOnly={isAdminView}
            initialMode={authInitialMode}
            onExit={() => {
              if (isDedicatedAdminHost || isAdminView) {
                navigateAdminView(false);
                return;
              }
              setShowAuthScreen(false);
            }}
            onNotify={notify}
          />
        ) : isAdminView && !adminAccessReady ? (
          <p role="status" className="py-12 text-center text-sm text-slate-700">
            {lang === 'id' ? 'Memeriksa izin admin…' : 'Checking admin access…'}
          </p>
        ) : isAdminView ? (
          <Suspense
            fallback={
              <div className="max-w-md mx-auto py-16 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-mono text-xs text-slate-600">
                  {lang === 'id' ? 'Memuat Admin Control Center...' : 'Loading Admin Control Center...'}
                </p>
              </div>
            }
          >
            <AdminDashboard
              lang={lang}
              cloudUser={cloudUser}
              adminRole={adminRole}
              isUnverifiedBootstrapAdmin={isUnverifiedBootstrapAdmin}
              proxyBaseUrl={aiConfig.proxyBaseUrl || ''}
              onSaveProxyBaseUrl={(url) =>
                handleSaveAIConfig({ ...aiConfig, proxyBaseUrl: url })
              }
              onBackToApp={() => navigateAdminView(false)}
              onNotify={notify}
            />
          </Suspense>
        ) : awaitingCloudProfile || savingNewProfile ? (
          <section role="status" className="anime-panel mx-auto max-w-md space-y-3 p-5 text-center">
            <p className="font-bold">{syncStatus === 'error'
              ? (lang === 'id' ? 'Profil akun belum bisa dibuka' : 'Could not load your account profile')
              : (lang === 'id' ? 'Memuat profil akunmu…' : 'Loading your account profile…')}</p>
            <p className="text-xs text-slate-600">{lang === 'id'
              ? 'Level Up mengambil data akun yang tersimpan sebelum menampilkan profil.'
              : 'Level Up checks your saved account data before opening the profile.'}</p>
            {syncStatus === 'error' && <button type="button" className="rounded bg-slate-900 px-3 py-2 text-xs text-white"
              onClick={() => setFirebaseVersion((version) => version + 1)}>{lang === 'id' ? 'Coba lagi' : 'Try again'}</button>}
          </section>
        ) : !player ? (
          <div className="space-y-4">
            {availableDeviceProfile && <section className="anime-panel mx-auto max-w-3xl space-y-2 p-4 text-sm">
              <p className="font-semibold">{lang === 'id' ? 'Pakai profil yang tersimpan di perangkat ini?' : 'Use a profile from this device?'}</p>
              <p className="text-xs text-slate-600">{lang === 'id'
                ? `Akun ini belum punya profil Cloud. Jika “${availableDeviceProfile.name}” milikmu, sambungkan profil dan catatan perangkat ini ke akunmu.`
                : `This account has no cloud profile yet. If “${availableDeviceProfile.name}” is yours, connect this device’s profile and records to your account.`}</p>
              <button type="button" className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                onClick={() => void startProfile(availableDeviceProfile, true)}>{lang === 'id' ? 'Sinkronkan profil perangkat ini' : 'Sync this device’s profile'}</button>
            </section>}
            <AwakeningView
              lang={lang}
              isCloudLoggedIn={Boolean(cloudUser)}
              initialPersonaId={selectedPersonaId}
              onOpenCloudLogin={() => setShowAuthScreen(true)}
              onCompleteAwakening={handleCompleteAwakening}
            />
          </div>
        ) : (
          <section className="space-y-5">
            {(() => {
              const academyOn = isFeatureEnabled(featureFlags, 'academy', { isInternalStaff: isAdmin });
              const studioOn = isFeatureEnabled(featureFlags, 'businessStudio', { isInternalStaff: isAdmin });
              const agnesV2On = isFeatureEnabled(featureFlags, 'agnesV2', { isInternalStaff: isAdmin });
              if (!academyOn && !studioOn && !agnesV2On) return null;
              return (
                <nav
                  aria-label="LevelUp 2.0 Workspaces"
                  className="anime-panel px-2.5 py-2 flex flex-wrap items-center gap-1.5 bg-white border border-sky-200"
                >
                  <button
                    type="button"
                    onClick={() => setActiveWorkspace('today')}
                    className={`px-3 py-1.5 rounded font-hud font-bold text-xs transition ${
                      activeWorkspace === 'today' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'id' ? 'Command Center' : 'Command Center'}
                  </button>
                  {academyOn && (
                    <button
                      type="button"
                      onClick={() => setActiveWorkspace('academy')}
                      className={`px-3 py-1.5 rounded font-hud font-bold text-xs transition ${
                        activeWorkspace === 'academy' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
                      }`}
                    >
                      LevelUp Academy
                    </button>
                  )}
                  {studioOn && (
                    <button
                      type="button"
                      onClick={() => setActiveWorkspace('studio')}
                      className={`px-3 py-1.5 rounded font-hud font-bold text-xs transition ${
                        activeWorkspace === 'studio' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      }`}
                    >
                      Business Studio (16)
                    </button>
                  )}
                  {agnesV2On && (
                    <button
                      type="button"
                      onClick={() => setActiveWorkspace('agnes')}
                      className={`px-3 py-1.5 rounded font-hud font-bold text-xs transition ${
                        activeWorkspace === 'agnes' ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-900 hover:bg-sky-100'
                      }`}
                    >
                      Agnes AI 2.0 (10)
                    </button>
                  )}
                </nav>
              );
            })()}

            {activeWorkspace === 'academy' ? (
              <Suspense fallback={<div className="py-12 text-center font-mono text-xs text-slate-600">Loading LevelUp Academy...</div>}>
                <AcademyWorkspace
                  uid={cloudUser?.uid}
                  player={player}
                  lang={lang}
                  evidenceList={evidenceList}
                  onAddQuest={addCoachQuest}
                  onOpenEvidenceModal={(opts) => setModal({ type: 'evidence', ...opts })}
                  onOpenStudioTool={(canvasId) => {
                    if (isFeatureEnabled(featureFlags, 'businessStudio', { isInternalStaff: isAdmin })) {
                      setStudioInitialTool(canvasId as StudioCanvasId);
                      setActiveWorkspace('studio');
                    }
                  }}
                  onNotify={notify}
                />
              </Suspense>
            ) : activeWorkspace === 'studio' ? (
              <Suspense fallback={<div className="py-12 text-center font-mono text-xs text-slate-600">Loading Business Studio...</div>}>
                <BusinessStudioWorkspace
                  uid={cloudUser?.uid}
                  player={player}
                  lang={lang}
                  initialToolId={studioInitialTool}
                  onAddQuest={addCoachQuest}
                  onOpenEvidenceModal={(opts) => setModal({ type: 'evidence', ...opts })}
                  onNotify={notify}
                />
              </Suspense>
            ) : activeWorkspace === 'agnes' ? (
              <Suspense fallback={<div className="py-12 text-center font-mono text-xs text-slate-600">Loading Agnes AI 2.0...</div>}>
                <AgnesCopilotWorkspace
                  player={player}
                  lang={lang}
                  privacySettings={privacySettings}
                  privateJournalNotes={journal.records
                    .filter((r): r is CheckIn => r.kind === 'checkin' && Boolean(r.note.trim()))
                    .slice(0, 5)
                    .map((r) => r.note)}
                  healthMetrics={{
                    sleepHours: evidence.sleep,
                    mood: evidence.mood,
                    energy: evidence.energy,
                    hasPainAlert: Boolean(player.gym?.currentPain),
                  }}
                  calendarEventTitles={calendarEvents.map((e) => e.title)}
                  onAddQuest={addCoachQuest}
                  onOpenPrivacySettings={() => setModal({ type: 'settings', tab: 'privacy' })}
                />
              </Suspense>
            ) : (
            <>
            {journal.syncError && <p role="status" className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {lang === 'id' ? 'Jurnal tersimpan di perangkat. Sinkronisasi Cloud sedang bermasalah.' : 'Journal is on this device. Cloud sync is currently unavailable.'}
            </p>}
            {reflection && <div className={mobileTab === 'status' ? 'block' : 'hidden lg:block'}>
              <DailyReflectionCard lang={lang} reflection={reflection} />
            </div>}
            {(isFeatureEnabled(featureFlags, 'awakeningV2', { isInternalStaff: isAdmin }) ||
              isFeatureEnabled(featureFlags, 'pathways', { isInternalStaff: isAdmin }) ||
              Boolean(player.awakeningV2Completed)) && (
              <div className={mobileTab === 'status' ? 'block' : 'hidden lg:block'}>
                <DimensionsHudPanel
                  player={player}
                  lang={lang}
                  showUpgradeBanner={isFeatureEnabled(featureFlags, 'awakeningV2', { isInternalStaff: isAdmin })}
                  onOpenAwakeningV2={() => setModal({ type: 'awakeningV2' })}
                />
              </div>
            )}
            {/* ROW 1: STATUS | NUTRITION | ENERGY */}
            <div
              className={`${
                mobileTab === 'status' ? 'grid' : 'hidden lg:grid'
              } grid-cols-1 lg:grid-cols-12 gap-5`}
            >
              <div className="lg:col-span-4">
                <StatusPanel player={player} lang={lang} coinConfig={coinConfig} />
              </div>
              <div className="lg:col-span-4">
                <NutritionPanel lang={lang} evidence={evidence} onOpen={openCheckIn} />
              </div>
              <div className="lg:col-span-4">
                <BodyConditionPanel key={avatarOwner} owner={avatarOwner} evidence={evidence} phase={phase}
                  lang={lang} coreCharge={player.coreCharge} onOpen={openCheckIn} onBonus={handleExtractCoreOverdrive} />
              </div>
            </div>

            {/* ROW 2: DREAM ROADMAP | DAILY TASKS | AUTO SKILL ARSENAL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div
                className={`lg:col-span-5 ${
                  mobileTab === 'dream' ? 'block' : 'hidden lg:block'
                }`}
              >
                <DreamRoadmapPanel
                  player={player}
                  lang={lang}
                  isGeneratingRoadmap={isGeneratingRoadmap}
                  focusNote={focus?.note ?? ''}
                  canBreakDown={hasTaskBreakdown && Boolean(getActiveDreamStep(player))}
                  onGenerateRoadmap={() => void runTaskBreakdown(player)}
                  onEditDream={() => setModal({ type: 'editDream' })}
                  onAddStep={() => setModal({ type: 'addStep' })}
                  onAddRoadmapTask={(step, action) => addMicroTask(action, step)}
                  onToggleStep={handleToggleDreamStep}
                  onDeleteStep={(stepId) => {
                    playSFX('click');
                    commitPlayerChange({
                      ...player,
                      dreamSteps: player.dreamSteps.filter((s) => s.id !== stepId),
                    });
                  }}
                  onSubmitStepEvidence={(step) =>
                    setModal({
                      type: 'evidence',
                      dimension: step.dimension || 'BUSINESS',
                      targetType: 'dream_step',
                      targetId: step.id,
                      title: `${step.phase}: ${step.title}`.slice(0, 140),
                    })
                  }
                />
              </div>

              <div
                className={`lg:col-span-4 ${
                  mobileTab === 'tasks' ? 'block' : 'hidden lg:block'
                }`}
              >
                <DailyTasksPanel
                  player={player}
                  lang={lang}
                  filter={questFilter}
                  coinConfig={coinConfig}
                  focus={focus}
                  onAddSuggestion={addSuggestedTask}
                  onChangeFilter={(f) => {
                    playSFX('click');
                    setQuestFilter(f);
                  }}
                  onRequestCompleteQuest={(q) => setModal({ type: 'completeQuest', quest: q })}
                  onDeleteQuest={(questId) => {
                    playSFX('click');
                    commitPlayerChange({
                      ...player,
                      quests: player.quests.filter((q) => q.id !== questId),
                    });
                  }}
                  onOpenAddQuest={() => setModal({ type: 'addQuest' })}
                  onOpenCompleteDay={() => setModal({ type: 'completeDay' })}
                />
              </div>

              <div
                className={`lg:col-span-3 ${
                  mobileTab === 'skills' ? 'block' : 'hidden lg:block'
                }`}
              >
                <SkillArsenalPanel
                  player={player}
                  lang={lang}
                  onOpenAddSkill={() => setModal({ type: 'addSkill' })}
                />
              </div>
            </div>

            <div className={`grid gap-4 lg:grid-cols-2 ${mobileTab !== 'tasks' ? 'hidden lg:grid' : ''}`}>
              <CareerCoach key={journal.key} owner={journal.key} player={player} lang={lang} records={journal.records}
                onEdit={() => setModal({ type: 'coachSetup', section: 'career' })} onAdd={addMicroTask} onAgenda={updateAgenda}
                onCalendarSynced={handleCalendarSynced} />
              <GymCoach player={player} lang={lang} evidence={evidence} records={journal.records} coinConfig={coinConfig}
                onEdit={() => setModal({ type: 'coachSetup', section: 'gym' })} onAdd={addCoachQuest}
                onCompleteQuest={(q) => setModal({ type: 'completeQuest', quest: q })} />
            </div>

            {/* ROW 3: REWARD EXCHANGE + GROWTH NEWS */}
            <div className={mobileTab === 'perks' ? 'block' : 'hidden lg:block'}>
              <RewardsAndGrowth player={player} lang={lang}
                coinConfig={coinConfig}
                recentTransactions={coinTransactions}
                actions={getGrowthActions(player, dailyLogs, journal.records, evidence, lang)}
                onBuyReward={handleBuyReward}
                onAddReward={() => setModal({ type: 'addReward' })}
                onAddAction={handleTurnNewsIntoQuest} />
            </div>
            </>
            )}
          </section>
        )}
      </main>

      {player && !isAdminView && !shouldShowAuthGate && !shouldShowLandingHome && (
        <MobileNav
          activeTab={mobileTab}
          onSelectTab={(t) => {
            playSFX('click');
            setMobileTab(t);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          pendingTasksCount={pendingTasksCount}
          lang={lang}
        />
      )}

      {/* MODALS */}
      {modal?.type === 'science' && (
        <ScienceModal lang={lang} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'settings' && (
        <Suspense fallback={null}>
          <SettingsModal
            initialTab={modal.tab}
            lang={lang}
            aiConfig={aiConfig}
            sharedAIConfig={sharedAIConfig}
            onSaveAIConfig={handleSaveAIConfig}
            privacySettings={privacySettings}
            onSavePrivacySettings={handleSavePrivacySettings}
            cloudUser={cloudUser}
            syncStatus={syncStatus}
            onSaveFirebaseConfig={handleSaveFirebaseConfig}
            onForceCloudSync={handleForceCloudSync}
            sfxMuted={sfxMutedState}
            onToggleSfx={() => {
              const next = !sfxMutedState;
              setSfxMutedState(next);
              setSfxMuted(next);
              saveSfxMuted(next);
            }}
            canInstallPWA={Boolean(installPrompt)}
            onInstallPWA={() => void handleInstallPWA()}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            onNotify={notify}
            onClose={() => setModal(null)}
          />
        </Suspense>
      )}

      {modal?.type === 'awakeningV2' && player && (
        <Suspense fallback={null}>
          <AwakeningV2Modal
            player={player}
            lang={lang}
            onSave={handleSaveAwakeningV2}
            onClose={() => setModal(null)}
          />
        </Suspense>
      )}

      {modal?.type === 'evidence' && player && (
        <Suspense fallback={null}>
          <EvidenceModal
            ownerUid={cloudUser?.uid || 'guest'}
            lang={lang}
            defaultDimension={modal.dimension}
            defaultTargetType={modal.targetType}
            defaultTargetId={modal.targetId}
            defaultTitle={modal.title}
            existingEvidence={evidenceList}
            onSubmitEvidence={handleSubmitEvidence}
            onClose={() => setModal(null)}
          />
        </Suspense>
      )}

      {modal?.type === 'reset' && (
        <ResetConfirmModal
          lang={lang}
          onConfirm={() => void handleResetProfile()}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'coachSetup' && player && (
        <CoachSetupModal section={modal.section} player={player} lang={lang}
          onClose={() => setModal(null)} onSave={(profile) => {
            const current = playerRef.current;
            if (!current) return;
            commitPlayerChange({ ...current, ...profile });
            setModal(null);
          }} />
      )}

      {modal?.type === 'editBio' && player && (
        <EditBioModal
          player={player}
          lang={lang}
          onSave={(age, height, weight) => {
            const bio = calculateBiometrics(age, height, weight, player.gender, lang);
            const dailyBreakdown = computeDailyDurationBreakdown(
              player.dailyBreakdown.total,
              bio
            );
            commitPlayerChange({ ...player, age, height, weight, bio, dailyBreakdown });
            setModal(null);
            playSFX('click');
            notify(
              lang === 'id'
                ? 'Data biometrik & target protein diperbarui!'
                : 'Biometrics & protein target updated!',
              'success'
            );
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'editDream' && player && (
        <EditDreamModal
          player={player}
          lang={lang}
          onSave={(goal, targetLevel, dailyBudget) => {
            const dailyBreakdown = computeDailyDurationBreakdown(dailyBudget, player.bio);
            const changed = goal !== player.goal;
            const dreamSteps = changed ? [
              ...createDefaultDreamSteps(goal, player.profession, targetLevel, dailyBreakdown, lang)
                .map((step) => ({ ...step, id: 'goal-' + crypto.randomUUID() })),
              ...player.dreamSteps.filter((step) => step.completed || step.completedMinutes || step.completedActions?.length)
                .slice(0, 45).map((step) => ({ ...step, archived: true })),
            ] : player.dreamSteps;
            const previousSteps = new Set(getCurrentDreamSteps(player).map((step) => step.id));
            const quests = changed ? player.quests.filter((quest) => quest.completed || !quest.dreamStepId ||
              !previousSteps.has(quest.dreamStepId) || !/^(daily-plan-|ai_q_|ds_study_|ds_work_)/.test(quest.id)) : player.quests;
            const next = { ...player, goal, targetLevel, dailyBreakdown, dreamSteps, quests, boss: {
              ...player.boss, name: goal, desc: goal, hp: changed ? player.boss.maxHp : player.boss.hp,
            } };
            if (changed) {
              breakdownRequest.current++;
              setIsGeneratingRoadmap(false);
            }
            commitPlayerChange(next);
            setModal(null);
            if (changed) void runTaskBreakdown(next, true);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'addStep' && player && (
        <AddDreamStepModal
          player={player}
          lang={lang}
          onAdd={(title, skillName, targetMinutes, targetLevel) => {
            const idx = player.dreamSteps.length + 1;
            commitPlayerChange({
              ...player,
              dreamSteps: [
                ...player.dreamSteps,
                {
                  id: `ds_custom_${Date.now()}`,
                  phase: lang === 'id' ? `Tahap ${idx}: Kustom` : `Phase ${idx}: Custom`,
                  title,
                  coachTip:
                    lang === 'id'
                      ? 'Langkah kustom yang disusun langsung untuk impianmu.'
                      : 'Custom milestone tailored to your dream.',
                  targetLevel,
                  studyMinutes: player.dailyBreakdown.study,
                  workMinutes: player.dailyBreakdown.work,
                  targetMinutes,
                  completedMinutes: 0,
                  skillName,
                  completed: false,
                },
              ],
            });
            setModal(null);
            playSFX('click');
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'addQuest' && player && (
        <AddQuestModal
          player={player}
          lang={lang}
          onAdd={(quest) => {
            commitPlayerChange({
              ...player,
              quests: [quest, ...player.quests],
            });
            setModal(null);
            playSFX('click');
            notify(
              lang === 'id' ? `Tugas "${quest.title}" ditambahkan!` : `Added "${quest.title}"!`,
              'success'
            );
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'completeQuest' && player && (
        <CompleteQuestModal
          player={player}
          quest={modal.quest}
          lang={lang}
          coinConfig={coinConfig}
          onConfirm={(qty, rpe, workout) => handleConfirmCompleteQuest(modal.quest, qty, rpe, workout)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'addSkill' && player && (
        <AddSkillModal
          lang={lang}
          onAdd={(name, rank) => {
            commitPlayerChange({
              ...player,
              shadows: [{ name, rank, sessions: 5, totalMinutes: 200 }, ...player.shadows],
            });
            setModal(null);
            playSFX('quest');
            notify(
              lang === 'id' ? `Skill "${name}" ditambahkan!` : `Skill "${name}" added!`,
              'success'
            );
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'addReward' && player && (
        <AddRewardModal
          lang={lang}
          coinSymbol={coinConfig.coinSymbol}
          onAdd={(name, cost, desc) => {
            commitPlayerChange({
              ...player,
              rewards: [...player.rewards, { id: `rew_${Date.now()}`, name, cost, desc }],
            });
            setModal(null);
            playSFX('click');
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'checkIn' && player && !isAdminView && modal.owner === journal.key && (() => {
        const id = modal.dateKey + '-' + modal.phase;
        const saved = journal.records.find((entry): entry is CheckIn => entry.kind === 'checkin' && entry.id === id);
        return <DailyCheckInModal key={journal.key + id} name={player.name} player={player} coinConfig={coinConfig} lang={lang} phase={modal.phase} initial={saved}
          photoKey={'meal:' + journal.key + ':' + id} evidence={getDailyEvidence(journal.records, dailyLogs, modal.dateKey, player.age)}
          previewReflection={(input) => {
            const draft: CheckIn = { ...input, id, dateKey: modal.dateKey, phase: modal.phase, kind: 'checkin', updatedAt: Date.now() };
            return createDailyReflection({ owner: journal.key, player, dateKey: modal.dateKey, phase: modal.phase, now, lang,
              events: calendarEvents, evidence: getDailyEvidence(mergeJournal(journal.records, [draft]), dailyLogs, modal.dateKey, player.age) });
          }}
          onSave={saveCheckIn} onClose={() => setModal(null)} />;
      })()}

      {modal?.type === 'completeDay' && player && (
        <CompleteDayModal
          player={player}
          recentLogs={dailyLogs}
          lang={lang}
          coinConfig={coinConfig}
          onConfirmCompleteDay={handleConfirmCompleteDay}
          onClose={() => setModal(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
