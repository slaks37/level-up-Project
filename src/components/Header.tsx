import React from 'react';
import {
  BookOpenCheck,
  Cloud,
  CloudOff,
  Cpu,
  Download,
  Loader2,
  LogIn,
  RotateCcw,
  Settings,
  Shield,
  UserRound,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Language, SyncStatus } from '../types';
import { tr } from '../data/i18n';
import { brandName, brandTagline } from '../data/brand';

interface HeaderProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  hasPlayer: boolean;
  syncStatus: SyncStatus;
  cloudUser: User | null;
  canAccessAdmin: boolean;
  isAdminView: boolean;
  onToggleAdminView: () => void;
  onOpenAuthScreen: () => void;
  canInstallPWA: boolean;
  onInstallPWA: () => void;
  onOpenScience: () => void;
  onOpenSettings: (tab?: 'ai' | 'cloud' | 'app') => void;
  onOpenReset: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onChangeLang,
  hasPlayer,
  syncStatus,
  cloudUser,
  canAccessAdmin,
  isAdminView,
  onToggleAdminView,
  onOpenAuthScreen,
  canInstallPWA,
  onInstallPWA,
  onOpenScience,
  onOpenSettings,
  onOpenReset,
  onOpenProfile,
}) => {
  const syncBadge = (() => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: tr(lang, 'syncSynced'),
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <Cloud className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'syncing':
      case 'connecting':
        return {
          label: tr(lang, syncStatus === 'syncing' ? 'syncSyncing' : 'syncConnecting'),
          cls: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />,
        };
      case 'offline':
        return {
          label: tr(lang, 'syncOffline'),
          cls: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <CloudOff className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'error':
        return {
          label: tr(lang, 'syncError'),
          cls: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <CloudOff className="w-3.5 h-3.5 text-rose-600" />,
        };
      default:
        return {
          label: tr(lang, 'syncLocal'),
          cls: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <CloudOff className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  })();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-300 shadow-xs safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-orange-400 shadow-xs flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-hud text-sm font-bold leading-tight text-slate-900 sm:text-base">{brandName}</p>
            <p lang="en" className="mt-0.5 text-[10px] leading-tight text-slate-600 sm:text-[11px]">{brandTagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {canInstallPWA && (
            <button
              type="button"
              onClick={onInstallPWA}
              className="px-2 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-hud font-bold text-[11px] flex items-center gap-1 shadow-xs transition btn-anime"
              title={tr(lang, 'btnInstallApp')}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tr(lang, 'btnInstallApp')}</span>
            </button>
          )}

          {/* Admin Console Toggle (visible only to Admin) */}
          {canAccessAdmin && (
            <button
              type="button"
              onClick={onToggleAdminView}
              className={`px-2.5 py-1.5 rounded font-hud font-bold text-xs flex items-center gap-1 border transition btn-anime ${
                isAdminView
                  ? 'bg-orange-600 border-orange-700 text-white'
                  : 'bg-slate-900 hover:bg-orange-600 border-slate-900 text-orange-400 hover:text-white'
              }`}
              title="Admin Control Center"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ADMIN</span>
            </button>
          )}

          {/* Cloud Sync / Login Button */}
          {cloudUser ? (
            <button
              type="button"
              onClick={() => onOpenSettings('cloud')}
              className={`px-2 py-1.5 rounded border font-mono text-[10px] font-bold flex items-center gap-1.5 transition ${syncBadge.cls}`}
              title={`${cloudUser.displayName || cloudUser.email} (${syncBadge.label})`}
            >
              {syncBadge.icon}
              <span className="hidden md:inline max-w-[110px] truncate">
                {cloudUser.displayName || cloudUser.email?.split('@')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthScreen}
              className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-xs flex items-center gap-1 transition btn-anime"
              title={lang === 'id' ? 'Masuk / Daftar Email' : 'Sign In / Register'}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'id' ? 'LOGIN' : 'SIGN IN'}</span>
            </button>
          )}

          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 border border-slate-300 rounded p-0.5 font-mono text-[11px] font-bold">
            <button
              type="button"
              onClick={() => onChangeLang('id')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'id' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {/* Science Reference */}
          <button
            type="button"
            onClick={onOpenScience}
            className="px-2 py-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 font-hud font-bold text-xs flex items-center gap-1.5 transition"
            title={tr(lang, 'btnScienceLbl')}
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{tr(lang, 'btnScienceLbl')}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onOpenSettings('ai')}
            className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-hud font-bold text-xs flex items-center gap-1 transition"
            title={tr(lang, 'btnSettingsLbl')}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{tr(lang, 'btnSettingsLbl')}</span>
          </button>

          {hasPlayer && !isAdminView && (
            <button type="button" onClick={onOpenProfile} aria-label={lang === 'id' ? 'Profil' : 'Profile'}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-sky-50">
              <UserRound className="size-3.5" />
            </button>
          )}
          {/* Reset Profile */}
          {hasPlayer && !isAdminView && (
            <button
              type="button"
              onClick={onOpenReset}
              className="px-2 py-1.5 rounded bg-slate-100 hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-hud font-bold text-xs flex items-center gap-1 transition"
              title={tr(lang, 'btnResetLbl')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{tr(lang, 'btnResetLbl')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
