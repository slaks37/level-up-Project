import { doc, onSnapshot, type Firestore, type Unsubscribe } from 'firebase/firestore';

export type FeatureFlagKey =
  | 'awakeningV2'
  | 'pathways'
  | 'academy'
  | 'businessStudio'
  | 'agnesV2'
  | 'serverWallet'
  | 'myValueRedemption'
  | 'ecosystemSync';

export interface FeatureFlagsConfig {
  awakeningV2: boolean;
  pathways: boolean;
  academy: boolean;
  businessStudio: boolean;
  agnesV2: boolean;
  serverWallet: boolean;
  myValueRedemption: boolean;
  ecosystemSync: boolean;
  cohortAllowlist: string[];
}

/**
 * All LevelUp 2.0 modules default to false so existing v1 behavior stays 100% preserved
 * until each phase passes its acceptance gates and is explicitly enabled.
 * Monetary redemption (myValueRedemption) additionally requires serverWallet === true.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlagsConfig = {
  awakeningV2: false,
  pathways: false,
  academy: false,
  businessStudio: false,
  agnesV2: false,
  serverWallet: false,
  myValueRedemption: false,
  ecosystemSync: false,
  cohortAllowlist: [],
};

export function normalizeFeatureFlags(raw: Partial<FeatureFlagsConfig> | null | undefined): FeatureFlagsConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FEATURE_FLAGS };
  const allowlist = Array.isArray(raw.cohortAllowlist)
    ? raw.cohortAllowlist.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, 100)
    : [];
  const serverWallet = Boolean(raw.serverWallet);
  return {
    awakeningV2: Boolean(raw.awakeningV2),
    pathways: Boolean(raw.pathways),
    academy: Boolean(raw.academy),
    businessStudio: Boolean(raw.businessStudio),
    agnesV2: Boolean(raw.agnesV2),
    serverWallet,
    // Architectural safety guard: monetary redemption can NEVER evaluate true without serverWallet
    myValueRedemption: serverWallet && Boolean(raw.myValueRedemption),
    ecosystemSync: Boolean(raw.ecosystemSync),
    cohortAllowlist: allowlist,
  };
}

export function isFeatureEnabled(
  flags: FeatureFlagsConfig,
  key: FeatureFlagKey,
  options: { userCohortIds?: string[]; isInternalStaff?: boolean } = {}
): boolean {
  if (key === 'myValueRedemption' && !flags.serverWallet) return false;
  if (flags[key]) return true;
  if (key === 'myValueRedemption') return false;
  if (options.isInternalStaff && flags.cohortAllowlist.includes('__staff__')) return true;
  if (options.userCohortIds?.length && flags.cohortAllowlist.length > 0) {
    return options.userCohortIds.some((cid) => flags.cohortAllowlist.includes(cid));
  }
  return false;
}

/**
 * Subscribes to appConfig/featureFlags while degrading safely to DEFAULT_FEATURE_FLAGS
 * when the document does not exist or rules have not yet been upgraded to v4.
 */
export function subscribeFeatureFlags(
  db: Firestore | null,
  callback: (flags: FeatureFlagsConfig) => void
): Unsubscribe {
  if (!db) {
    callback({ ...DEFAULT_FEATURE_FLAGS });
    return () => {};
  }
  return onSnapshot(
    doc(db, 'appConfig', 'featureFlags'),
    (snap) => {
      callback(snap.exists() ? normalizeFeatureFlags(snap.data() as Partial<FeatureFlagsConfig>) : { ...DEFAULT_FEATURE_FLAGS });
    },
    () => {
      callback({ ...DEFAULT_FEATURE_FLAGS });
    }
  );
}
