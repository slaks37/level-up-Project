import type {
  AIConfig,
  DailyLogEntry,
  FirebaseRuntimeConfig,
  Language,
  PlayerProfile,
} from '../types';
import { normalizePlayerProfile } from '../engine/science';

const KEYS = {
  PLAYER: 'levelup_studio_os_player_v3',
  LEGACY_PLAYER: 'aether_anime_blender_os_v2',
  LOGS: 'levelup_studio_os_daily_logs_v3',
  LANG: 'levelup_studio_os_lang_v3',
  MUTED: 'levelup_studio_os_sfx_muted_v3',
  AI_CONFIG: 'levelup_studio_os_ai_config_v3',
  FIREBASE_CONFIG: 'levelup_studio_os_firebase_config_v3',
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  baseUrl: import.meta.env.VITE_AI_BASE_URL || 'https://apihub.agnes-ai.com/v1',
  model: import.meta.env.VITE_AI_MODEL || 'agnes-2.5-flash',
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  useDevProxy: false,
  preferSharedProxy: true,
  proxyBaseUrl: import.meta.env.VITE_AI_PROXY_URL || '',
};

export function loadLocalPlayer(lang: Language, uid?: string): PlayerProfile | null {
  try {
    const raw = uid ? localStorage.getItem(KEYS.PLAYER + ':' + uid) :
      localStorage.getItem(KEYS.PLAYER) || localStorage.getItem(KEYS.LEGACY_PLAYER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    if (!parsed || typeof parsed !== 'object' || !parsed.name) return null;
    return normalizePlayerProfile(parsed, lang);
  } catch {
    return null;
  }
}

export function saveLocalPlayer(player: PlayerProfile | null, uid?: string): void {
  try {
    const key = uid ? KEYS.PLAYER + ':' + uid : KEYS.PLAYER;
    if (!player) {
      localStorage.removeItem(key);
      if (!uid) localStorage.removeItem(KEYS.LEGACY_PLAYER);
      return;
    }
    localStorage.setItem(key, JSON.stringify(player));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalLogs(uid?: string): DailyLogEntry[] {
  try {
    const raw = localStorage.getItem(uid ? KEYS.LOGS + ':' + uid : KEYS.LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DailyLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalLogs(logs: DailyLogEntry[], uid?: string): void {
  try {
    localStorage.setItem(uid ? KEYS.LOGS + ':' + uid : KEYS.LOGS, JSON.stringify(logs.slice(0, 60)));
  } catch {
    // Ignore
  }
}

export function loadSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(KEYS.LANG);
    return saved === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(KEYS.LANG, lang);
  } catch {
    // Ignore
  }
}

export function loadSfxMuted(): boolean {
  try {
    return localStorage.getItem(KEYS.MUTED) === 'true';
  } catch {
    return false;
  }
}

export function saveSfxMuted(muted: boolean): void {
  try {
    localStorage.setItem(KEYS.MUTED, muted ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(KEYS.AI_CONFIG);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AIConfig>;
    return {
      baseUrl: parsed.baseUrl?.trim() || DEFAULT_AI_CONFIG.baseUrl,
      model: parsed.model?.trim() || DEFAULT_AI_CONFIG.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_AI_CONFIG.apiKey,
      useDevProxy: Boolean(parsed.useDevProxy),
      preferSharedProxy:
        typeof parsed.preferSharedProxy === 'boolean' ? parsed.preferSharedProxy : true,
      proxyBaseUrl:
        typeof parsed.proxyBaseUrl === 'string'
          ? parsed.proxyBaseUrl.trim()
          : DEFAULT_AI_CONFIG.proxyBaseUrl,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAIConfig(config: AIConfig): void {
  try {
    localStorage.setItem(KEYS.AI_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

export function loadEnvFirebaseConfig(): FirebaseRuntimeConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '';
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

  if (apiKey && authDomain && projectId && appId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
  }
  return null;
}

export function loadRuntimeFirebaseConfig(): FirebaseRuntimeConfig | null {
  const envCfg = loadEnvFirebaseConfig();
  if (envCfg) return envCfg;

  try {
    const raw = localStorage.getItem(KEYS.FIREBASE_CONFIG);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseRuntimeConfig>;
    if (parsed.apiKey && parsed.authDomain && parsed.projectId && parsed.appId) {
      return {
        apiKey: parsed.apiKey.trim(),
        authDomain: parsed.authDomain.trim(),
        projectId: parsed.projectId.trim(),
        storageBucket: (parsed.storageBucket || '').trim(),
        messagingSenderId: (parsed.messagingSenderId || '').trim(),
        appId: parsed.appId.trim(),
      };
    }
  } catch {
    // Ignore
  }
  return null;
}

export function saveRuntimeFirebaseConfig(cfg: FirebaseRuntimeConfig | null): void {
  try {
    if (!cfg) {
      localStorage.removeItem(KEYS.FIREBASE_CONFIG);
      return;
    }
    localStorage.setItem(KEYS.FIREBASE_CONFIG, JSON.stringify(cfg));
  } catch {
    // Ignore
  }
}
