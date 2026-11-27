import React, { useEffect, useState } from 'react';
import {
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import type { Language } from '../types';
import {
  sendPasswordReset,
  signInWithEmail,
  signInExistingAdminWithGoogle,
  requireAdminSession,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/firebaseService';
import { prepareGoogleOAuth } from '../services/googleCalendar';

interface AuthViewProps {
  lang: Language;
  adminOnly?: boolean;
  onExit: () => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

function translateAuthError(err: unknown, lang: Language): string {
  if (err instanceof Error && err.message === 'ADMIN_ACCESS_REQUIRED') {
    return lang === 'id' ? 'Gunakan akun dengan email terverifikasi yang sudah diberi akses admin.' : 'Use a verified email that already has admin access.';
  }
  if (err instanceof Error && err.message.startsWith('GOOGLE_')) {
    return lang === 'id' ? 'Login Google belum selesai. Buka aplikasi di Chrome atau Safari, lalu coba lagi.' : 'Google sign-in did not finish. Open the app in Chrome or Safari and retry.';
  }
  const code = (err as { code?: string })?.code || '';
  const mapId: Record<string, string> = {
    'auth/invalid-credential': 'Email atau password salah. Periksa kembali.',
    'auth/wrong-password': 'Password salah.',
    'auth/user-not-found': 'Akun dengan email ini belum terdaftar.',
    'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk (Login).',
    'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter).',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
    'auth/popup-closed-by-user': 'Popup login Google ditutup sebelum selesai.',
    'auth/unauthorized-domain':
      'Domain ini belum terdaftar di Firebase Authentication > Authorized Domains.',
  };
  const mapEn: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in.',
    'auth/weak-password': 'Password is too weak (minimum 6 characters).',
    'auth/invalid-email': 'Invalid email address format.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in popup was closed.',
    'auth/unauthorized-domain':
      'This domain is not authorized in Firebase Auth > Authorized Domains.',
  };

  const table = lang === 'id' ? mapId : mapEn;
  if (code && table[code]) return table[code];
  return err instanceof Error ? err.message : String(err);
}

export const AuthView: React.FC<AuthViewProps> = ({ lang, adminOnly = false, onExit, onNotify }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSentTo, setResetSentTo] = useState('');
  const [adminGoogleReady, setAdminGoogleReady] = useState(false);
  useEffect(() => {
    if (!adminOnly) return;
    let active = true;
    void prepareGoogleOAuth().then(() => { if (active) setAdminGoogleReady(true); }).catch(() => {});
    return () => { active = false; };
  }, [adminOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (mode === 'register') {
      if (password.length < 6) {
        onNotify(
          lang === 'id' ? 'Password minimal 6 karakter.' : 'Password must be at least 6 characters.',
          'warning'
        );
        return;
      }
      if (password !== confirmPassword) {
        onNotify(
          lang === 'id' ? 'Konfirmasi password tidak cocok.' : 'Passwords do not match.',
          'warning'
        );
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const user = await signInWithEmail(email, password);
        if (adminOnly) await requireAdminSession(user);
        onNotify(
          lang === 'id'
            ? 'Berhasil masuk! Menyinkronkan data dari Cloud...'
            : 'Signed in! Syncing your data from Cloud...',
          'success'
        );
      } else if (mode === 'register' && !adminOnly) {
        await signUpWithEmail(email, password, displayName);
        onNotify(
          lang === 'id'
            ? 'Akun berhasil dibuat! Cek inbox email untuk verifikasi (opsional).'
            : 'Account created! Check your inbox for the verification email.',
          'success'
        );
      } else {
        await sendPasswordReset(email);
        const sentEmail = email.trim();
        setResetSentTo(sentEmail);
        onNotify(
          lang === 'id'
            ? `Link reset password telah dikirim ke ${sentEmail}. Cek inbox atau folder Spam.`
            : `Password reset link sent to ${sentEmail}. Check your inbox or Spam folder.`,
          'success'
        );
      }
    } catch (err) {
      onNotify(translateAuthError(err, lang), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      if (adminOnly) await signInExistingAdminWithGoogle();
      else await signInWithGoogle();
      onNotify(
        lang === 'id'
          ? 'Berhasil login dengan Google! Sinkronisasi aktif.'
          : 'Signed in with Google! Cloud Sync active.',
        'success'
      );
    } catch (err) {
      onNotify(translateAuthError(err, lang), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto py-4 sm:py-8">
      <div className="anime-panel overflow-hidden">
        <div className="blender-bar px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            {adminOnly ? 'AUTH GATE // ADMIN ACCESS' : 'AUTH GATE // CLOUD ACCOUNT ACCESS'}
          </span>
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
            FIREBASE AUTH
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-lg bg-slate-900 text-orange-400 flex items-center justify-center mx-auto shadow-sm">
              <Cpu className="w-6 h-6" />
            </div>
            <h1 className="font-hud font-bold text-2xl text-slate-900 tracking-wide">
              {adminOnly ? 'ADMIN CONTROL CENTER' : 'LEVEL UP SYSTEM'}
            </h1>
            <p className="text-xs text-slate-600">
              {adminOnly
                ? lang === 'id'
                  ? 'Masuk dengan email terverifikasi yang sudah diberi akses admin.'
                  : 'Sign in with an account that has admin access.'
                : lang === 'id'
                  ? 'Masuk dengan Email atau Google untuk sinkronisasi otomatis HP ↔ Laptop dan akses Shared Agnes AI.'
                  : 'Sign in with Email or Google for real-time Phone ↔ Laptop sync and Shared Agnes AI access.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className={`grid ${adminOnly ? 'grid-cols-2' : 'grid-cols-3'} gap-1 bg-slate-100 p-1 rounded border border-slate-200 font-hud font-bold text-xs`}>
            <button
              type="button"
              onClick={() => { setMode('login'); setResetSentTo(''); }}
              className={`py-1.5 rounded transition ${
                mode === 'login' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'id' ? 'MASUK' : 'SIGN IN'}
            </button>
            {!adminOnly && (
              <button
                type="button"
                onClick={() => { setMode('register'); setResetSentTo(''); }}
                className={`py-1.5 rounded transition ${
                  mode === 'register'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'id' ? 'DAFTAR' : 'REGISTER'}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setMode('reset'); setResetSentTo(''); }}
              className={`py-1.5 rounded transition ${
                mode === 'reset' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'id' ? 'LUPA PASSWORD' : 'FORGOT'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'id' ? 'Nama Panggilan' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Raka Pratama' : 'Example: Alex Chen'}
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:border-sky-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            {mode === 'reset' && (
              <div className="p-3 rounded bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1">
                <p className="font-bold">
                  {lang === 'id' ? 'Lupa Password?' : 'Forgot your password?'}
                </p>
                <p className="text-sky-800">
                  {lang === 'id'
                    ? 'Masukkan email akunmu di bawah. Kami akan mengirimkan tautan untuk membuat password baru.'
                    : 'Enter your account email below and we will send a password reset link.'}
                </p>
                {resetSentTo && (
                  <p className="rounded bg-emerald-100 border border-emerald-300 px-2 py-1.5 text-emerald-900 font-semibold">
                    ✓ {lang === 'id'
                      ? `Tautan reset dikirim ke ${resetSentTo}. Periksa inbox atau folder Spam.`
                      : `Reset link sent to ${resetSentTo}. Check your inbox or Spam folder.`}
                  </p>
                )}
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setResetSentTo(''); }}
                      className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      {lang === 'id' ? 'Lupa password?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      lang === 'id' ? 'Minimal 6 karakter' : 'At least 6 characters'
                    }
                    className="w-full pl-9 pr-10 py-2 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-900"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'id' ? 'Konfirmasi Password' : 'Confirm Password'}
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={lang === 'id' ? 'Ulangi password' : 'Repeat password'}
                  className="w-full px-3 py-2 rounded bg-white border border-slate-300 text-sm focus:outline-none focus:border-sky-600"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded bg-slate-900 hover:bg-sky-700 disabled:opacity-60 text-white font-hud font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 btn-anime shadow-sm"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              ) : mode === 'register' ? (
                <UserPlus className="w-4 h-4 text-orange-400" />
              ) : (
                <LogIn className="w-4 h-4 text-orange-400" />
              )}
              <span>
                {mode === 'login'
                  ? lang === 'id'
                    ? 'MASUK DENGAN EMAIL'
                    : 'SIGN IN WITH EMAIL'
                  : mode === 'register'
                    ? lang === 'id'
                      ? 'BUAT AKUN BARU'
                      : 'CREATE ACCOUNT'
                    : lang === 'id'
                      ? 'KIRIM LINK RESET PASSWORD'
                      : 'SEND PASSWORD RESET LINK'}
              </span>
            </button>
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSentTo(''); }}
                className="w-full text-center text-xs font-semibold text-sky-700 hover:underline"
              >
                {lang === 'id' ? '← Kembali ke Masuk' : '← Back to Sign In'}
              </button>
            )}
          </form>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-300" />
            <span className="px-2.5 font-mono text-[10px] font-bold text-slate-500">
              {lang === 'id' ? 'ATAU INSTAN' : 'OR INSTANT'}
            </span>
            <div className="flex-grow border-t border-slate-300" />
          </div>

          <button
            type="button"
            disabled={busy || (adminOnly && !adminGoogleReady)}
            onClick={handleGoogle}
            className="w-full py-2.5 px-4 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-hud font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 btn-anime"
          >
            <Cloud className="w-4 h-4 text-sky-600" />
            <span>
              {lang === 'id' ? 'LANJUTKAN DENGAN GOOGLE' : 'CONTINUE WITH GOOGLE'}
            </span>
          </button>

          {adminOnly && (
            <div className="pt-1 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onExit}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                {lang === 'id' ? 'Kembali ke Level Up' : 'Back to Level Up'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
