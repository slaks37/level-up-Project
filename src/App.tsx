import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  AIConfig,
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
  ToastItem,
} from './types';
import {
  applyExpAndLevelUp,
  applyQuestCompletion,
  calculateBiometrics,
  computeDailyDurationBreakdown,
  createInitialPlayerProfile,
  createDefaultDreamSteps,
  getTodayDateKey,
  normalizePlayerProfile,
  playSFX,
  setSfxMuted,
  type CreateProfileInput,
} from './engine/science';
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
  fetchRecentDailyLogs,
  initFirebaseFromConfig,
  isFirebaseReady,
  saveDailyLogToCloud,
  saveProfileToCloud,
  subscribeAuth,
  subscribeProfileFromCloud,
  subscribeSharedAIPublicConfig,
  upsertUserMeta,
} from './services/firebaseService';
import { splitRoadmapTasks } from './services/aiService';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { AuthView } from './components/AuthView';
import { AdminDashboard } from './components/AdminDashboard';
import { AwakeningView } from './components/AwakeningView';
import { getActiveDreamStep, getCurrentDreamSteps, getRoadmapActions, planDailyFocus, type DailyTaskSuggestion } from './engine/coaching';
import type { CalendarEvent } from './services/googleCalendar';
import { CareerCoach, CoachSetupModal, GymCoach } from './components/CoachPanels';
import { BodyConditionPanel, DailyCheckInModal, NutritionPanel } from './components/JournalPanels';
import { getDailyEvidence, getGrowthActions, getJournalMoment, type CheckIn, type CheckInInput, type DayPhase } from './engine/journal';
import { useJournal } from './services/useJournal';
import { avatarOwnerKey, deleteAvatarPhoto } from './services/avatarStorage';
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
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';
import { ADMIN_HOST, ADMIN_URL, isAdminPath, PUBLIC_HOST, PUBLIC_URL } from './routes';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type ActiveModal =
  | null
  | { type: 'science' }
  | { type: 'settings'; tab: 'ai' | 'cloud' | 'app' }
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Auth / Admin / Routing States
  const [authResolved, setAuthResolved] = useState(false);
  const [guestMode, setGuestMode] = useState<boolean>(() => Boolean(loadLocalPlayer('id')));
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [isAdminView, setIsAdminView] = useState<boolean>(
    () => isDedicatedAdminHost || isAdminPath(window.location.pathname)
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnverifiedBootstrapAdmin, setIsUnverifiedBootstrapAdmin] = useState(false);
  const [sharedAIConfig, setSharedAIConfig] = useState<SharedAIPublicConfig | null>(null);

  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const breakdownRequest = useRef(0);

  // Firebase Cloud Sync States
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const journal = useJournal(isAdminView ? undefined : cloudUser?.uid);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [firebaseVersion, setFirebaseVersion] = useState(0);

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Refs for clean async sync without echo loops
  const playerRef = useRef<PlayerProfile | null>(player);
  playerRef.current = player;
  const langRef = useRef<Language>(lang);
  langRef.current = lang;
  const cloudUserRef = useRef<User | null>(cloudUser);
  cloudUserRef.current = cloudUser;
  const syncTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    []
  );

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

  // Listen for PWA installability
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      notify(
        langRef.current === 'id'
          ? 'LEVEL UP SYSTEM berhasil terpasang sebagai aplikasi!'
          : 'LEVEL UP SYSTEM installed as an app!',
        'success'
      );
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [notify]);

  // Online / Offline indicator
  useEffect(() => {
    const handleOffline = () => {
      if (cloudUserRef.current) setSyncStatus('offline');
    };
    const handleOnline = () => {
      if (cloudUserRef.current) setSyncStatus('synced');
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const commitPlayerChange = useCallback((next: PlayerProfile) => {
    playerRef.current = next;
    setPlayer(next);
    saveLocalPlayer(next);

    const uid = cloudUserRef.current?.uid;
    if (!uid) return;

    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('syncing');
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      saveProfileToCloud(uid, next)
        .then(() => {
          setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        })
        .catch((err) => {
          console.error('[Cloud Sync] Write error:', err);
          setSyncStatus('error');
        });
    }, 350);
  }, []);

  // Initialize Firebase, Auth Listener, Admin Detection & Shared AI Config
  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;
    let unsubSharedAI: (() => void) | null = null;
    let cancelled = false;
    let activeUid: string | undefined;

    const boot = async () => {
      const ready = await initFirebaseFromConfig();
      if (cancelled) return;
      if (!ready) {
        setCloudUser(null);
        setIsAdmin(false);
        setIsUnverifiedBootstrapAdmin(false);
        setSyncStatus('local');
        setAuthResolved(true);
        return;
      }

      setSyncStatus('connecting');
      unsubAuth = subscribeAuth((user) => {
        if (cancelled) return;
        setCloudUser(user);
        setIsAdmin(false);
        setIsUnverifiedBootstrapAdmin(false);
        activeUid = user?.uid;
        setDailyLogs(loadLocalLogs(activeUid));
        setAuthResolved(true);

        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        if (unsubSharedAI) {
          unsubSharedAI();
          unsubSharedAI = null;
        }

        if (!user) {
          setIsAdmin(false);
          setIsUnverifiedBootstrapAdmin(false);
          setSharedAIConfig(null);
          setSyncStatus('local');
          return;
        }

        setShowAuthScreen(false);
        setSyncStatus(navigator.onLine ? 'syncing' : 'offline');

        // Check Admin privileges & register/update user directory doc
        void checkIsUserAdmin(user).then((adminStatus) => {
          if (cancelled || activeUid !== user.uid) return;
          setIsAdmin(adminStatus.isAdmin);
          setIsUnverifiedBootstrapAdmin(adminStatus.isUnverifiedBootstrapAdmin);
          void upsertUserMeta(user, langRef.current, adminStatus.isAdmin).catch(() => {});
        });

        // Subscribe to Admin-configured Shared AI public status
        unsubSharedAI = subscribeSharedAIPublicConfig((cfg) => {
          if (!cancelled) setSharedAIConfig(cfg);
        });

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

        let firstSnapshotHandled = false;
        unsubProfile = subscribeProfileFromCloud(
          user.uid,
          langRef.current,
          (remoteProfile, fromCache) => {
            if (cancelled) return;
            if (remoteProfile) {
              setPlayer(remoteProfile);
              saveLocalPlayer(remoteProfile);
              setSyncStatus(fromCache && !navigator.onLine ? 'offline' : 'synced');
            } else if (!firstSnapshotHandled && playerRef.current) {
              void saveProfileToCloud(user.uid, playerRef.current)
                .then(() => setSyncStatus('synced'))
                .catch(() => setSyncStatus('error'));
            } else {
              setSyncStatus('synced');
            }
            firstSnapshotHandled = true;
          },
          (err) => {
            console.error('[Cloud Sync] Snapshot error:', err);
            if (!cancelled) setSyncStatus('error');
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
      void upsertUserMeta(cloudUser, nextLang, isAdmin).catch(() => {});
    }
  };

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
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
        notify(lang === 'id' ? 'Langkah dari aplikasi siap dipakai. Agnes sedang belum bisa merinci.' : 'Your local steps are ready. Agnes could not add detail right now.', 'info');
      }
    } finally {
      if (breakdownRequest.current === request) setIsGeneratingRoadmap(false);
    }
  };

  const handleCompleteAwakening = (input: CreateProfileInput) => {
    const created = createInitialPlayerProfile(input);
    commitPlayerChange(created);
    setMobileTab('status');
    notify(
      lang === 'id'
        ? `Selamat datang ${created.name}! Peta Impian menuju Level ${created.targetLevel} siap!`
        : `Welcome ${created.name}! Your Dream Roadmap to Level ${created.targetLevel} is ready!`,
      'success'
    );
    void runTaskBreakdown(created, true);
  };

  // =========================================================================
  // GAMEPLAY & PROGRESS HANDLERS
  // =========================================================================
  const handleConfirmCompleteQuest = (quest: Quest, qty: number, rpe: number, workout?: WorkoutFeedback) => {
    if (!player) return;
    const { dateKey } = getJournalMoment();
    if (workout?.pain && qty <= 0) {
      journal.save({ id: dateKey + '-task-' + encodeURIComponent(quest.id), dateKey, kind: 'activity',
        title: (quest.title + (lang === 'id' ? ' (dihentikan)' : ' (stopped)')).slice(0, 140), category: 'FITNESS',
        minutes: 0, updatedAt: Date.now(), workout });
      setModal(null);
      notify(lang === 'id' ? 'Catatan latihan dan nyeri tersimpan.' : 'Workout and pain notes saved.', 'info');
      return;
    }
    try {
      const { nextPlayer, result, levelsGained, unlockedSkill, autoCompletedStepTitle } =
        applyQuestCompletion(player, quest.id, qty, rpe, lang);

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

      if (levelsGained > 0) {
        playSFX('levelup');
        notify(
          lang === 'id'
            ? `LEVEL UP! Kamu naik ke Level ${nextPlayer.level}! (+${levelsGained * 50} Koin Bonus)`
            : `LEVEL UP! You reached Level ${nextPlayer.level}! (+${levelsGained * 50} Bonus Coins)`,
          'success'
        );
      } else {
        playSFX('quest');
        notify(
          lang === 'id'
            ? `Tugas selesai! +${result.expEarned} EXP • +${result.goldEarned} CR (+${result.loggedMinutes}m)`
            : `Task complete! +${result.expEarned} EXP • +${result.goldEarned} CR (+${result.loggedMinutes}m)`,
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
            ? `Tahap Peta Impian tercapai: "${autoCompletedStepTitle}" (+60 EXP, +50 CR)!`
            : `Dream Milestone achieved: "${autoCompletedStepTitle}" (+60 EXP, +50 CR)!`,
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

    const base: PlayerProfile = {
      ...player,
      coreCharge: 0,
      gold: player.gold + 60,
    };
    const { nextPlayer, levelsGained } = applyExpAndLevelUp(base, 60);
    commitPlayerChange(nextPlayer);
    playSFX('levelup');
    notify(
      levelsGained > 0
        ? lang === 'id'
          ? `OVERDRIVE + LEVEL UP ke Lv.${nextPlayer.level}!`
          : `OVERDRIVE + LEVEL UP to Lv.${nextPlayer.level}!`
        : lang === 'id'
          ? 'OVERDRIVE DIEKSTRAK! +60 EXP & +60 Koin Bonus!'
          : 'OVERDRIVE EXTRACTED! +60 EXP & +60 Bonus Coins!',
      'success'
    );
  };

  const handleToggleDreamStep = (stepId: string) => {
    if (!player) return;
    let newlyCompleted = false;
    const nextSteps = player.dreamSteps.map((step) => {
      if (step.id !== stepId || step.archived) return step;
      const nextDone = !step.completed;
      if (nextDone) newlyCompleted = true;
      return {
        ...step,
        completed: nextDone,
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

    if (newlyCompleted) {
      updated = { ...updated, gold: updated.gold + 50 };
      const expRes = applyExpAndLevelUp(updated, 60);
      updated = expRes.nextPlayer;
      playSFX(expRes.levelsGained > 0 ? 'levelup' : 'quest');
      notify(
        lang === 'id'
          ? 'Tahap Peta Impian tercapai! +60 EXP & +50 CR!'
          : 'Dream Roadmap step complete! +60 EXP & +50 CR!',
        'success'
      );
    } else {
      playSFX('click');
    }

    commitPlayerChange(updated);
  };

  const handleConfirmCompleteDay = () => {
    if (!player) return;
    const completedCount = player.quests.filter((q) => q.completed).length;
    const qualifiesBonus = completedCount >= 2;
    const nextStreak = qualifiesBonus ? player.streak + 1 : player.streak;
    const bonusExp = qualifiesBonus ? 40 : 0;
    const bonusGold = qualifiesBonus ? 40 : 0;

    const logEntry: DailyLogEntry = {
      dateKey: getTodayDateKey(),
      completedTasks: completedCount,
      totalTasks: player.quests.length,
      studyMinutes: player.dailyDurationLog.study,
      workMinutes: player.dailyDurationLog.work,
      fitnessMinutes: player.dailyDurationLog.fitness,
      expEarned: bonusExp,
      goldEarned: bonusGold,
      streakAfter: nextStreak,
      sleepCondition: player.sleepCondition,
      nutritionCondition: player.nutritionCondition,
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
      if (quest.id.startsWith('daily-plan-') || quest.id.startsWith('ai_q_')) return !quest.completed;
      return !player.dreamSteps.some((step) =>
        step.id === quest.dreamStepId && (step.completedActions?.includes(quest.title) || (step.archived && quest.completed)));
    }).map((quest) => {
      const { completedQty: _cq, completedRpe: _cr, ...cleanQuest } = quest;
      return { ...cleanQuest, completed: false };
    });

    const base: PlayerProfile = {
      ...player,
      streak: nextStreak,
      gold: player.gold + bonusGold,
      dailyDurationLog: { study: 0, work: 0, fitness: 0 },
      quests: refreshedQuests,
    };

    const { nextPlayer } = applyExpAndLevelUp(base, bonusExp);
    commitPlayerChange(nextPlayer);
    setModal(null);
    playSFX('levelup');
    notify(
      qualifiesBonus
        ? lang === 'id'
          ? `Hari ditutup! Streak ${nextStreak} hari (+40 EXP, +40 CR). Tugas siap untuk besok!`
          : `Day complete! ${nextStreak}-day streak (+40 EXP, +40 CR). Fresh tasks ready!`
        : lang === 'id'
          ? 'Log harian disimpan dan tugas disegarkan untuk sesi baru!'
          : 'Daily log saved and tasks refreshed for a fresh start!',
      'success'
    );
  };

  const handleBuyReward = (rewardId: string) => {
    if (!player) return;
    const rew = player.rewards.find((r) => r.id === rewardId);
    if (!rew) return;
    if (player.gold < rew.cost) {
      notify(
        lang === 'id'
          ? `Koin belum cukup! Butuh ${rew.cost} CR.`
          : `Not enough coins! Need ${rew.cost} CR.`,
        'warning'
      );
      return;
    }
    commitPlayerChange({ ...player, gold: player.gold - rew.cost });
    playSFX('levelup');
    notify(
      lang === 'id'
        ? `Berhasil menukar "${rew.name}"! Selamat menikmati hadiah kerjamu!`
        : `Redeemed "${rew.name}"! Enjoy your well-earned reward!`,
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
      exp: 45,
      gold: 40,
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
    saveLocalPlayer(null);
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
    if (!cloudUser || !player) return;
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

  const { dateKey, phase } = getJournalMoment(new Date(now));
  const currentCheckInId = dateKey + '-' + phase;
  const hasCheckIn = journal.records.some((entry) => entry.id === currentCheckInId);
  const isPlayerReady = Boolean(player) && authResolved && !isAdminView && !showAuthScreen && journal.ready;
  const missingGym = Boolean(player && !player.gym);
  useEffect(() => {
    if (modal?.type === 'checkIn' && modal.owner !== journal.key) {
      setModal(null);
      return;
    }
    if (!isPlayerReady || modal) return;
    const checkInKey = journal.key + ':' + currentCheckInId;
    if (!hasCheckIn && !promptedCheckIns.current.has(checkInKey)) {
      promptedCheckIns.current.add(checkInKey);
      setModal({ type: 'checkIn', dateKey, phase, owner: journal.key });
      return;
    }
    const gymKey = journal.key + ':' + dateKey;
    if (missingGym && !promptedGym.current.has(gymKey)) {
      promptedGym.current.add(gymKey);
      setModal({ type: 'coachSetup', section: 'gym' });
    }
  }, [isPlayerReady, hasCheckIn, modal, journal.key, currentCheckInId, dateKey, phase, missingGym]);

  const evidence = getDailyEvidence(journal.records, dailyLogs, dateKey, player?.age ?? 18);
  const focus = player ? planDailyFocus(player, evidence, agenda?.owner === journal.key ? agenda.events : [], phase, now, lang) : null;
  const updateAgenda = useCallback((owner: string, events: CalendarEvent[]) => setAgenda({ owner, events }), []);
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
      exp: 30, gold: 20, completed: false,
    });
  };

  const addSuggestedTask = (task: DailyTaskSuggestion) => addCoachQuest({
    id: 'daily-plan-' + crypto.randomUUID(), title: task.title, category: task.category, unitType: 'MINUTES',
    defaultQty: task.minutes, skillTag: task.skill, dreamStepId: task.stepId ?? null, exp: 30, gold: 20, completed: false,
  });

  const openCheckIn = () => setModal({ type: 'checkIn', ...getJournalMoment(), owner: journal.key });
  const saveCheckIn = (input: CheckInInput) => {
    if (modal?.type !== 'checkIn' || modal.owner !== journal.key) return;
    const entry: CheckIn = { ...input, id: modal.dateKey + '-' + modal.phase,
      dateKey: modal.dateKey, phase: modal.phase, kind: 'checkin', updatedAt: Date.now() };
    journal.save(entry);
    setModal(null);
    notify(lang === 'id' ? 'Check-in tersimpan.' : 'Check-in saved.', 'success');
  };

  const avatarOwner = avatarOwnerKey(cloudUser?.uid);
  const canAccessAdmin = isAdmin || isUnverifiedBootstrapAdmin;
  const pendingTasksCount = player ? player.quests.filter((q) => !q.completed).length : 0;

  // Determine whether to show Auth Gate screen
  const shouldShowAuthGate =
    isFirebaseReady() &&
    authResolved &&
    !cloudUser &&
    (showAuthScreen || isAdminView || (!guestMode && !player));

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        lang={lang}
        onChangeLang={handleChangeLang}
        hasPlayer={Boolean(player)}
        syncStatus={syncStatus}
        cloudUser={cloudUser}
        canAccessAdmin={canAccessAdmin}
        isAdminView={isAdminView}
        onToggleAdminView={() => navigateAdminView(!isAdminView)}
        onOpenAuthScreen={() => setShowAuthScreen(true)}
        canInstallPWA={!isDedicatedAdminHost && Boolean(installPrompt)}
        onInstallPWA={() => void handleInstallPWA()}
        onOpenScience={() => setModal({ type: 'science' })}
        onOpenSettings={(tab = 'ai') => setModal({ type: 'settings', tab })}
        onOpenReset={() => setModal({ type: 'reset' })}
        onOpenProfile={() => setModal({ type: 'editBio' })}
      />

      {/* Optional Admin Broadcast Notice */}
      {sharedAIConfig?.maintenanceNotice && !isAdminView && !shouldShowAuthGate && (
        <div className="bg-slate-900 text-sky-100 border-b border-sky-700 px-3 py-1.5 text-center font-mono text-[11px]">
          ⚡ {sharedAIConfig.maintenanceNotice}
        </div>
      )}

      <main
        className={`flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 ${
          player && !isAdminView && !shouldShowAuthGate ? 'pb-24 lg:pb-8' : ''
        }`}
      >
        {isFirebaseReady() && !authResolved ? (
          <div className="max-w-md mx-auto py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-mono text-xs text-slate-600">
              {lang === 'id' ? 'Memeriksa sesi akun Cloud...' : 'Checking Cloud session...'}
            </p>
          </div>
        ) : shouldShowAuthGate ? (
          <AuthView
            lang={lang}
            adminOnly={isAdminView}
            onExit={() => {
              if (isDedicatedAdminHost) {
                navigateAdminView(false);
                return;
              }
              setGuestMode(true);
              setShowAuthScreen(false);
              if (isAdminView) navigateAdminView(false);
            }}
            onNotify={notify}
          />
        ) : isAdminView ? (
          <AdminDashboard
            lang={lang}
            cloudUser={cloudUser}
            isAdmin={isAdmin}
            isUnverifiedBootstrapAdmin={isUnverifiedBootstrapAdmin}
            proxyBaseUrl={aiConfig.proxyBaseUrl || ''}
            onSaveProxyBaseUrl={(url) =>
              handleSaveAIConfig({ ...aiConfig, proxyBaseUrl: url })
            }
            onBackToApp={() => navigateAdminView(false)}
            onNotify={notify}
          />
        ) : !player ? (
          <AwakeningView
            lang={lang}
            isCloudLoggedIn={Boolean(cloudUser)}
            onOpenCloudLogin={() => setShowAuthScreen(true)}
            onCompleteAwakening={handleCompleteAwakening}
          />
        ) : (
          <section className="space-y-5">
            {journal.syncError && <p role="status" className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {lang === 'id' ? 'Jurnal tersimpan di perangkat. Sinkronisasi Cloud sedang bermasalah.' : 'Journal is on this device. Cloud sync is currently unavailable.'}
            </p>}
            {/* ROW 1: STATUS | NUTRITION | ENERGY */}
            <div
              className={`${
                mobileTab === 'status' ? 'grid' : 'hidden lg:grid'
              } grid-cols-1 lg:grid-cols-12 gap-5`}
            >
              <div className="lg:col-span-4">
                <StatusPanel player={player} lang={lang} />
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
                onEdit={() => setModal({ type: 'coachSetup', section: 'career' })} onAdd={addMicroTask} onAgenda={updateAgenda} />
              <GymCoach player={player} lang={lang} evidence={evidence} records={journal.records}
                onEdit={() => setModal({ type: 'coachSetup', section: 'gym' })} onAdd={addCoachQuest} />
            </div>

            {/* ROW 3: REWARD EXCHANGE + GROWTH NEWS */}
            <div className={mobileTab === 'perks' ? 'block' : 'hidden lg:block'}>
              <RewardsAndGrowth player={player} lang={lang}
                actions={getGrowthActions(player, dailyLogs, journal.records, evidence, lang)}
                onBuyReward={handleBuyReward}
                onAddReward={() => setModal({ type: 'addReward' })}
                onAddAction={handleTurnNewsIntoQuest} />
            </div>
          </section>
        )}
      </main>

      {player && !isAdminView && !shouldShowAuthGate && (
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
        <SettingsModal
          initialTab={modal.tab}
          lang={lang}
          aiConfig={aiConfig}
          sharedAIConfig={sharedAIConfig}
          onSaveAIConfig={handleSaveAIConfig}
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
        return <DailyCheckInModal key={journal.key + id} name={player.name} lang={lang} phase={modal.phase} initial={saved}
          photoKey={'meal:' + journal.key + ':' + id} evidence={getDailyEvidence(journal.records, dailyLogs, modal.dateKey, player.age)} onSave={saveCheckIn} onClose={() => setModal(null)} />;
      })()}

      {modal?.type === 'completeDay' && player && (
        <CompleteDayModal
          player={player}
          recentLogs={dailyLogs}
          lang={lang}
          onConfirmCompleteDay={handleConfirmCompleteDay}
          onClose={() => setModal(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
