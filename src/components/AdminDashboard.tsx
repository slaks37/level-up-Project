import { adminRoleLabels, assignableAdminRoles, canAuditUsage, canManageRoles, canOperateUsers, type AdminRole, type AssignableAdminRole } from '../engine/access';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Coins,
  Cpu,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  MailCheck,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Shield,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AIUsageLogRecord,
  CoinEconomyConfig,
  Language,
  SharedAIPublicConfig,
  UserAccountRecord,
} from '../types';
import {
  fetchAdminRoleGrants,
  setAdminRoleGrant,
  type AdminRoleGrant,
  fetchAdminAISecret,
  fetchAdminUsageLogs,
  fetchAllUsersForAdmin,
  fetchCoinEconomyConfig,
  fetchCoinPartnerSecret,
  fetchParticipantFullRecord,
  fetchSharedAIPublicConfig,
  reloadCurrentUser,
  resetUserDailyQuota,
  saveAdminSharedAIConfig,
  saveCoinEconomyConfig,
  saveCoinPartnerSecret,
  sendCurrentUserVerificationEmail,
  updateUserStatusByAdmin,
  type ParticipantFullRecord,
} from '../services/firebaseService';
import { DEFAULT_COIN_ECONOMY } from '../engine/science';
import { AdminParticipantInspector } from './AdminParticipantInspector';
import {
  AGNES_PRESET_MODELS,
  checkProxyServerHealth,
  fetchProxyAdminConfig,
  fetchProxyUsageLogs,
  testProxyAdminAI,
  type ProxyHealthResponse,
} from '../services/aiService';

interface AdminDashboardProps {
  lang: Language;
  cloudUser: User | null;
  adminRole: AdminRole | null;
  isUnverifiedBootstrapAdmin: boolean;
  proxyBaseUrl: string;
  onSaveProxyBaseUrl: (url: string) => void;
  onBackToApp: () => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  cloudUser,
  adminRole,
  isUnverifiedBootstrapAdmin,
  proxyBaseUrl,
  onSaveProxyBaseUrl,
  onBackToApp,
  onNotify,
}) => {
  const canConfigure = canManageRoles(adminRole);
  const canOperate = canOperateUsers(adminRole);
  const canAudit = canAuditUsage(adminRole);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Proxy & Shared AI state
  const [localProxyUrl, setLocalProxyUrl] = useState(proxyBaseUrl);
  const [proxyHealth, setProxyHealth] = useState<ProxyHealthResponse | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://apihub.agnes-ai.com/v1');
  const [model, setModel] = useState('agnes-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [maskedServerKey, setMaskedServerKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [maintenanceNotice, setMaintenanceNotice] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Users & Logs state
  const [users, setUsers] = useState<UserAccountRecord[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [roleToAssign, setRoleToAssign] = useState<AssignableAdminRole>('operator');
  const [roleGrants, setRoleGrants] = useState<AdminRoleGrant[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(canConfigure);
  const [roleError, setRoleError] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const changeAdminRole = async (email: string, role: AssignableAdminRole | null) => {
    if (!cloudUser || !canConfigure || savingAccess) return;
    setSavingAccess(true);
    try {
      await setAdminRoleGrant(cloudUser, email, role);
      const normalized = email.trim().toLowerCase();
      setRoleGrants((current) => {
        const next = current.filter((entry) => entry.email !== normalized);
        if (role) next.push({ email: normalized, role });
        return next.sort((left, right) => left.email.localeCompare(right.email));
      });
      if (normalized === adminEmail.trim().toLowerCase()) setAdminEmail('');
      onNotify(lang === 'id' ? 'Akses admin diperbarui.' : 'Admin access updated.', 'success');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setSavingAccess(false);
    }
  };
  useEffect(() => {
    if (!canConfigure || !cloudUser) return;
    let active = true;
    setLoadingRoles(true);
    setRoleError(false);
    void fetchAdminRoleGrants().then((grants) => { if (active) setRoleGrants(grants); })
      .catch(() => { if (active) setRoleError(true); }).finally(() => { if (active) setLoadingRoles(false); });
    return () => { active = false; };
  }, [cloudUser, canConfigure]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'alerts' | 'streaks'>('all');
  const [usageLogs, setUsageLogs] = useState<AIUsageLogRecord[]>([]);
  const [publicCfg, setPublicCfg] = useState<SharedAIPublicConfig | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Coin Economy & Partner (MyValue) Config state
  const [coinConfig, setCoinConfig] = useState<CoinEconomyConfig>({ ...DEFAULT_COIN_ECONOMY });
  const [partnerMerchantId, setPartnerMerchantId] = useState('');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [partnerWebhookSecret, setPartnerWebhookSecret] = useState('');
  const [showPartnerSecrets, setShowPartnerSecrets] = useState(false);
  const [savingCoinsConfig, setSavingCoinsConfig] = useState(false);

  // Participant Deep Inspector state
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ParticipantFullRecord | null>(null);
  const [loadingInspector, setLoadingInspector] = useState(false);

  const openParticipantInspector = useCallback(
    async (uid: string) => {
      setSelectedUserUid(uid);
      setLoadingInspector(true);
      try {
        const rec = await fetchParticipantFullRecord(uid, lang);
        setSelectedRecord(rec);
      } catch (err) {
        onNotify(err instanceof Error ? err.message : String(err), 'error');
      } finally {
        setLoadingInspector(false);
      }
    },
    [lang, onNotify]
  );

  const loadAdminData = useCallback(async () => {
    if (!cloudUser || !adminRole) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const errors: string[] = [];
      const [pub, secret, allUsers, fsLogs, health, coinCfg, partnerSec] = await Promise.all([
        fetchSharedAIPublicConfig().catch((e) => {
          errors.push(`appConfig: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        }),
        canConfigure ? fetchAdminAISecret().catch((e) => {
          errors.push(`adminSecrets: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        }) : Promise.resolve(null),
        fetchAllUsersForAdmin().catch((e) => {
          errors.push(`users: ${e instanceof Error ? e.message : String(e)}`);
          return [];
        }),
        canAudit ? fetchAdminUsageLogs(40).catch(() => []) : Promise.resolve([]),
        checkProxyServerHealth(localProxyUrl).catch(() => null),
        fetchCoinEconomyConfig().catch(() => ({ ...DEFAULT_COIN_ECONOMY })),
        canConfigure ? fetchCoinPartnerSecret().catch(() => null) : Promise.resolve(null),
      ]);
      if (errors.length > 0) setLoadError(errors.join(' | '));

      setPublicCfg(pub);
      setUsers(allUsers);
      setProxyHealth(health);
      setCoinConfig(coinCfg);
      if (partnerSec) {
        setPartnerMerchantId(partnerSec.merchantId || '');
        setPartnerApiKey(partnerSec.apiKey || '');
        setPartnerWebhookSecret(partnerSec.webhookSecret || '');
      }

      if (secret) {
        setBaseUrl(secret.baseUrl || 'https://apihub.agnes-ai.com/v1');
        setModel(secret.model || 'agnes-2.5-flash');
        setApiKey(secret.apiKey || '');
        setEnabled(secret.enabled);
        setDailyLimit(secret.dailyLimit);
      } else if (pub) {
        setModel(pub.model || 'agnes-2.5-flash');
        setEnabled(pub.enabled);
        setDailyLimit(pub.dailyLimit);
        setMaintenanceNotice(pub.maintenanceNotice || '');
      }

      if (pub?.maintenanceNotice) {
        setMaintenanceNotice(pub.maintenanceNotice);
      }

      // Also check live Express Proxy config & logs if online
      if (health?.ok && canConfigure) {
        const idToken = await cloudUser.getIdToken();
        const serverCfg = await fetchProxyAdminConfig(localProxyUrl, idToken).catch(() => null);
        if (serverCfg) {
          setMaskedServerKey(serverCfg.apiKeyMasked || '');
          if (!secret) {
            setBaseUrl(serverCfg.baseUrl || 'https://apihub.agnes-ai.com/v1');
            setModel(serverCfg.model || 'agnes-2.5-flash');
            setEnabled(serverCfg.enabled);
            setDailyLimit(serverCfg.dailyLimit);
            setMaintenanceNotice(serverCfg.maintenanceNotice || '');
          }
        }
        const proxyLogs = await fetchProxyUsageLogs(localProxyUrl, idToken).catch(() => []);
        setUsageLogs(fsLogs.length > 0 ? fsLogs : proxyLogs);
      } else {
        setUsageLogs(fsLogs);
      }
    } finally {
      setLoading(false);
    }
  }, [cloudUser, adminRole, canConfigure, canAudit, localProxyUrl]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleSaveCoinEconomy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUser || !canConfigure) return;
    setSavingCoinsConfig(true);
    try {
      await saveCoinEconomyConfig(cloudUser, {
        coinName: coinConfig.coinName,
        coinSymbol: coinConfig.coinSymbol,
        pointPerTask: coinConfig.pointPerTask,
        pointPerWorkout: coinConfig.pointPerWorkout,
        pointPerCheckIn: coinConfig.pointPerCheckIn,
        pointPerMilestone: coinConfig.pointPerMilestone,
        pointPerOverdrive: coinConfig.pointPerOverdrive,
        pointPerDayClear: coinConfig.pointPerDayClear,
        pointPerLevelUp: coinConfig.pointPerLevelUp,
        startingCoins: coinConfig.startingCoins,
        idrPerCoin: coinConfig.idrPerCoin,
        partnerName: coinConfig.partnerName,
        partnerEnabled: coinConfig.partnerEnabled,
        partnerEndpoint: coinConfig.partnerEndpoint,
        minRedeemCoins: coinConfig.minRedeemCoins,
        transactionNote: coinConfig.transactionNote,
      });
      await saveCoinPartnerSecret(cloudUser, {
        partnerName: coinConfig.partnerName,
        merchantId: partnerMerchantId,
        apiEndpoint: coinConfig.partnerEndpoint,
        apiKey: partnerApiKey,
        webhookSecret: partnerWebhookSecret,
      });
      onNotify(
        lang === 'id'
          ? 'Pengaturan Koin Hadiah & Integrasi Transaksi berhasil disimpan!'
          : 'Reward Coin Economy & Partner Integration settings saved!',
        'success'
      );
      await loadAdminData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSavingCoinsConfig(false);
    }
  };

  const handleSaveSharedConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUser || !canConfigure) return;
    setSaving(true);
    setTestResult(null);

    try {
      onSaveProxyBaseUrl(localProxyUrl.trim());
      const cleanBase = baseUrl.trim() || 'https://apihub.agnes-ai.com/v1';
      const cleanModel = model.trim() || 'agnes-2.5-flash';
      const cleanKey = apiKey.trim();

      // 1. Save to Firestore (adminSecrets/aiProvider + appConfig/aiPublic)
      await saveAdminSharedAIConfig(cloudUser, {
        baseUrl: cleanBase,
        model: cleanModel,
        apiKey: cleanKey,
        enabled,
        dailyLimit,
        maintenanceNotice: maintenanceNotice.trim(),
      });

      const health = await checkProxyServerHealth(localProxyUrl.trim());
      onNotify(
        health?.sharedAiConfigured
          ? (lang === 'id' ? 'Tersimpan. Proxy produksi membaca pengaturan Agnes dari Firestore.' : 'Saved. The production proxy reads Agnes settings from Firestore.')
          : (lang === 'id' ? 'Pengaturan tersimpan. Proxy Agnes belum terhubung.' : 'Settings saved. The Agnes proxy is unavailable.'),
        health?.sharedAiConfigured ? 'success' : 'warning',
      );
      await loadAdminData();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestServerAI = async () => {
    if (!cloudUser) return;
    setTesting(true);
    setTestResult(null);
    try {
      const idToken = await cloudUser.getIdToken();
      const res = await testProxyAdminAI(localProxyUrl.trim(), idToken, {});
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `${res.reply || 'OK'} (${res.latencyMs || 0}ms via Server Proxy)`,
        });
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Server test failed',
        });
      }
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : 'Server test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleUserStatus = async (target: UserAccountRecord) => {
    if (!canOperate) return;
    const nextStatus = target.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserStatusByAdmin(target.ownerUid, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.ownerUid === target.ownerUid ? { ...u, status: nextStatus } : u))
      );
      onNotify(
        `${target.email || target.displayName} → ${nextStatus.toUpperCase()}`,
        'success'
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleResetQuota = async (target: UserAccountRecord) => {
    if (!canOperate) return;
    try {
      await resetUserDailyQuota(target.ownerUid);
      setUsers((prev) =>
        prev.map((u) => (u.ownerUid === target.ownerUid ? { ...u, aiRequestsToday: 0 } : u))
      );
      onNotify(
        lang === 'id'
          ? `Kuota harian ${target.email} direset ke 0.`
          : `Reset daily quota for ${target.email}.`,
        'success'
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleSendVerifyEmail = async () => {
    setSendingVerify(true);
    try {
      await sendCurrentUserVerificationEmail();
      onNotify(
        lang === 'id'
          ? 'Email verifikasi dikirim! Klik tautan di inbox lalu refresh halaman ini.'
          : 'Verification email sent! Click the link in your inbox then refresh.',
        'success'
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSendingVerify(false);
    }
  };

  if (!cloudUser || (!adminRole && !isUnverifiedBootstrapAdmin)) {
    return (
      <section className="max-w-lg mx-auto py-8">
        <div className="anime-panel p-6 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="font-hud font-bold text-xl text-slate-900">
            {lang === 'id' ? 'AKSES ADMIN DITOLAK' : 'ADMIN ACCESS DENIED'}
          </h2>
          <p className="text-xs text-slate-600">
            {lang === 'id'
              ? 'Halaman ini hanya dapat diakses oleh akun Admin terverifikasi.'
              : 'This console is restricted to verified Admin accounts.'}
          </p>
          <button
            type="button"
            onClick={onBackToApp}
            className="px-4 py-2 rounded bg-slate-900 text-white font-hud font-bold text-xs uppercase btn-anime"
          >
            {lang === 'id' ? 'KEMBALI KE DASHBOARD' : 'BACK TO DASHBOARD'}
          </button>
        </div>
      </section>
    );
  }

  if (isUnverifiedBootstrapAdmin && !adminRole) {
    return (
      <section className="max-w-lg mx-auto py-8">
        <div className="anime-panel p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-800">
            <MailCheck className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h2 className="font-hud font-bold text-lg text-slate-900">
                {lang === 'id'
                  ? 'VERIFIKASI EMAIL ADMIN DIPERLUKAN'
                  : 'ADMIN EMAIL VERIFICATION REQUIRED'}
              </h2>
              <p className="text-xs text-slate-600">
                {cloudUser.email}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {lang === 'id'
              ? 'Demi keamanan Firestore Rules, akses Super Admin untuk login Email/Password memerlukan email terverifikasi (atau langsung login menggunakan tombol Google). Klik tombol di bawah untuk mengirim link verifikasi ke inbox kamu.'
              : 'For Firestore Security Rules protection, Email/Password Super Admin access requires a verified email (or sign in via Google). Click below to send a verification email.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sendingVerify}
              onClick={handleSendVerifyEmail}
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-hud font-bold text-xs uppercase btn-anime flex items-center gap-1.5"
            >
              {sendingVerify && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{lang === 'id' ? 'KIRIM EMAIL VERIFIKASI' : 'SEND VERIFICATION EMAIL'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await reloadCurrentUser();
                window.location.reload();
              }}
              className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-800 font-hud font-bold text-xs uppercase btn-anime"
            >
              {lang === 'id' ? 'SUDAH VERIFIKASI (REFRESH)' : 'I VERIFIED (REFRESH)'}
            </button>
            <button
              type="button"
              onClick={onBackToApp}
              className="px-3 py-2 rounded text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              {lang === 'id' ? 'Kembali' : 'Back'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const filteredUsers = users.filter((u) => {
    const t = u.telemetry;
    if (userFilter === 'alerts' && !(t?.hasPainAlert || t?.projectBlocked || (t?.lastSleepHours !== null && t?.lastSleepHours !== undefined && t.lastSleepHours < 7))) {
      return false;
    }
    if (userFilter === 'streaks' && !((t?.streak ?? 0) > 0 || (t?.taskStreak ?? 0) > 0 || (t?.workoutStreak ?? 0) > 0)) {
      return false;
    }
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (t?.profession || '').toLowerCase().includes(q) ||
      (t?.goal || '').toLowerCase().includes(q)
    );
  });

  const selectedUser = selectedUserUid ? users.find((u) => u.ownerUid === selectedUserUid) || null : null;
  const totalAIRequests = users.reduce((sum, u) => sum + (u.aiTotalRequests || 0), 0);
  const activeUsersCount = users.filter((u) => u.status !== 'suspended').length;
  const totalCoinsCirculating = users.reduce((sum, u) => sum + (u.telemetry?.gold || 0), 0);
  const activeStreakUsersCount = users.filter(
    (u) => (u.telemetry?.streak || 0) > 0 || (u.telemetry?.taskStreak || 0) > 0 || (u.telemetry?.workoutStreak || 0) > 0
  ).length;
  const alertUsersCount = users.filter(
    (u) => u.telemetry?.hasPainAlert || u.telemetry?.projectBlocked
  ).length;
  const symbol = coinConfig.coinSymbol || 'KOIN';

  return (
    <section className="space-y-5 pb-10">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToApp}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-hud font-bold text-xs flex items-center gap-1.5 btn-anime"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'KEMBALI KE APP' : 'BACK TO APP'}</span>
          </button>
          <div>
            <h1 className="font-hud font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <span>ADMIN CONTROL CENTER</span>
            </h1>
            <p className="font-mono text-[10px] text-slate-500">
              {adminRole ? adminRoleLabels[adminRole] : ''} · {cloudUser.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData()}
          className="px-3 py-1.5 rounded bg-slate-900 hover:bg-sky-700 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 btn-anime"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'id' ? 'REFRESH DATA' : 'REFRESH DATA'}</span>
        </button>
      </div>

      {/* Telemetry Cards */}
      {loadError && (
        <div className="p-3 rounded bg-rose-50 border border-rose-300 text-xs text-rose-800 font-mono">
          Firestore Diagnostic: {loadError}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            TOTAL PESERTA
          </span>
          <p className="font-hud font-bold text-2xl text-slate-900 mt-1">{users.length}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">
            {activeUsersCount} {lang === 'id' ? 'aktif' : 'active'}
          </p>
        </div>

        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            TOTAL {symbol}
          </span>
          <p className="font-hud font-bold text-2xl text-amber-800 mt-1">{totalCoinsCirculating}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {coinConfig.partnerName || 'MyValue'} · {coinConfig.partnerEnabled ? 'AKTIF' : 'SIAP'}
          </p>
        </div>

        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            STREAK AKTIF
          </span>
          <p className="font-hud font-bold text-2xl text-orange-700 mt-1">{activeStreakUsersCount}</p>
          <p className="text-[11px] text-slate-500">
            {alertUsersCount > 0 ? `⚠️ ${alertUsersCount} perlu perhatian` : (lang === 'id' ? 'Semua aman' : 'All healthy')}
          </p>
        </div>

        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-orange-600" />
            TOTAL AI CALLS
          </span>
          <p className="font-hud font-bold text-2xl text-slate-900 mt-1">{totalAIRequests}</p>
          <p className="text-[11px] text-slate-500">
            {lang === 'id' ? 'Kuota:' : 'Quota:'} {dailyLimit}/hari/user
          </p>
        </div>

        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            SHARED AGNES AI
          </span>
          <p
            className={`font-hud font-bold text-lg mt-1 ${
              enabled && (apiKey || proxyHealth?.sharedAiConfigured)
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {enabled && (apiKey || proxyHealth?.sharedAiConfigured) ? 'ACTIVE' : 'NOT READY'}
          </p>
          <p className="font-mono text-[10px] text-slate-500 truncate">
            {publicCfg?.model || model}
          </p>
        </div>

        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            PROXY SERVER
          </span>
          <p
            className={`font-hud font-bold text-lg mt-1 ${
              proxyHealth?.ok ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {proxyHealth?.ok ? 'ONLINE' : 'OFFLINE'}
          </p>
          <p className="font-mono text-[10px] text-slate-500 truncate">
            {proxyHealth?.ok ? proxyHealth.proxyMode : 'npm run dev:server'}
          </p>
        </div>
      </div>

      {/* Selected Participant Deep Inspector (Records, Habits, Tendencies & Coin Editing) */}
      {selectedUser && (
        <AdminParticipantInspector
          user={selectedUser}
          record={selectedRecord}
          loading={loadingInspector}
          lang={lang}
          coinConfig={coinConfig}
          adminUser={cloudUser}
          canEditCoins={canConfigure}
          onRefresh={() => openParticipantInspector(selectedUser.ownerUid)}
          onCoinUpdated={(uid, nextBalance) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.ownerUid === uid && u.telemetry
                  ? { ...u, telemetry: { ...u.telemetry, gold: nextBalance } }
                  : u
              )
            );
          }}
          onNotify={onNotify}
          onClose={() => {
            setSelectedUserUid(null);
            setSelectedRecord(null);
          }}
        />
      )}

      {/* Main Grid: Shared AI Config + Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {canConfigure && <section className="lg:col-span-12 anime-panel overflow-hidden">
          <h2 className="blender-bar px-4 py-2 font-mono text-xs font-bold">{lang === 'id' ? 'PERAN & IZIN ADMIN' : 'ADMIN ROLES & PERMISSIONS'}</h2>
          <div className="space-y-4 p-4 text-xs">
            <dl className="grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Admin', id: 'Kelola peran, pengguna, kuota, audit, dan konfigurasi Agnes.', en: 'Manage roles, users, quota, audit, and Agnes settings.' },
                { label: 'Operator', id: 'Kelola status dan reset kuota akun player.', en: 'Manage player status and reset player quotas.' },
                { label: 'Auditor', id: 'Baca direktori pengguna dan log penggunaan AI.', en: 'Read the user directory and AI usage logs.' },
              ].map((role) => <div className="rounded border border-slate-200 bg-slate-50 p-2" key={role.label}>
                <dt className="font-semibold">{role.label}</dt><dd className="mt-0.5 text-slate-700">{role[lang]}</dd>
              </div>)}
            </dl>
            <p className="text-slate-600">{lang === 'id' ? 'Akses aktif saat email tersebut masuk dengan akun Level Up yang telah terverifikasi.' : 'The email gains access once it signs in with a verified Level Up account.'}</p>
            <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" onSubmit={(event) => {
              event.preventDefault();
              void changeAdminRole(adminEmail, roleToAssign);
            }}>
              <input type="email" required maxLength={254} aria-label={lang === 'id' ? 'Email untuk akses admin' : 'Email for admin access'} value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)} className="rounded border border-slate-300 px-2 py-2 text-sm" placeholder="nama@contoh.com" />
              <select aria-label={lang === 'id' ? 'Pilih peran' : 'Choose a role'} value={roleToAssign}
                onChange={(event) => setRoleToAssign(event.target.value as AssignableAdminRole)} className="rounded border border-slate-300 px-2 py-2">
                {assignableAdminRoles.map((role) => <option key={role} value={role}>{adminRoleLabels[role]}</option>)}
              </select>
              <button type="submit" disabled={savingAccess || loadingRoles} className="rounded bg-slate-900 px-3 py-2 font-bold text-white">{lang === 'id' ? 'Simpan peran' : 'Save role'}</button>
            </form>
            {roleError && <p role="alert" className="text-red-700">{lang === 'id' ? 'Daftar peran belum bisa dimuat. Muat ulang halaman.' : 'The role list could not be loaded. Reload the page.'}</p>}
            {roleGrants.map(({ email, role }) => <div key={email} className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
              <span className="min-w-0 flex-1 break-all font-medium">{email}</span>
              {email === cloudUser.email?.toLowerCase() ? <span>{adminRoleLabels[role]}</span> : <>
                <select aria-label={(lang === 'id' ? 'Peran untuk ' : 'Role for ') + email} value={role} disabled={savingAccess}
                  onChange={(event) => void changeAdminRole(email, event.target.value as AssignableAdminRole)}
                  className="rounded border border-slate-300 px-2 py-1">
                  {assignableAdminRoles.map((option) => <option key={option} value={option}>{adminRoleLabels[option]}</option>)}
                </select>
                <button type="button" disabled={savingAccess} onClick={() => void changeAdminRole(email, null)}
                  className="rounded border border-red-200 px-2 py-1 font-semibold text-red-800">{lang === 'id' ? 'Cabut akses' : 'Revoke access'}</button>
              </>}
            </div>)}
          </div>
        </section>}

        {/* LEFT: Shared Agnes AI Vault & Proxy Settings (7 cols) */}
        {canConfigure && <div className="lg:col-span-7 anime-panel overflow-hidden">
          <div className="blender-bar px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-orange-600" />
              SHARED AGNES AI API KEY & QUOTA CONTROL (SERVER-SIDE VAULT)
            </span>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              ZERO CLIENT LEAK
            </span>
          </div>

          <form onSubmit={handleSaveSharedConfig} className="p-4 space-y-3.5 text-xs">
            <div className="p-3 rounded bg-sky-50 border border-sky-200 text-sky-900">
              <p className="font-bold">
                {lang === 'id'
                  ? 'Bagaimana semua user memakai API Key kamu secara aman?'
                  : 'How do all users safely use your API key?'}
              </p>
              <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                {lang === 'id'
                  ? 'API Key Agnes AI disimpan hanya di Firestore adminSecrets (khusus Admin) & Server Proxy. Browser user biasa tidak pernah menerima API Key asli — permintaan AI diteruskan aman lewat server dengan batas kuota harian.'
                  : 'Your Agnes AI key is stored only in Admin-only Firestore secrets & the Proxy Server. Regular user browsers never see the raw key — AI requests are proxied server-side with daily quota limits.'}
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">
                  {lang === 'id'
                    ? 'Aktifkan Shared AI untuk Semua User'
                    : 'Enable Shared AI for All Users'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'id'
                    ? 'Matikan sementara jika kuota API sedang habis atau maintenance.'
                    : 'Toggle off anytime during maintenance or quota pause.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Proxy Server URL (Opsional / Prod)
                </label>
                <input
                  type="text"
                  value={localProxyUrl}
                  onChange={(e) => setLocalProxyUrl(e.target.value)}
                  placeholder="/api (lokal) atau https://level-up-ai-proxy.onrender.com"
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'id' ? 'Batas Kuota Harian / User' : 'Daily Limit / User'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Agnes AI Base URL (OpenAI Standard)
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Model</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {AGNES_PRESET_MODELS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setModel(preset.id)}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border transition ${
                    model === preset.id
                      ? 'bg-slate-900 text-orange-400 border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Shared Agnes AI API Key (Bearer Token)
                </label>
                {maskedServerKey && (
                  <span className="font-mono text-[10px] text-emerald-700">
                    Server key: {maskedServerKey}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-... / agnes-..."
                  autoComplete="off"
                  className="w-full pl-3 pr-10 py-2 rounded border border-slate-300 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-900"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {lang === 'id'
                  ? 'Pesan Pengumuman / Maintenance (Opsional)'
                  : 'Maintenance / Broadcast Notice (Optional)'}
              </label>
              <input
                type="text"
                maxLength={300}
                value={maintenanceNotice}
                onChange={(e) => setMaintenanceNotice(e.target.value)}
                placeholder={
                  lang === 'id'
                    ? 'Contoh: Shared Agnes AI aktif gratis 20x/hari untuk semua member!'
                    : 'Example: Free Shared Agnes AI enabled (20 requests/day)!'
                }
                className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
              />
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded border font-mono text-[11px] ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {testResult.ok ? '✓ ' : '✗ '}
                {testResult.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={testing}
                onClick={() => void handleTestServerAI()}
                className="py-2.5 px-3 rounded border border-sky-400 bg-sky-50 hover:bg-sky-100 text-sky-800 font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'id' ? 'TES KONEKSI SERVER AI' : 'TEST SERVER AI'}</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-3 rounded bg-slate-900 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-orange-400" />
                )}
                <span>
                  {lang === 'id'
                    ? 'SIMPAN PENGATURAN'
                    : 'SAVE SETTINGS'}
                </span>
              </button>
            </div>
          </form>
        </div>}

        {/* RIGHT: AI Usage Audit Logs (5 cols) */}
        {canAudit && <div className={`anime-panel flex flex-col overflow-hidden ${canConfigure ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="blender-bar px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-sky-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              AI USAGE AUDIT LOGS (REAL-TIME)
            </span>
            <span className="font-mono text-[9px] text-slate-500">
              {usageLogs.length} entries
            </span>
          </div>

          <div className="p-4 flex-grow space-y-2 max-h-[460px] overflow-y-auto">
            {usageLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                {lang === 'id'
                  ? 'Belum ada log pemakaian AI lewat Proxy Server.'
                  : 'No proxied AI usage logs recorded yet.'}
              </p>
            ) : (
              usageLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {log.email || log.uid}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500 truncate">
                      {log.feature} • {log.model} • {log.latencyMs}ms
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                      log.status === 'ok'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.status === 'quota_exceeded'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>}
      </div>

      {/* User Management, Records, Habits & Coins Directory */}
      <div className="anime-panel overflow-hidden">
        <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            {lang === 'id'
              ? 'DIREKTORI PESERTA, REKAM CATATAN, KEBIASAAN & KOIN'
              : 'PARTICIPANT DIRECTORY, RECORDS, HABITS & COINS'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {([
                ['all', lang === 'id' ? 'Semua' : 'All'],
                ['streaks', lang === 'id' ? 'Streak Aktif' : 'Active Streaks'],
                ['alerts', lang === 'id' ? 'Perlu Perhatian' : 'Alerts'],
              ] as const).map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUserFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    userFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-sky-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={lang === 'id' ? 'Cari nama, email, profesi...' : 'Search name, email, role...'}
                className="w-full pl-8 pr-2.5 py-1 rounded bg-white border border-slate-300 text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-2.5">{lang === 'id' ? 'Peserta' : 'Participant'}</th>
                <th className="px-3 py-2.5">{coinConfig.coinName}</th>
                <th className="px-3 py-2.5">Streak (H / T / W)</th>
                <th className="px-3 py-2.5">{lang === 'id' ? 'Kebiasaan & Sinyal' : 'Habits & Signals'}</th>
                <th className="px-3 py-2.5">Role / Status</th>
                <th className="px-3 py-2.5">AI</th>
                <th className="px-4 py-2.5 text-right">{lang === 'id' ? 'Aksi' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400 italic">
                    {lang === 'id' ? 'Belum ada peserta yang cocok.' : 'No matching participants found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const grantRole = canConfigure ? roleGrants.find((grant) => grant.email === u.email.toLowerCase())?.role : undefined;
                  const displayedRole = grantRole || u.role;
                  const t = u.telemetry;
                  const isSelected = selectedUserUid === u.ownerUid;
                  return (
                    <tr key={u.ownerUid} className={isSelected ? 'bg-sky-50' : 'hover:bg-slate-50/70'}>
                      <td className="px-4 py-2.5">
                        <p className="font-hud font-bold text-slate-900">
                          {t?.name || u.displayName}
                          {t ? <span className="ml-1.5 font-mono text-[10px] text-orange-700">Lv.{t.level}</span> : null}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">{u.email}</p>
                        {t?.profession && (
                          <p className="text-[10px] text-slate-600 truncate max-w-[200px]">{t.profession}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        <span className="font-bold text-amber-800">
                          {t ? `${t.gold} ${symbol}` : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        {t ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-orange-700">🔥 {t.streak}h</span>
                            <span className="block text-[10px] text-slate-600">
                              Tugas {t.taskStreak}h · Workout {t.workoutStreak}h
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">
                        {t ? (
                          <div className="space-y-0.5">
                            <p className="text-slate-700">
                              {t.completedTasksTotal} tugas · {t.completedWorkoutsTotal} workout
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {t.lastMood ? `Mood: ${t.lastMood}` : ''}
                              {t.lastSleepHours !== null ? ` · Tidur ${t.lastSleepHours}j` : ''}
                              {t.lastActiveDate ? ` · ${t.lastActiveDate}` : ''}
                            </p>
                            {(t.hasPainAlert || t.projectBlocked) && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {t.hasPainAlert && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Nyeri Latihan
                                  </span>
                                )}
                                {t.projectBlocked && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                                    Proyek Terhambat
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {lang === 'id' ? 'Klik Detail untuk muat data' : 'Click Inspect to load'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 space-y-1">
                        <span
                          className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            u.role === 'admin'
                              ? 'bg-slate-900 text-orange-400'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayedRole === 'user' ? 'Player' : adminRoleLabels[displayedRole]}
                        </span>
                        <span
                          className={`ml-1 inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            u.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                        <span>{u.aiRequestsToday}/{dailyLimit}</span>
                        <span className="block text-[10px] text-slate-400">Tot: {u.aiTotalRequests}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openParticipantInspector(u.ownerUid)}
                            className="px-2.5 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white font-hud font-bold text-[10px] uppercase flex items-center gap-1"
                            title={lang === 'id' ? 'Lihat seluruh catatan, kebiasaan & edit koin peserta' : 'Inspect records, habits & edit coins'}
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>{lang === 'id' ? 'Detail & Koin' : 'Inspect'}</span>
                          </button>
                          {canOperate && (canConfigure || u.role === 'user') && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleResetQuota(u)}
                                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-sky-50 text-sky-700"
                                title={lang === 'id' ? 'Reset Kuota Hari Ini' : 'Reset Daily Quota'}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleUserStatus(u)}
                                className={`p-1.5 rounded border ${
                                  u.status === 'suspended'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-300 bg-rose-50 text-rose-700'
                                }`}
                                title={
                                  u.status === 'suspended'
                                    ? lang === 'id'
                                      ? 'Aktifkan User'
                                      : 'Activate User'
                                    : lang === 'id'
                                      ? 'Tangguhkan User'
                                      : 'Suspend User'
                                }
                              >
                                {u.status === 'suspended' ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <Ban className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reward Coin Economy & Partner (MyValue) Settings */}
      {canConfigure && (
        <section className="anime-panel overflow-hidden">
          <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-bold text-amber-900 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              {lang === 'id'
                ? 'PENGATURAN KOIN HADIAH & INTEGRASI TRANSAKSI (MYVALUE / PARTNER)'
                : 'REWARD COIN ECONOMY & TRANSACTION PARTNER SETTINGS (MYVALUE)'}
            </span>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              {coinConfig.partnerName || 'MyValue'} · {coinConfig.partnerEnabled ? 'AKTIF' : 'SIAP KONEKSI'}
            </span>
          </div>

          <form onSubmit={(e) => void handleSaveCoinEconomy(e)} className="p-4 space-y-4 text-xs">
            <p className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-950">
              {lang === 'id'
                ? 'Atur jumlah koin hadiah per aksi (default 1 koin per aktivitas agar aman untuk transaksi nyata), nilai tukar IDR, dan kredensial integrasi MyValue / partner transaksi lainnya. Perubahan langsung aktif ke seluruh peserta.'
                : 'Configure reward coins earned per action (default 1 coin per activity for real-value transactions), IDR conversion rate, and MyValue / external partner integration settings.'}
            </p>

            {/* Identity & Conversion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Nama Koin' : 'Coin Name'}</span>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={coinConfig.coinName}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, coinName: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-normal"
                />
              </label>
              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Simbol Koin' : 'Coin Symbol'}</span>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={coinConfig.coinSymbol}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, coinSymbol: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-xs font-normal"
                />
              </label>
              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Koin Awal Peserta Baru' : 'Starting Coins'}</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={coinConfig.startingCoins}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, startingCoins: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-xs font-normal"
                />
              </label>
              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Nilai Tukar (Rp / 1 Koin)' : 'IDR per 1 Coin'}</span>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step="any"
                  value={coinConfig.idrPerCoin}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, idrPerCoin: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-xs font-normal"
                />
              </label>
              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Minimal Tukar Transaksi' : 'Min Redeem Coins'}</span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={coinConfig.minRedeemCoins}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, minRedeemCoins: Math.max(1, Number(e.target.value) || 1) }))}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-xs font-normal"
                />
              </label>
            </div>

            {/* Points Per Action */}
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase text-slate-700">
                {lang === 'id' ? 'POIN / KOIN PER AKTIVITAS PESERTA (DEFAULT: 1)' : 'COINS EARNED PER ACTION (DEFAULT: 1)'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {([
                  ['pointPerTask', lang === 'id' ? 'Tugas Selesai' : 'Task Done'],
                  ['pointPerWorkout', lang === 'id' ? 'Workout' : 'Workout'],
                  ['pointPerCheckIn', lang === 'id' ? 'Check-in Baru' : 'New Check-in'],
                  ['pointPerMilestone', lang === 'id' ? 'Tahap Impian' : 'Milestone'],
                  ['pointPerOverdrive', lang === 'id' ? 'Ekstrak Core' : 'Core Bonus'],
                  ['pointPerDayClear', lang === 'id' ? 'Tutup Hari' : 'Day Clear'],
                  ['pointPerLevelUp', lang === 'id' ? 'Naik Level' : 'Level Up'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block space-y-1 text-[11px] font-semibold text-slate-700">
                    <span className="block truncate">{label}</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={coinConfig[key]}
                      onChange={(e) =>
                        setCoinConfig((c) => ({
                          ...c,
                          [key]: Math.max(0, Math.min(1000, Number(e.target.value) || 0)),
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* External Transaction Partner (MyValue / etc.) */}
            <div className="rounded border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">
                    {lang === 'id'
                      ? 'Integrasi Partner Transaksi (MyValue / Loyalty Partner)'
                      : 'Transaction Partner Integration (MyValue / Loyalty Partner)'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'id'
                      ? 'API Key & Webhook Secret disimpan aman di adminSecrets/coinPartner (khusus Admin, tidak terekspos ke browser peserta).'
                      : 'API Key & Webhook Secret are stored in admin-only adminSecrets/coinPartner (zero client leak).'}
                  </p>
                </div>
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coinConfig.partnerEnabled}
                    onChange={(e) => setCoinConfig((c) => ({ ...c, partnerEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>{lang === 'id' ? 'Aktifkan Transaksi Partner' : 'Enable Partner Transactions'}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="block space-y-1 font-bold text-slate-700">
                  <span>{lang === 'id' ? 'Nama Partner Transaksi' : 'Partner Name'}</span>
                  <input
                    type="text"
                    maxLength={80}
                    value={coinConfig.partnerName}
                    onChange={(e) => setCoinConfig((c) => ({ ...c, partnerName: e.target.value }))}
                    placeholder="MyValue"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-normal"
                  />
                </label>
                <label className="block space-y-1 font-bold text-slate-700">
                  <span>{lang === 'id' ? 'URL Endpoint API / Webhook (Opsional)' : 'Partner API / Webhook URL (Optional)'}</span>
                  <input
                    type="url"
                    maxLength={300}
                    value={coinConfig.partnerEndpoint}
                    onChange={(e) => setCoinConfig((c) => ({ ...c, partnerEndpoint: e.target.value }))}
                    placeholder="https://api.myvalue.id/v1/..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px] font-normal"
                  />
                </label>
                <label className="block space-y-1 font-bold text-slate-700">
                  <span>Merchant / Partner ID (Admin Vault)</span>
                  <input
                    type="text"
                    maxLength={120}
                    value={partnerMerchantId}
                    onChange={(e) => setPartnerMerchantId(e.target.value)}
                    placeholder="MERCHANT-LEVELUP"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px] font-normal"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1 font-bold text-slate-700">
                  <span>Partner API Key (Admin Vault)</span>
                  <div className="relative">
                    <input
                      type={showPartnerSecrets ? 'text' : 'password'}
                      maxLength={500}
                      autoComplete="off"
                      value={partnerApiKey}
                      onChange={(e) => setPartnerApiKey(e.target.value)}
                      placeholder="mv_live_..."
                      className="w-full pl-2.5 pr-9 py-1.5 rounded border border-slate-300 font-mono text-[11px] font-normal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPartnerSecrets((v) => !v)}
                      className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-900"
                    >
                      {showPartnerSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <label className="block space-y-1 font-bold text-slate-700">
                  <span>Webhook Signing Secret (Admin Vault)</span>
                  <input
                    type={showPartnerSecrets ? 'text' : 'password'}
                    maxLength={500}
                    autoComplete="off"
                    value={partnerWebhookSecret}
                    onChange={(e) => setPartnerWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px] font-normal"
                  />
                </label>
              </div>

              <label className="block space-y-1 font-bold text-slate-700">
                <span>{lang === 'id' ? 'Info Transaksi untuk Peserta (Opsional)' : 'Transaction Notice for Participants (Optional)'}</span>
                <input
                  type="text"
                  maxLength={300}
                  value={coinConfig.transactionNote}
                  onChange={(e) => setCoinConfig((c) => ({ ...c, transactionNote: e.target.value }))}
                  placeholder={
                    lang === 'id'
                      ? 'Contoh: Kumpulkan koin hadiah dari tugas & workout, segera bisa ditukar via MyValue!'
                      : 'Example: Earn coins from tasks & workouts, redeemable via MyValue!'
                  }
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingCoinsConfig}
                className="py-2.5 px-4 rounded bg-amber-600 hover:bg-amber-700 text-white font-hud font-bold text-xs uppercase flex items-center gap-1.5 btn-anime"
              >
                {savingCoinsConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{lang === 'id' ? 'SIMPAN PENGATURAN KOIN & PARTNER' : 'SAVE COIN & PARTNER SETTINGS'}</span>
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  );
};
