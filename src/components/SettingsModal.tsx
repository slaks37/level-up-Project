import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  AIConfig,
  FirebaseRuntimeConfig,
  Language,
  SharedAIPublicConfig,
  SyncStatus,
} from '../types';
import { DEFAULT_USER_PRIVACY_SETTINGS, type UserPrivacySettings } from '../engine/v2/privacy';
import { ModalShell } from './Modals';
import { AGNES_PRESET_MODELS, testAIConnection } from '../services/aiService';
import {
  getActiveFirebaseProjectId,
  isFirebaseReady,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from '../services/firebaseService';
import { loadEnvFirebaseConfig, loadRuntimeFirebaseConfig } from '../services/storageService';

interface SettingsModalProps {
  initialTab?: 'ai' | 'cloud' | 'privacy' | 'app';
  lang: Language;
  aiConfig: AIConfig;
  sharedAIConfig: SharedAIPublicConfig | null;
  onSaveAIConfig: (cfg: AIConfig) => void;
  privacySettings?: UserPrivacySettings;
  onSavePrivacySettings?: (next: UserPrivacySettings) => Promise<void> | void;
  cloudUser: User | null;
  syncStatus: SyncStatus;
  onSaveFirebaseConfig: (cfg: FirebaseRuntimeConfig | null) => Promise<void>;
  onForceCloudSync: () => Promise<void>;
  sfxMuted: boolean;
  onToggleSfx: () => void;
  canInstallPWA: boolean;
  onInstallPWA: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = 'ai',
  lang,
  aiConfig,
  sharedAIConfig,
  onSaveAIConfig,
  privacySettings = DEFAULT_USER_PRIVACY_SETTINGS,
  onSavePrivacySettings,
  cloudUser,
  syncStatus,
  onSaveFirebaseConfig,
  onForceCloudSync,
  sfxMuted,
  onToggleSfx,
  canInstallPWA,
  onInstallPWA,
  onExportJSON,
  onImportJSON,
  onNotify,
  onClose,
}) => {
  const [tab, setTab] = useState<'ai' | 'cloud' | 'privacy' | 'app'>(initialTab);
  const [privacyDraft, setPrivacyDraft] = useState<UserPrivacySettings>(privacySettings);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Agnes AI State
  const [preferSharedProxy, setPreferSharedProxy] = useState(
    aiConfig.preferSharedProxy !== false
  );
  const [proxyBaseUrl, setProxyBaseUrl] = useState(aiConfig.proxyBaseUrl || '');
  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl);
  const [model, setModel] = useState(aiConfig.model);
  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [useDevProxy, setUseDevProxy] = useState(aiConfig.useDevProxy);
  const [showKey, setShowKey] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Firebase Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Firebase Runtime Config State
  const hasEnvFirebase = Boolean(loadEnvFirebaseConfig());
  const existingFb = loadRuntimeFirebaseConfig();
  const [showFbSetup, setShowFbSetup] = useState(!isFirebaseReady());
  const [fbApiKey, setFbApiKey] = useState(existingFb?.apiKey || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(existingFb?.authDomain || '');
  const [fbProjectId, setFbProjectId] = useState(existingFb?.projectId || '');
  const [fbStorageBucket, setFbStorageBucket] = useState(existingFb?.storageBucket || '');
  const [fbSenderId, setFbSenderId] = useState(existingFb?.messagingSenderId || '');
  const [fbAppId, setFbAppId] = useState(existingFb?.appId || '');
  const [fbSnippet, setFbSnippet] = useState('');
  const [fbSaving, setFbSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveAI = (e: React.FormEvent) => {
    e.preventDefault();
    const nextCfg: AIConfig = {
      baseUrl: baseUrl.trim() || 'https://apihub.agnes-ai.com/v1',
      model: model.trim() || 'agnes-2.5-flash',
      apiKey: apiKey.trim(),
      useDevProxy,
      preferSharedProxy,
      proxyBaseUrl: proxyBaseUrl.trim(),
    };
    onSaveAIConfig(nextCfg);
    onNotify(
      lang === 'id'
        ? 'Konfigurasi Agnes AI disimpan di perangkat ini!'
        : 'Agnes AI configuration saved locally!',
      'success'
    );
  };

  const handleTestAI = async () => {
    const candidate: AIConfig = {
      baseUrl: baseUrl.trim() || 'https://apihub.agnes-ai.com/v1',
      model: model.trim() || 'agnes-2.5-flash',
      apiKey: apiKey.trim(),
      useDevProxy,
      preferSharedProxy,
      proxyBaseUrl: proxyBaseUrl.trim(),
    };
    onSaveAIConfig(candidate);
    setTestingAI(true);
    setTestResult(null);
    const res = await testAIConnection(candidate);
    setTestingAI(false);
    if (res.ok) {
      setTestResult({
        ok: true,
        message: `${res.reply || 'OK'} (${res.latencyMs}ms${res.viaSharedProxy ? ' • Shared Proxy' : ' • Direct BYOK'})`,
      });
    } else {
      setTestResult({
        ok: false,
        message: res.error || 'Connection failed',
      });
    }
  };

  const handleParseFirebaseSnippet = () => {
    const pick = (key: string) => {
      const m = fbSnippet.match(new RegExp(`${key}\\s*[:=]\\s*["'\`]([^"'\`]+)["'\`]`));
      return m?.[1]?.trim() || '';
    };
    const k = pick('apiKey');
    const ad = pick('authDomain');
    const pid = pick('projectId');
    const sb = pick('storageBucket');
    const ms = pick('messagingSenderId');
    const aid = pick('appId');

    if (!k || !pid) {
      onNotify(
        lang === 'id'
          ? 'Format snippet Firebase tidak terdeteksi. Pastikan ada apiKey dan projectId.'
          : 'Could not detect Firebase keys in snippet. Include apiKey and projectId.',
        'warning'
      );
      return;
    }

    setFbApiKey(k);
    if (ad) setFbAuthDomain(ad);
    setFbProjectId(pid);
    if (sb) setFbStorageBucket(sb);
    if (ms) setFbSenderId(ms);
    if (aid) setFbAppId(aid);
    onNotify(
      lang === 'id'
        ? 'Config Firebase berhasil diparsing! Klik Simpan & Hubungkan.'
        : 'Firebase config parsed! Click Save & Connect.',
      'success'
    );
  };

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbApiKey.trim() || !fbAuthDomain.trim() || !fbProjectId.trim() || !fbAppId.trim()) {
      onNotify(
        lang === 'id'
          ? 'Lengkapi apiKey, authDomain, projectId, dan appId Firebase.'
          : 'Please fill apiKey, authDomain, projectId, and appId.',
        'warning'
      );
      return;
    }
    setFbSaving(true);
    await onSaveFirebaseConfig({
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      projectId: fbProjectId.trim(),
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbSenderId.trim(),
      appId: fbAppId.trim(),
    });
    setFbSaving(false);
    setShowFbSetup(false);
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    try {
      await signInWithGoogle();
      onNotify(
        lang === 'id'
          ? 'Berhasil masuk dengan Google! Sinkronisasi Cloud aktif.'
          : 'Signed in with Google! Cloud Sync is active.',
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onNotify(msg, 'error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (authMode !== 'reset' && !password) return;
    setAuthBusy(true);
    try {
      if (authMode === 'reset') {
        await sendPasswordReset(email);
        onNotify(
          lang === 'id'
            ? `Link reset password telah dikirim ke ${email.trim()}. Cek inbox atau folder Spam.`
            : `Password reset link sent to ${email.trim()}. Check your inbox or Spam folder.`,
          'success'
        );
        setAuthMode('login');
      } else if (authMode === 'register') {
        await signUpWithEmail(email, password, displayName);
        onNotify(
          lang === 'id'
            ? 'Akun berhasil dibuat & terhubung ke Cloud Sync!'
            : 'Account created & connected to Cloud Sync!',
          'success'
        );
      } else {
        await signInWithEmail(email, password);
        onNotify(
          lang === 'id'
            ? 'Berhasil login! Memuat data Cloud...'
            : 'Signed in! Syncing Cloud profile...',
          'success'
        );
      }
      setPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onNotify(msg, 'error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await signOutUser();
      onNotify(
        lang === 'id' ? 'Keluar dari Cloud Sync (data lokal tetap aman).' : 'Signed out of Cloud Sync.',
        'info'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <ModalShell
      title={lang === 'id' ? 'PENGATURAN SISTEM, AI & CLOUD SYNC' : 'SYSTEM SETTINGS, AI & CLOUD SYNC'}
      icon={<Settings className="w-4 h-4 text-sky-600" />}
      maxWidth="max-w-xl"
      onClose={onClose}
    >
      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded border border-slate-200">
        <button
          type="button"
          onClick={() => setTab('ai')}
          className={`py-1.5 px-1.5 rounded font-hud font-bold text-[11px] flex items-center justify-center gap-1 transition ${
            tab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="truncate">Agnes AI</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('cloud')}
          className={`py-1.5 px-1.5 rounded font-hud font-bold text-[11px] flex items-center justify-center gap-1 transition ${
            tab === 'cloud' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">Cloud</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('privacy')}
          className={`py-1.5 px-1.5 rounded font-hud font-bold text-[11px] flex items-center justify-center gap-1 transition ${
            tab === 'privacy' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{lang === 'id' ? 'Privasi' : 'Privacy'}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('app')}
          className={`py-1.5 px-1.5 rounded font-hud font-bold text-[11px] flex items-center justify-center gap-1 transition ${
            tab === 'app' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>App & Backup</span>
        </button>
      </div>

      {/* TAB 1: AGNES AI (SHARED PROXY + PERSONAL BYOK) */}
      {tab === 'ai' && (
        <form onSubmit={handleSaveAI} className="space-y-3">
          {/* Shared Admin AI Status Banner */}
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-emerald-900">
                {lang === 'id'
                  ? 'Shared Agnes AI (API Key dari Admin)'
                  : 'Shared Agnes AI (Admin-Provided Key)'}
              </span>
              <span
                className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                  sharedAIConfig?.enabled && sharedAIConfig?.proxyConfigured
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sharedAIConfig?.enabled && sharedAIConfig?.proxyConfigured
                  ? `${sharedAIConfig.model} • ${sharedAIConfig.dailyLimit}/hari`
                  : lang === 'id'
                    ? 'Menunggu Admin'
                    : 'Awaiting Admin'}
              </span>
            </div>
            <p className="text-xs text-emerald-900">{lang === 'id'
              ? 'Agnes merinci langkah kecil di Peta Impian. Saran harian memakai catatan yang kamu simpan di Level Up.'
              : 'Agnes breaks down roadmap milestones. Daily suggestions use the records you save in Level Up.'}</p>
            <label className="flex items-center gap-2 text-[11px] text-emerald-800 cursor-pointer">
              <input
                type="checkbox"
                checked={preferSharedProxy}
                onChange={(e) => setPreferSharedProxy(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span>
                {lang === 'id'
                  ? 'Prioritaskan Shared AI dari Server Admin (tidak perlu isi API Key pribadi)'
                  : 'Prefer Admin Shared AI Proxy (no personal API key needed)'}
              </span>
            </label>
          </div>

          <div className="p-2.5 rounded bg-sky-50 border border-sky-200 text-[11px] text-sky-900">
            <p className="font-bold">
              {lang === 'id'
                ? 'Opsional: Gunakan API Key Pribadi (BYOK / Offline Fallback)'
                : 'Optional: Bring Your Own Agnes AI / OpenAI Key (BYOK)'}
            </p>
            <p className="text-sky-700 mt-0.5">
              {lang === 'id'
                ? 'API Key pribadi disimpan hanya di perangkat ini (tidak pernah diunggah ke Firestore).'
                : 'Personal API keys stay private on this device only (never uploaded to Firestore).'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shared Proxy Server URL (Opsional)
            </label>
            <input
              type="text"
              value={proxyBaseUrl}
              onChange={(e) => setProxyBaseUrl(e.target.value)}
              placeholder="/api (otomatis lokal) atau URL Render/Cloud Run"
              className="w-full px-3 py-1.5 rounded border border-slate-300 font-mono text-[11px] text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              API Base URL (OpenAI Standard)
            </label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://apihub.agnes-ai.com/v1"
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Model Name</label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="agnes-2.5-flash"
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-600"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {AGNES_PRESET_MODELS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setModel(preset.id)}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border transition ${
                    model === preset.id
                      ? 'bg-slate-900 text-orange-400 border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-sky-500'
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Agnes AI API Key (Bearer Token)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... / agnes-..."
                autoComplete="off"
                className="w-full pl-3 pr-10 py-2 rounded border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-600"
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

          {import.meta.env.DEV && (
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useDevProxy}
                onChange={(e) => setUseDevProxy(e.target.checked)}
                className="rounded border-slate-300 accent-sky-600"
              />
              <span>
                {lang === 'id'
                  ? 'Gunakan Vite Dev Proxy (/api/agnes) jika terkena CORS saat dev lokal'
                  : 'Use Vite Dev Proxy (/api/agnes) if CORS is blocked during local dev'}
              </span>
            </label>
          )}

          {testResult && (
            <div
              className={`p-2.5 rounded border text-xs font-mono ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={testingAI}
              onClick={handleTestAI}
              className="py-2 px-3 rounded border border-sky-400 bg-sky-50 hover:bg-sky-100 text-sky-800 font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
            >
              {testingAI ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'id' ? 'TES KONEKSI AI' : 'TEST AI CONNECTION'}</span>
            </button>
            <button
              type="submit"
              className="py-2 px-3 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase btn-anime"
            >
              {lang === 'id' ? 'SIMPAN KONFIGURASI' : 'SAVE CONFIG'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: FIREBASE CLOUD SYNC */}
      {tab === 'cloud' && (
        <div className="space-y-3">
          {isFirebaseReady() ? (
            <>
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-emerald-900">
                    Firebase Connected: <span className="font-mono">{getActiveFirebaseProjectId()}</span>
                  </p>
                  <p className="text-emerald-700">
                    Status: <strong className="uppercase">{syncStatus}</strong>
                  </p>
                </div>
                {!hasEnvFirebase && (
                  <button
                    type="button"
                    onClick={() => setShowFbSetup((v) => !v)}
                    className="font-mono text-[10px] font-bold text-sky-700 underline"
                  >
                    {showFbSetup ? 'Hide' : 'Edit Config'}
                  </button>
                )}
              </div>

              {cloudUser ? (
                <div className="p-3.5 rounded bg-slate-50 border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-hud font-bold text-sm text-slate-900 truncate">
                        {cloudUser.displayName || 'Level Up Hunter'}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 truncate">
                        {cloudUser.email}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white flex-shrink-0">
                      REALTIME ON
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void onForceCloudSync()}
                      className="py-2 px-3 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'SYNC SEKARANG' : 'SYNC NOW'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={handleLogout}
                      className="py-2 px-3 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'KELUAR AKUN' : 'SIGN OUT'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 px-4 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 btn-anime"
                  >
                    {authBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4 text-orange-400" />
                    )}
                    <span>
                      {lang === 'id'
                        ? 'MASUK DENGAN GOOGLE (DIREKOMENDASIKAN)'
                        : 'CONTINUE WITH GOOGLE (RECOMMENDED)'}
                    </span>
                  </button>

                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-300" />
                    <span className="px-2 font-mono text-[10px] text-slate-500">
                      {lang === 'id' ? 'ATAU EMAIL' : 'OR EMAIL'}
                    </span>
                    <div className="flex-grow border-t border-slate-300" />
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-2.5">
                    {authMode === 'reset' && (
                      <p className="rounded border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-900">
                        {lang === 'id'
                          ? 'Masukkan email akunmu untuk menerima tautan reset password.'
                          : 'Enter your account email to receive a password reset link.'}
                      </p>
                    )}
                    {authMode === 'register' && (
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={lang === 'id' ? 'Nama Lengkap / Panggilan' : 'Display Name'}
                        className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                      />
                    )}
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                    />
                    {authMode !== 'reset' && (
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={lang === 'id' ? 'Password (min. 6 karakter)' : 'Password (min 6 chars)'}
                        className="w-full px-3 py-2 rounded border border-slate-300 text-xs"
                      />
                    )}
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase btn-anime"
                    >
                      {authMode === 'reset'
                        ? lang === 'id'
                          ? 'KIRIM LINK RESET PASSWORD'
                          : 'SEND PASSWORD RESET LINK'
                        : authMode === 'register'
                          ? lang === 'id'
                            ? 'DAFTAR AKUN BARU'
                            : 'CREATE ACCOUNT'
                          : lang === 'id'
                            ? 'MASUK DENGAN EMAIL'
                            : 'SIGN IN WITH EMAIL'}
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setAuthMode((m) => (m === 'login' ? 'register' : 'login'))
                        }
                        className="text-[11px] font-semibold text-sky-700 hover:underline"
                      >
                        {authMode === 'login'
                          ? lang === 'id'
                            ? 'Belum punya akun? Daftar'
                            : "Don't have an account? Sign up"
                          : lang === 'id'
                            ? '← Kembali ke Masuk'
                            : '← Back to Sign in'}
                      </button>
                      {authMode !== 'reset' && (
                        <button
                          type="button"
                          onClick={() => setAuthMode('reset')}
                          className="text-[11px] font-semibold text-slate-600 hover:text-sky-800 hover:underline"
                        >
                          {lang === 'id' ? 'Lupa password?' : 'Forgot password?'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 rounded bg-amber-50 border border-amber-300 text-xs text-amber-900">
              <p className="font-bold">
                {lang === 'id'
                  ? 'Firebase Project Belum Dihubungkan'
                  : 'Firebase Project Not Connected Yet'}
              </p>
              <p className="mt-0.5 text-amber-800">
                {lang === 'id'
                  ? 'Isi kredensial Web App Firebase di bawah (atau file .env.local) untuk mengaktifkan Login Google/Email dan sinkronisasi real-time HP ↔ Laptop.'
                  : 'Paste your Firebase Web App config below (or in .env.local) to enable Google/Email sign-in and real-time Phone ↔ Laptop sync.'}
              </p>
            </div>
          )}

          {showFbSetup && !hasEnvFirebase && (
            <form
              onSubmit={handleSaveFirebase}
              className="p-3 rounded bg-slate-50 border border-slate-300 space-y-2.5"
            >
              <div>
                <label className="block font-mono text-[10px] font-bold text-slate-600 mb-1">
                  {lang === 'id'
                    ? 'Tempel firebaseConfig dari Firebase Console (opsional auto-fill):'
                    : 'Paste firebaseConfig snippet from Firebase Console (optional auto-fill):'}
                </label>
                <textarea
                  rows={3}
                  value={fbSnippet}
                  onChange={(e) => setFbSnippet(e.target.value)}
                  placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };'
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[10px]"
                />
                <button
                  type="button"
                  onClick={handleParseFirebaseSnippet}
                  className="mt-1 font-mono text-[10px] font-bold text-sky-700 hover:underline"
                >
                  ⚡ Auto-fill dari snippet di atas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                  placeholder="apiKey *"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
                <input
                  type="text"
                  required
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                  placeholder="authDomain * (xxx.firebaseapp.com)"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
                <input
                  type="text"
                  required
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                  placeholder="projectId *"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
                <input
                  type="text"
                  required
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  placeholder="appId *"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={fbStorageBucket}
                  onChange={(e) => setFbStorageBucket(e.target.value)}
                  placeholder="storageBucket (optional)"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={fbSenderId}
                  onChange={(e) => setFbSenderId(e.target.value)}
                  placeholder="messagingSenderId (optional)"
                  className="px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={fbSaving}
                className="w-full py-2 rounded bg-slate-900 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase btn-anime"
              >
                {fbSaving
                  ? '...'
                  : lang === 'id'
                    ? 'SIMPAN & HUBUNGKAN FIREBASE'
                    : 'SAVE & CONNECT FIREBASE'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: PRIVACY & CONSENT CONTROLS (LEVELUP 2.0 / UU PDP) */}
      {tab === 'privacy' && (
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              {lang === 'id'
                ? 'Kontrol Privasi & Persetujuan Data (Privacy by Default)'
                : 'Privacy & Data Consent Controls (Privacy by Default)'}
            </p>
            <p className="text-[11px] text-emerald-900">
              {lang === 'id'
                ? 'Jurnal harian, catatan mood/tidur/makan, dan kalender pribadimu bersifat privat (hanya kamu yang bisa membaca) dan tidak pernah dibagikan otomatis ke pihak eksternal.'
                : 'Your private journals, mood/sleep/meal logs, and personal calendar stay owner-only by default and are never shared automatically with external platforms.'}
            </p>
          </div>

          <div className="space-y-2">
            {(
              [
                {
                  key: 'shareCoachingProgressWithMentor' as const,
                  titleId: 'Bagikan progres Peta Impian & belajar ke Mentor kohort',
                  titleEn: 'Share Dream Map & learning progress with cohort Mentor',
                  descId: 'Membantu mentor memantau progres kursus & tugas kohort.',
                  descEn: 'Allows assigned mentors to track course & cohort milestones.',
                  sensitive: false,
                },
                {
                  key: 'shareBusinessCanvasesWithMentor' as const,
                  titleId: 'Bagikan kanvas Business Studio ke Mentor kohort',
                  titleEn: 'Share Business Studio canvases with cohort Mentor',
                  descId: 'Izinkan mentor memberi umpan balik atas BMC, HPP & prototipe.',
                  descEn: 'Allow mentors to review BMC, pricing & prototypes.',
                  sensitive: false,
                },
                {
                  key: 'shareWellnessWithCoach' as const,
                  titleId: 'Bagikan ringkasan kebugaran/tidur/nyeri ke Coach',
                  titleEn: 'Share wellness summary (sleep/mood/pain alerts) with Coach',
                  descId: 'Default: OFF. Hanya ringkasan kondisi — bukan teks jurnal mentah.',
                  descEn: 'Default: OFF. Summary alerts only — never raw private journal text.',
                  sensitive: true,
                },
                {
                  key: 'sharePrivateJournalWithAgnes' as const,
                  titleId: 'Izinkan Agnes AI membaca catatan refleksi jurnal pribadi',
                  titleEn: 'Allow Agnes AI to read private journal reflections',
                  descId: 'Default: OFF. Hanya berlaku untuk mode Personal Coach / Wellness.',
                  descEn: 'Default: OFF. Scoped only to Personal Coach / Wellness modes.',
                  sensitive: true,
                },
                {
                  key: 'shareHealthMetricsWithAgnes' as const,
                  titleId: 'Izinkan Agnes AI membaca metrik tidur & energi harian',
                  titleEn: 'Allow Agnes AI to read daily sleep & energy metrics',
                  descId: 'Default: OFF. PII (email/HP/NIK) tetap otomatis disensor.',
                  descEn: 'Default: OFF. PII (email/phone/ID) is always automatically redacted.',
                  sensitive: true,
                },
                {
                  key: 'shareAggregatedImpactWithEcosystem' as const,
                  titleId: 'Bagikan ringkasan dampak usaha ke ekosistem Sociopreneur.online',
                  titleEn: 'Share verified venture impact summary with Sociopreneur.online',
                  descId: 'Default: OFF. Hanya metrik dampak usaha — nol data jurnal pribadi.',
                  descEn: 'Default: OFF. Venture impact KPIs only — zero personal journal data.',
                  sensitive: true,
                },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer hover:border-sky-300"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                      {lang === 'id' ? item.titleId : item.titleEn}
                    </span>
                    {item.sensitive && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {lang === 'id' ? 'SENSITIF · DEFAULT OFF' : 'SENSITIVE · DEFAULT OFF'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {lang === 'id' ? item.descId : item.descEn}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacyDraft[item.key]}
                  onChange={(e) =>
                    setPrivacyDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 accent-sky-600 shrink-0"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={savingPrivacy}
            onClick={async () => {
              if (!onSavePrivacySettings) return;
              setSavingPrivacy(true);
              try {
                await onSavePrivacySettings(privacyDraft);
                onNotify(
                  lang === 'id'
                    ? 'Pengaturan privasi & persetujuan data berhasil disimpan.'
                    : 'Privacy & data consent preferences saved.',
                  'success'
                );
              } catch (err) {
                onNotify(err instanceof Error ? err.message : String(err), 'error');
              } finally {
                setSavingPrivacy(false);
              }
            }}
            className="w-full py-2 rounded bg-slate-900 hover:bg-emerald-700 disabled:opacity-60 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
          >
            {savingPrivacy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{lang === 'id' ? 'SIMPAN PENGATURAN PRIVASI' : 'SAVE PRIVACY SETTINGS'}</span>
          </button>
        </div>
      )}

      {/* TAB 4: APP, PWA INSTALL & BACKUP */}
      {tab === 'app' && (
        <div className="space-y-3 text-xs">
          {/* Audio Toggle */}
          <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {sfxMuted ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-600" />
              )}
              <div>
                <p className="font-bold text-slate-900">
                  {lang === 'id' ? 'Efek Suara Taktis (SFX)' : 'Tactical Sound Effects (SFX)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {sfxMuted
                    ? lang === 'id'
                      ? 'Suara dimatikan'
                      : 'Muted'
                    : lang === 'id'
                      ? 'Aktif saat klik & naik level'
                      : 'Enabled on clicks & level ups'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSfx}
              className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold transition ${
                sfxMuted ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'
              }`}
            >
              {sfxMuted ? 'OFF' : 'ON'}
            </button>
          </div>

          {/* Install PWA Guide */}
          <div className="p-3 rounded bg-sky-50 border border-sky-200 space-y-2">
            <p className="font-bold text-sky-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-600" />
              {lang === 'id' ? 'Install di HP & Laptop (PWA)' : 'Install on Phone & Laptop (PWA)'}
            </p>
            {canInstallPWA ? (
              <button
                type="button"
                onClick={onInstallPWA}
                className="w-full py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'INSTALL KE PERANGKAT INI' : 'INSTALL TO THIS DEVICE'}</span>
              </button>
            ) : (
              <ul className="text-[11px] text-sky-800 space-y-1 list-disc pl-4">
                <li>
                  <strong>Android (Chrome):</strong>{' '}
                  {lang === 'id'
                    ? 'Tap menu ⋮ → "Tambahkan ke layar utama / Install app".'
                    : 'Tap ⋮ menu → "Install app / Add to Home screen".'}
                </li>
                <li>
                  <strong>iPhone / iPad (Safari):</strong>{' '}
                  {lang === 'id'
                    ? 'Tap tombol Share (kotak panah atas) → "Tambahkan ke Layar Utama".'
                    : 'Tap Share icon → "Add to Home Screen".'}
                </li>
                <li>
                  <strong>Laptop (Chrome / Edge):</strong>{' '}
                  {lang === 'id'
                    ? 'Klik ikon Install di ujung kanan address bar.'
                    : 'Click the Install icon at the right end of the address bar.'}
                </li>
              </ul>
            )}
          </div>

          {/* Manual JSON Backup */}
          <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-bold text-slate-900">
              {lang === 'id' ? 'Cadangan Data (Backup / Restore JSON)' : 'Data Backup (Export / Import JSON)'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportJSON}
                className="py-2 px-3 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>EXPORT JSON</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5 btn-anime"
              >
                <Upload className="w-3.5 h-3.5 text-orange-600" />
                <span>IMPORT JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportJSON(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
};
