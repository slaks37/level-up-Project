import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
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
  UserCheck,
  Users,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AIUsageLogRecord,
  Language,
  SharedAIPublicConfig,
  UserAccountRecord,
} from '../types';
import {
  fetchAdminAISecret,
  fetchAdminUsageLogs,
  fetchAllUsersForAdmin,
  fetchSharedAIPublicConfig,
  grantOrRevokeAdmin,
  reloadCurrentUser,
  resetUserDailyQuota,
  saveAdminSharedAIConfig,
  sendCurrentUserVerificationEmail,
  updateUserStatusByAdmin,
} from '../services/firebaseService';
import {
  AGNES_PRESET_MODELS,
  checkProxyServerHealth,
  fetchProxyAdminConfig,
  fetchProxyUsageLogs,
  saveProxyAdminConfig,
  testAIConnection,
  testProxyAdminAI,
  type ProxyHealthResponse,
} from '../services/aiService';

interface AdminDashboardProps {
  lang: Language;
  cloudUser: User | null;
  isAdmin: boolean;
  isUnverifiedBootstrapAdmin: boolean;
  proxyBaseUrl: string;
  onSaveProxyBaseUrl: (url: string) => void;
  onBackToApp: () => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  cloudUser,
  isAdmin,
  isUnverifiedBootstrapAdmin,
  proxyBaseUrl,
  onSaveProxyBaseUrl,
  onBackToApp,
  onNotify,
}) => {
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
  const [userSearch, setUserSearch] = useState('');
  const [usageLogs, setUsageLogs] = useState<AIUsageLogRecord[]>([]);
  const [publicCfg, setPublicCfg] = useState<SharedAIPublicConfig | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!cloudUser || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const errors: string[] = [];
      const [pub, secret, allUsers, fsLogs, health] = await Promise.all([
        fetchSharedAIPublicConfig().catch((e) => {
          errors.push(`appConfig: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        }),
        fetchAdminAISecret().catch((e) => {
          errors.push(`adminSecrets: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        }),
        fetchAllUsersForAdmin().catch((e) => {
          errors.push(`users: ${e instanceof Error ? e.message : String(e)}`);
          return [];
        }),
        fetchAdminUsageLogs(40).catch(() => []),
        checkProxyServerHealth(localProxyUrl).catch(() => null),
      ]);
      if (errors.length > 0) setLoadError(errors.join(' | '));

      setPublicCfg(pub);
      setUsers(allUsers);
      setProxyHealth(health);

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
      if (health?.ok) {
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
  }, [cloudUser, isAdmin, localProxyUrl]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleSaveSharedConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUser || !isAdmin) return;
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

      // 2. Push to live Proxy Server if reachable
      let syncedToProxy = false;
      try {
        const idToken = await cloudUser.getIdToken();
        const res = await saveProxyAdminConfig(localProxyUrl.trim(), idToken, {
          baseUrl: cleanBase,
          model: cleanModel,
          apiKey: cleanKey || undefined,
          enabled,
          dailyLimit,
          maintenanceNotice: maintenanceNotice.trim(),
        });
        if (res.ok) {
          syncedToProxy = true;
          if (res.apiKeyMasked) setMaskedServerKey(res.apiKeyMasked);
        }
      } catch {
        syncedToProxy = false;
      }

      onNotify(
        syncedToProxy
          ? lang === 'id'
            ? 'Konfigurasi Shared Agnes AI tersimpan ke Database Firestore & Server Proxy! Semua user langsung bisa pakai.'
            : 'Shared Agnes AI saved to Firestore & Proxy Server! All users can use it now.'
          : lang === 'id'
            ? 'Tersimpan ke Firestore (adminSecrets & appConfig). Jalankan server proxy (`npm run dev:server`) agar semua user bisa memakai API key secara aman.'
            : 'Saved to Firestore. Start or connect your Proxy Server so users can access shared AI securely.',
        syncedToProxy ? 'success' : 'warning'
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
      const res = await testProxyAdminAI(localProxyUrl.trim(), idToken, {
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
      });
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
    } catch {
      // Fallback: test Agnes AI directly if proxy server isn't deployed yet
      if (apiKey.trim()) {
        const direct = await testAIConnection({
          baseUrl: baseUrl.trim() || 'https://apihub.agnes-ai.com/v1',
          model: model.trim() || 'agnes-2.5-flash',
          apiKey: apiKey.trim(),
          useDevProxy: false,
          preferSharedProxy: false,
        });
        if (direct.ok) {
          setTestResult({
            ok: true,
            message: `${direct.reply || 'OK'} (${direct.latencyMs}ms • API Key Valid! Catatan: Proxy Server belum online di "${localProxyUrl || '/api'}")`,
          });
        } else {
          setTestResult({
            ok: false,
            message: `Agnes AI error: ${direct.error}`,
          });
        }
      } else {
        setTestResult({
          ok: false,
          message:
            lang === 'id'
              ? `Proxy Server belum online di "${localProxyUrl || '/api'}". Masukkan API Key dulu atau jalankan: npm run dev:full`
              : `Proxy server offline at "${localProxyUrl || '/api'}". Enter API Key or run: npm run dev:full`,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleToggleUserStatus = async (target: UserAccountRecord) => {
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

  const handleToggleAdmin = async (target: UserAccountRecord) => {
    if (!cloudUser) return;
    if (target.ownerUid === cloudUser.uid) {
      onNotify(
        lang === 'id' ? 'Tidak bisa mencabut akses Admin milikmu sendiri.' : 'Cannot revoke your own admin role.',
        'warning'
      );
      return;
    }
    const makeAdmin = target.role !== 'admin';
    try {
      await grantOrRevokeAdmin(cloudUser, target, makeAdmin);
      setUsers((prev) =>
        prev.map((u) =>
          u.ownerUid === target.ownerUid ? { ...u, role: makeAdmin ? 'admin' : 'user' } : u
        )
      );
      onNotify(
        makeAdmin
          ? `${target.email} diangkat menjadi ADMIN.`
          : `Hak admin ${target.email} dicabut.`,
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

  if (!cloudUser || (!isAdmin && !isUnverifiedBootstrapAdmin)) {
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

  if (isUnverifiedBootstrapAdmin && !isAdmin) {
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
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalAIRequests = users.reduce((sum, u) => sum + (u.aiTotalRequests || 0), 0);
  const activeUsersCount = users.filter((u) => u.status !== 'suspended').length;

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
              Super Admin: {cloudUser.email}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="anime-panel p-3.5">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            TOTAL USERS
          </span>
          <p className="font-hud font-bold text-2xl text-slate-900 mt-1">{users.length}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">
            {activeUsersCount} {lang === 'id' ? 'aktif' : 'active'}
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

      {/* Main Grid: Shared AI Config + Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Shared Agnes AI Vault & Proxy Settings (7 cols) */}
        <div className="lg:col-span-7 anime-panel overflow-hidden">
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
                    ? 'SIMPAN KE DATABASE & SERVER'
                    : 'SAVE TO DATABASE & SERVER'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: AI Usage Audit Logs (5 cols) */}
        <div className="lg:col-span-5 anime-panel overflow-hidden flex flex-col">
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
        </div>
      </div>

      {/* User Management Directory */}
      <div className="anime-panel overflow-hidden">
        <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            USER MANAGEMENT & QUOTA DIRECTORY (FIRESTORE `users`)
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={lang === 'id' ? 'Cari nama / email...' : 'Search name / email...'}
              className="w-full pl-8 pr-2.5 py-1 rounded bg-white border border-slate-300 text-xs focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">AI Usage</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                    {lang === 'id' ? 'Belum ada user terdaftar.' : 'No registered users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.ownerUid} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <p className="font-hud font-bold text-slate-900">{u.displayName}</p>
                      <p className="font-mono text-[10px] text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          u.role === 'admin'
                            ? 'bg-slate-900 text-orange-400'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          u.status === 'suspended'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                      <span>
                        {u.aiRequestsToday}/{dailyLimit} today
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Total: {u.aiTotalRequests}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
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
                        <button
                          type="button"
                          onClick={() => void handleToggleAdmin(u)}
                          className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-900 hover:text-orange-400 font-mono text-[10px] font-bold transition"
                          title={
                            u.role === 'admin'
                              ? lang === 'id'
                                ? 'Cabut Admin'
                                : 'Revoke Admin'
                              : lang === 'id'
                                ? 'Jadikan Admin'
                                : 'Promote to Admin'
                          }
                        >
                          {u.role === 'admin' ? '-ADM' : '+ADM'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
