import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import type { Language, ToastItem } from '../types';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall(
  langRef: MutableRefObject<Language>,
  notify: (message: string, type?: ToastItem['type']) => void
) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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
  }, [langRef, notify]);

  const handleInstallPWA = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  return { installPrompt, handleInstallPWA };
}
