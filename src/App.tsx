import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  AIConfig,
  DailyLogEntry,
  DiscoveredPerk,
  FirebaseRuntimeConfig,
  Language,
  MobileTab,
  NutritionCondition,
  PlayerProfile,
  Quest,
  QuestFilter,
  SharedAIPublicConfig,
  SleepCondition,
  SyncStatus,
  ToastItem,
} from './types';
import {
  applyExpAndLevelUp,
  applyQuestCompletion,
  calculateBiometrics,
  computeDailyDurationBreakdown,
  createInitialPlayerProfile,
  createSyncedQuestsForActiveStep,
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
import {
  discoverPerksAndOpportunities,
  generateAIDreamRoadmap,
  generateAIQuests,
} from './services/aiService';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { AuthView } from './components/AuthView';
import { AdminDashboard } from './components/AdminDashboard';
import { AwakeningView } from './components/AwakeningView';
import { ThreeCoreViewport } from './components/ThreeCoreViewport';
import {
  BioConditionPanel,
  DailyTasksPanel,
  DreamRoadmapPanel,
  PerksAndNewsSection,
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
  PerkDetailModal,
  ResetConfirmModal,
  ScienceModal,
} from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';

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
  | { type: 'editDream' }
  | { type: 'addStep' }
  | { type: 'addQuest' }
  | { type: 'completeQuest'; quest: Quest }
  | { type: 'addSkill' }
  | { type: 'addReward' }
  | { type: 'perkDetail'; perk: DiscoveredPerk }
  | { type: 'completeDay' };

export default function App() {
  const [lang, setLang] = useState<Language>(() => loadSavedLanguage());
  const [player, setPlayer] = useState<PlayerProfile | null>(() =>
    loadLocalPlayer(loadSavedLanguage())
  );
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>(() => loadLocalLogs());
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
    () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnverifiedBootstrapAdmin, setIsUnverifiedBootstrapAdmin] = useState(false);
  const [sharedAIConfig, setSharedAIConfig] = useState<SharedAIPublicConfig | null>(null);

  // AI Loading States
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [isDiscoveringPerks, setIsDiscoveringPerks] = useState(false);

  // Firebase Cloud Sync States
  const [cloudUser, setCloudUser] = useState<User | null>(null);
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

  // Browser back/forward sync for /admin path
  useEffect(() => {
    const onPopState = () => {
      setIsAdminView(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateAdminView = (open: boolean) => {
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
          if (cancelled) return;
          setIsAdmin(adminStatus.isAdmin);
          setIsUnverifiedBootstrapAdmin(adminStatus.isUnverifiedBootstrapAdmin);
          void upsertUserMeta(user, langRef.current, adminStatus.isAdmin).catch(() => {});
        });

        // Subscribe to Admin-configured Shared AI public status
        unsubSharedAI = subscribeSharedAIPublicConfig((cfg) => {
          if (!cancelled) setSharedAIConfig(cfg);
        });

        void fetchRecentDailyLogs(user.uid, 20)
          .then((cloudLogs) => {
            if (!cancelled && cloudLogs.length > 0) {
              setDailyLogs(cloudLogs);
              saveLocalLogs(cloudLogs);
            }
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

  const handleCompleteAwakening = async (input: CreateProfileInput) => {
    const created = createInitialPlayerProfile(input);
    commitPlayerChange(created);
    setMobileTab('status');

    notify(
      lang === 'id'
        ? `Selamat datang ${created.name}! Peta Impian menuju Level ${created.targetLevel} siap!`
        : `Welcome ${created.name}! Your Dream Roadmap to Level ${created.targetLevel} is ready!`,
      'success'
    );

    if (aiConfig.apiKey.trim() || (cloudUser && sharedAIConfig?.enabled && sharedAIConfig?.proxyConfigured)) {
      void runGenerateRoadmap(created, true);
      void runDiscoverPerks(created, true);
    }
  };

  // =========================================================================
  // AI ACTIONS (SHARED ADMIN PROXY -> PERSONAL BYOK -> SMART FALLBACK)
  // =========================================================================
  const runGenerateRoadmap = async (targetPlayer?: PlayerProfile, silent = false) => {
    const active = targetPlayer ?? playerRef.current;
    if (!active) return;

    setIsGeneratingRoadmap(true);
    const res = await generateAIDreamRoadmap(active, lang, aiConfig);
    setIsGeneratingRoadmap(false);

    const latest = playerRef.current ?? active;
    commitPlayerChange({
      ...latest,
      dreamSteps: res.dreamSteps,
      coachAdvice: res.coachAdvice,
    });

    if (!silent) {
      playSFX('quest');
      if (res.usedFallback) {
        notify(
          res.errorMessage
            ? lang === 'id'
              ? `AI info (${res.errorMessage.slice(0, 75)}). Memakai rencana cerdas lokal.`
              : `AI note (${res.errorMessage.slice(0, 75)}). Used smart local planner.`
            : lang === 'id'
              ? 'Rencana cerdas disusun! Masuk akun atau isi Agnes AI API Key di Pengaturan untuk AI Coach penuh.'
              : 'Smart roadmap generated! Sign in or add Agnes AI API Key in Settings for full AI coaching.',
          'info'
        );
      } else {
        const quotaTxt =
          res.viaSharedProxy && typeof res.remainingToday === 'number'
            ? ` (${lang === 'id' ? 'sisa kuota' : 'left'}: ${res.remainingToday})`
            : '';
        notify(
          lang === 'id'
            ? `AI Coach (Agnes AI) berhasil memperbarui Peta Impianmu!${quotaTxt}`
            : `AI Coach (Agnes AI) updated your Dream Roadmap!${quotaTxt}`,
          'success'
        );
      }
    }
  };

  const runGenerateAIQuests = async () => {
    if (!player) return;
    setIsGeneratingQuests(true);
    const res = await generateAIQuests(player, lang, aiConfig);
    setIsGeneratingQuests(false);

    commitPlayerChange({
      ...player,
      quests: res.quests,
    });

    playSFX('quest');
    if (res.usedFallback) {
      notify(
        res.errorMessage
          ? lang === 'id'
            ? `AI info (${res.errorMessage.slice(0, 75)}). Tugas harian dibuat secara lokal.`
            : `AI note (${res.errorMessage.slice(0, 75)}). Generated synced local tasks.`
          : lang === 'id'
            ? 'Tugas harian tersinkronisasi dengan tahap aktifmu!'
            : 'Synced tasks generated for your active milestone!',
        'info'
      );
    } else {
      const quotaTxt =
        res.viaSharedProxy && typeof res.remainingToday === 'number'
          ? ` (${lang === 'id' ? 'sisa kuota' : 'left'}: ${res.remainingToday})`
          : '';
      notify(
        lang === 'id'
          ? `Agnes AI membuat Tugas Harian baru sesuai kondisi tubuh & impianmu!${quotaTxt}`
          : `Agnes AI generated fresh daily tasks matched to your recovery & goal!${quotaTxt}`,
        'success'
      );
    }
  };

  const runDiscoverPerks = async (targetPlayer?: PlayerProfile, silent = false) => {
    const active = targetPlayer ?? playerRef.current;
    if (!active) return;

    setIsDiscoveringPerks(true);
    const res = await discoverPerksAndOpportunities(active, lang, aiConfig);
    setIsDiscoveringPerks(false);

    const latest = playerRef.current ?? active;
    commitPlayerChange({
      ...latest,
      discoveredPerks: res.perks,
      growthNews: res.news,
    });

    if (!silent) {
      playSFX('quest');
      if (res.usedFallback) {
        notify(
          res.errorMessage
            ? lang === 'id'
              ? `AI info (${res.errorMessage.slice(0, 75)}). Menampilkan rekomendasi lokal.`
              : `AI note (${res.errorMessage.slice(0, 75)}). Showing local recommendations.`
            : lang === 'id'
              ? `Menampilkan rekomendasi lokal untuk ${latest.city}.`
              : `Showing curated perks for ${latest.city}.`,
          'info'
        );
      } else {
        notify(
          lang === 'id'
            ? `Berhasil menemukan diskon sekitar ${latest.city}, klaim gratis & peluang baru!`
            : `Found local deals in ${latest.city}, freebies & new opportunities!`,
          'success'
        );
      }
    }
  };

  // =========================================================================
  // GAMEPLAY & PROGRESS HANDLERS
  // =========================================================================
  const handleConfirmCompleteQuest = (quest: Quest, qty: number, rpe: number) => {
    if (!player) return;
    try {
      const { nextPlayer, result, levelsGained, unlockedSkill, autoCompletedStepTitle } =
        applyQuestCompletion(player, quest.id, qty, rpe, lang);

      commitPlayerChange(nextPlayer);
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
      if (step.id !== stepId) return step;
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

    const completedCount = nextSteps.filter((s) => s.completed).length;
    const hp = Math.max(
      0,
      Math.round(
        ((Math.max(1, nextSteps.length) - completedCount) / Math.max(1, nextSteps.length)) *
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
    saveLocalLogs(nextLogs);

    if (cloudUser) {
      void saveDailyLogToCloud(cloudUser.uid, logEntry).catch(() => {});
    }

    const activeStep =
      player.dreamSteps.find((s) => !s.completed) || player.dreamSteps[0];
    const refreshedQuests =
      player.quests.length > 0
        ? player.quests.map((q) => {
            const { completedQty: _cq, completedRpe: _cr, ...cleanQuest } = q;
            return { ...cleanQuest, completed: false };
          })
        : createSyncedQuestsForActiveStep(activeStep, player.dailyBreakdown, lang);

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

  const handleClaimPerk = (perk: DiscoveredPerk) => {
    if (!player) return;
    const cost = perk.cost || 0;
    if (cost > 0 && player.gold < cost) {
      notify(
        lang === 'id'
          ? `Koin belum cukup! Butuh ${cost} CR.`
          : `Not enough coins! Need ${cost} CR.`,
        'warning'
      );
      return;
    }

    if (cost > 0) {
      commitPlayerChange({ ...player, gold: player.gold - cost });
    }
    playSFX('levelup');
    setModal({ type: 'perkDetail', perk });
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

  const handleTurnNewsIntoQuest = (newsIndex: number) => {
    if (!player) return;
    const item = player.growthNews[newsIndex];
    if (!item) return;
    const activeStep = player.dreamSteps.find((s) => !s.completed);
    const nextQuest: Quest = {
      id: `opp_q_${Date.now()}`,
      title:
        item.actionTask ||
        `${lang === 'id' ? 'Pelajari & Terapkan:' : 'Explore & Apply:'} ${item.title}`,
      category: 'STUDY',
      unitType: 'MINUTES',
      defaultQty: 45,
      skillTag: item.tag || 'Riset Peluang Baru',
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
          saveLocalLogs(parsed.dailyLogs);
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
        canInstallPWA={Boolean(installPrompt)}
        onInstallPWA={() => void handleInstallPWA()}
        onOpenScience={() => setModal({ type: 'science' })}
        onOpenSettings={(tab = 'ai') => setModal({ type: 'settings', tab })}
        onOpenReset={() => setModal({ type: 'reset' })}
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
            onContinueOffline={() => {
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
            onCompleteAwakening={(input) => void handleCompleteAwakening(input)}
          />
        ) : (
          <section className="space-y-5">
            {/* ROW 1: STATUS | BODY CONDITION | 3D VIEWPORT */}
            <div
              className={`${
                mobileTab === 'status' ? 'grid' : 'hidden lg:grid'
              } grid-cols-1 lg:grid-cols-12 gap-5`}
            >
              <div className="lg:col-span-4">
                <StatusPanel player={player} lang={lang} />
              </div>
              <div className="lg:col-span-4">
                <BioConditionPanel
                  player={player}
                  lang={lang}
                  onChangeSleep={(sleep: SleepCondition) => {
                    playSFX('click');
                    commitPlayerChange({ ...player, sleepCondition: sleep });
                  }}
                  onChangeNutrition={(nutrition: NutritionCondition) => {
                    playSFX('click');
                    commitPlayerChange({ ...player, nutritionCondition: nutrition });
                  }}
                  onEditBio={() => setModal({ type: 'editBio' })}
                />
              </div>
              <div className="lg:col-span-4">
                <ThreeCoreViewport
                  coreCharge={player.coreCharge}
                  lang={lang}
                  onExtractOverdrive={handleExtractCoreOverdrive}
                />
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
                  onGenerateRoadmap={() => void runGenerateRoadmap()}
                  onEditDream={() => setModal({ type: 'editDream' })}
                  onAddStep={() => setModal({ type: 'addStep' })}
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
                  isGeneratingQuests={isGeneratingQuests}
                  onChangeFilter={(f) => {
                    playSFX('click');
                    setQuestFilter(f);
                  }}
                  onGenerateAIQuests={() => void runGenerateAIQuests()}
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

            {/* ROW 3: REWARD EXCHANGE + GROWTH NEWS */}
            <div className={mobileTab === 'perks' ? 'block' : 'hidden lg:block'}>
              <PerksAndNewsSection
                player={player}
                lang={lang}
                isDiscoveringPerks={isDiscoveringPerks}
                onUpdateCity={(city) => commitPlayerChange({ ...player, city })}
                onUpdateInterest={(rewardInterest) =>
                  commitPlayerChange({ ...player, rewardInterest })
                }
                onDiscoverPerks={() => void runDiscoverPerks()}
                onClaimPerk={handleClaimPerk}
                onBuyReward={handleBuyReward}
                onOpenAddReward={() => setModal({ type: 'addReward' })}
                onTurnNewsIntoQuest={handleTurnNewsIntoQuest}
              />
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
            commitPlayerChange({
              ...player,
              goal,
              targetLevel,
              dailyBreakdown,
              boss: { ...player.boss, name: goal, desc: goal },
            });
            setModal(null);
            playSFX('quest');
            notify(
              lang === 'id'
                ? 'Impian & target waktu diperbarui! Klik RENCANA AI COACH untuk menyelaraskan tahapan.'
                : 'Dream & time targets updated! Click AI COACH PLAN to realign milestones.',
              'success'
            );
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
          onConfirm={(qty, rpe) => handleConfirmCompleteQuest(modal.quest, qty, rpe)}
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

      {modal?.type === 'perkDetail' && (
        <PerkDetailModal perk={modal.perk} lang={lang} onClose={() => setModal(null)} />
      )}

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
