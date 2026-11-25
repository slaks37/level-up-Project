import type {
  AIConfig,
  AIUsageLogRecord,
  DiscoveredPerk,
  DreamStep,
  GrowthNewsItem,
  Language,
  PlayerProfile,
  Quest,
} from '../types';
import {
  createDefaultDreamSteps,
  createSyncedQuestsForActiveStep,
  getDefaultDiscoveredPerks,
  getDefaultGrowthNews,
  getRecoveryMultiplier,
} from '../engine/science';
import { getCurrentUserIdToken } from './firebaseService';

export const AGNES_PRESET_MODELS = [
  { id: 'agnes-2.5-flash', label: 'Agnes 2.5 Flash (Cepat & Hemat)' },
  { id: 'agnes-3.0-flash', label: 'Agnes 3.0 Flash (Generasi Terbaru)' },
  { id: 'agnes-2.5-pro-beta', label: 'Agnes 2.5 Pro Beta (Analisis Mendalam)' },
];

export interface ProxyHealthResponse {
  ok: boolean;
  proxyMode: string;
  sharedAiConfigured: boolean;
  enabled: boolean;
  model: string;
  dailyLimit: number;
  maintenanceNotice?: string;
}

function buildProxyUrl(proxyBaseUrl: string | undefined, path: string): string {
  const clean = (proxyBaseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) return path; // uses same-origin /api/* (Vite dev proxy or Firebase Hosting rewrite)
  return `${clean}${path}`;
}

export async function checkProxyServerHealth(
  proxyBaseUrl?: string
): Promise<ProxyHealthResponse | null> {
  try {
    const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/health'), {
      method: 'GET',
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return (await resp.json()) as ProxyHealthResponse;
  } catch {
    return null;
  }
}

export async function fetchProxyAdminConfig(proxyBaseUrl: string, idToken: string) {
  const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/admin/config'), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as {
    baseUrl: string;
    model: string;
    enabled: boolean;
    dailyLimit: number;
    maintenanceNotice: string;
    hasApiKey: boolean;
    apiKeyMasked: string;
    proxyMode: string;
  };
}

export async function saveProxyAdminConfig(
  proxyBaseUrl: string,
  idToken: string,
  payload: {
    baseUrl: string;
    model: string;
    apiKey?: string;
    enabled: boolean;
    dailyLimit: number;
    maintenanceNotice: string;
  }
) {
  const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/admin/config'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return (await resp.json()) as {
    ok: boolean;
    hasApiKey: boolean;
    apiKeyMasked: string;
  };
}

export async function testProxyAdminAI(
  proxyBaseUrl: string,
  idToken: string,
  payload: { baseUrl?: string; model?: string; apiKey?: string }
) {
  const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/admin/test-ai'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  return (await resp.json()) as {
    ok: boolean;
    latencyMs?: number;
    reply?: string;
    error?: string;
  };
}

export async function fetchProxyUsageLogs(
  proxyBaseUrl: string,
  idToken: string
): Promise<AIUsageLogRecord[]> {
  const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/admin/usage-logs'), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!resp.ok) return [];
  const data = (await resp.json()) as { logs?: AIUsageLogRecord[] };
  return Array.isArray(data.logs) ? data.logs : [];
}

function buildDirectEndpointUrl(config: AIConfig): string {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  if (config.useDevProxy && import.meta.env.DEV && cleanBase.includes('apihub.agnes-ai.com')) {
    return '/api/agnes/v1/chat/completions';
  }
  return cleanBase.endsWith('/chat/completions')
    ? cleanBase
    : `${cleanBase}/chat/completions`;
}

function extractJsonObject<T>(rawText: string): T | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Strip markdown fences if present
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  return null;
}

interface ChatCompletionResult {
  content: string;
  model?: string;
  viaSharedProxy: boolean;
  remainingToday?: number;
  dailyLimit?: number;
}

async function callSharedAIProxy(
  proxyBaseUrl: string | undefined,
  idToken: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  feature: string
): Promise<ChatCompletionResult> {
  const resp = await fetch(buildProxyUrl(proxyBaseUrl, '/api/ai/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      feature,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('PROXY_UNAVAILABLE');
  }

  const data = (await resp.json()) as {
    content?: string;
    model?: string;
    error?: string;
    usage?: { remainingToday?: number; dailyLimit?: number };
  };

  if (!resp.ok) {
    throw new Error(data.error || `Proxy HTTP ${resp.status}`);
  }
  if (!data.content) {
    throw new Error('Empty completion from AI proxy');
  }

  return {
    content: data.content,
    model: data.model,
    viaSharedProxy: true,
    remainingToday: data.usage?.remainingToday,
    dailyLimit: data.usage?.dailyLimit,
  };
}

async function callOpenAICompatible(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.6,
  feature = 'chat'
): Promise<ChatCompletionResult> {
  const preferShared = config.preferSharedProxy !== false;
  const idToken = await getCurrentUserIdToken();

  // 1. Try Secure Shared Admin AI Proxy first when logged in
  if (idToken && (preferShared || !config.apiKey.trim())) {
    try {
      return await callSharedAIProxy(
        config.proxyBaseUrl,
        idToken,
        systemPrompt,
        userPrompt,
        temperature,
        feature
      );
    } catch (proxyErr) {
      // If user has their own personal BYOK key, fall back smoothly to direct call
      if (!config.apiKey.trim()) {
        throw proxyErr;
      }
    }
  }

  // 2. Direct OpenAI-compatible call using user's personal BYOK key
  if (!config.apiKey.trim()) {
    throw new Error('API_KEY_MISSING');
  }

  const url = buildDirectEndpointUrl(config);
  const body = {
    model: config.model.trim() || 'agnes-2.5-flash',
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 180)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Empty response from AI provider');
      }

      return { content, model: data?.model, viaSharedProxy: false };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
    }
  }

  throw lastError ?? new Error('AI request failed');
}

export async function testAIConnection(config: AIConfig): Promise<{
  ok: boolean;
  latencyMs: number;
  reply?: string;
  viaSharedProxy?: boolean;
  error?: string;
}> {
  const start = performance.now();
  try {
    const res = await callOpenAICompatible(
      config,
      'You are a concise connection check endpoint.',
      'Reply with exactly: LEVEL UP AI READY',
      0,
      'test'
    );
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - start),
      reply: res.content.trim().slice(0, 80),
      viaSharedProxy: res.viaSharedProxy,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// =========================================================================
// 1. AI COACH DREAM ROADMAP GENERATOR
// =========================================================================
export async function generateAIDreamRoadmap(
  player: PlayerProfile,
  lang: Language,
  config: AIConfig
): Promise<{
  dreamSteps: DreamStep[];
  coachAdvice: string;
  usedFallback: boolean;
  viaSharedProxy?: boolean;
  remainingToday?: number;
  errorMessage?: string;
}> {
  const bd = player.dailyBreakdown;

  const systemPrompt =
    'You are an elite science-based career, study, and fitness coach for LEVEL UP SYSTEM. Always return valid JSON only with zero extra commentary.';

  const userPrompt = `Create a 5-stage progressive Dream Roadmap for this user:
- Name: ${player.name}
- Profession/Role: ${player.profession}
- Main Dream Goal: "${player.goal}"
- Current Level: ${player.level}, Target Level: ${player.targetLevel}
- Daily Time Budget: ${bd.total} minutes/day (${bd.study}m Study, ${bd.work}m Work, ${bd.fitness}m Fitness)
- Biometrics: BMI ${player.bio.bmi} (${player.bio.bmiCategory}), Protein Target ${player.bio.proteinTarget}g/day
- Language: ${lang === 'id' ? 'Bahasa Indonesia' : 'English'}

Return ONLY a valid JSON object matching this exact structure:
{
  "coachAdvice": "1-2 sentences of actionable, motivating coaching advice tailored to their goal and daily schedule",
  "steps": [
    {
      "phase": "Tahap 1: ...",
      "title": "Concrete measurable milestone title",
      "coachTip": "Practical tip for completing this milestone",
      "targetLevel": 3,
      "targetMinutes": 240,
      "skillName": "Short core skill name (2-4 words)"
    }
  ]
}
Make sure there are exactly 5 steps whose targetLevel increases smoothly up to ${player.targetLevel}.`;

  try {
    const res = await callOpenAICompatible(config, systemPrompt, userPrompt, 0.65, 'roadmap');
    const parsed = extractJsonObject<{
      coachAdvice?: string;
      steps?: Array<{
        phase?: string;
        title?: string;
        coachTip?: string;
        targetLevel?: number;
        targetMinutes?: number;
        skillName?: string;
      }>;
    }>(res.content);

    if (parsed && Array.isArray(parsed.steps) && parsed.steps.length >= 3) {
      const steps: DreamStep[] = parsed.steps.slice(0, 6).map((s, idx) => {
        const prevStep = player.dreamSteps[idx];
        const fallbackLvl = Math.max(
          2,
          Math.round(((idx + 1) / parsed.steps!.length) * player.targetLevel)
        );
        return {
          id: `ds_ai_${Date.now()}_${idx}`,
          phase:
            s.phase?.trim() ||
            (lang === 'id' ? `Tahap ${idx + 1}` : `Phase ${idx + 1}`),
          title:
            s.title?.trim() ||
            (lang === 'id' ? `Langkah #${idx + 1} menuju impian` : `Milestone #${idx + 1}`),
          coachTip:
            s.coachTip?.trim() ||
            (lang === 'id'
              ? 'Kerjakan fokus sesuai breakdown durasi harianmu.'
              : 'Execute focused sessions following your daily duration split.'),
          targetLevel: Math.max(
            2,
            Math.min(player.targetLevel, Number(s.targetLevel) || fallbackLvl)
          ),
          studyMinutes: bd.study,
          workMinutes: bd.work,
          targetMinutes: Math.max(
            90,
            Math.min(1800, Number(s.targetMinutes) || (bd.study + bd.work) * (idx + 2))
          ),
          completedMinutes: prevStep?.completedMinutes ?? 0,
          skillName: (s.skillName?.trim() || 'Core Mastery').slice(0, 42),
          completed: prevStep?.completed ?? false,
        };
      });

      return {
        dreamSteps: steps,
        coachAdvice: parsed.coachAdvice?.trim() || player.coachAdvice,
        usedFallback: false,
        viaSharedProxy: res.viaSharedProxy,
        remainingToday: res.remainingToday,
      };
    }

    throw new Error('Invalid JSON structure returned by AI');
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    return {
      dreamSteps: createDefaultDreamSteps(
        player.goal,
        player.profession,
        player.targetLevel,
        bd,
        lang
      ),
      coachAdvice: player.coachAdvice,
      usedFallback: true,
      errorMessage: rawMsg === 'API_KEY_MISSING' || rawMsg === 'PROXY_UNAVAILABLE' ? undefined : rawMsg,
    };
  }
}

// =========================================================================
// 2. AI SYNCED DAILY QUESTS GENERATOR
// =========================================================================
export async function generateAIQuests(
  player: PlayerProfile,
  lang: Language,
  config: AIConfig
): Promise<{
  quests: Quest[];
  usedFallback: boolean;
  viaSharedProxy?: boolean;
  remainingToday?: number;
  errorMessage?: string;
}> {
  const activeStep =
    player.dreamSteps.find((s) => !s.completed) || player.dreamSteps[0];
  const bd = player.dailyBreakdown;
  const recMult = getRecoveryMultiplier(player.sleepCondition, player.nutritionCondition);

  const systemPrompt =
    'You are an evidence-based daily habit & training planner for LEVEL UP SYSTEM. Always return valid JSON only.';

  const userPrompt = `Generate 4 concrete daily tasks (1 STUDY, 1 CAREER, 2 FITNESS) synced to this user's active goal and body condition:
- Profession: ${player.profession}
- Main Goal: "${player.goal}"
- Active Dream Milestone: "${activeStep.title}" (Core Skill: "${activeStep.skillName}")
- Daily Duration Targets: Study ${bd.study}m, Work ${bd.work}m, Fitness ${bd.fitness}m
- Biometrics: Age ${player.age}, Height ${player.height}cm, Weight ${player.weight}kg, BMI ${player.bio.bmi} (${player.bio.bmiCategory})
- Today's Recovery Multiplier: ${recMult}x (Sleep: ${player.sleepCondition}, Nutrition: ${player.nutritionCondition}) — if < 0.9x make fitness slightly gentler/mobility-oriented!
- Language: ${lang === 'id' ? 'Bahasa Indonesia' : 'English'}

Return ONLY valid JSON:
{
  "quests": [
    {
      "title": "Specific actionable task title",
      "category": "STUDY" | "CAREER" | "FITNESS",
      "unitType": "MINUTES" | "REPS",
      "defaultQty": 45,
      "estMinutes": 20,
      "skillTag": "Short skill name (2-4 words)",
      "exp": 45,
      "gold": 40
    }
  ]
}`;

  try {
    const res = await callOpenAICompatible(config, systemPrompt, userPrompt, 0.7, 'quests');
    const parsed = extractJsonObject<{
      quests?: Array<{
        title?: string;
        category?: string;
        unitType?: string;
        defaultQty?: number;
        estMinutes?: number;
        skillTag?: string;
        exp?: number;
        gold?: number;
      }>;
    }>(res.content);

    if (parsed && Array.isArray(parsed.quests) && parsed.quests.length >= 3) {
      const now = Date.now();
      const quests: Quest[] = parsed.quests.slice(0, 6).map((q, idx) => {
        const cat =
          q.category === 'STUDY' || q.category === 'CAREER' || q.category === 'FITNESS'
            ? q.category
            : idx === 0
              ? 'STUDY'
              : idx === 1
                ? 'CAREER'
                : 'FITNESS';
        const unitType = q.unitType === 'REPS' ? 'REPS' : 'MINUTES';
        const defaultQty = Math.max(
          10,
          Math.min(
            240,
            Math.round(
              Number(q.defaultQty) ||
                (cat === 'STUDY' ? bd.study : cat === 'CAREER' ? bd.work : 30)
            )
          )
        );
        return {
          id: `ai_q_${now}_${idx}`,
          title: (q.title || 'Focused Session').trim().slice(0, 140),
          category: cat,
          unitType,
          defaultQty,
          estMinutes:
            unitType === 'REPS'
              ? Math.max(10, Math.round(Number(q.estMinutes) || Math.round(bd.fitness / 2)))
              : defaultQty,
          skillTag: (q.skillTag || activeStep.skillName).trim().slice(0, 48),
          dreamStepId: cat === 'FITNESS' ? null : activeStep.id,
          exp: Math.max(25, Math.min(90, Math.round(Number(q.exp) || 45))),
          gold: Math.max(20, Math.min(80, Math.round(Number(q.gold) || 35))),
          completed: false,
        };
      });

      return {
        quests,
        usedFallback: false,
        viaSharedProxy: res.viaSharedProxy,
        remainingToday: res.remainingToday,
      };
    }

    throw new Error('Invalid quests JSON structure');
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    return {
      quests: createSyncedQuestsForActiveStep(activeStep, bd, lang),
      usedFallback: true,
      errorMessage: rawMsg === 'API_KEY_MISSING' || rawMsg === 'PROXY_UNAVAILABLE' ? undefined : rawMsg,
    };
  }
}

// =========================================================================
// 3. AI LOCAL DEALS, INTERNET FREEBIES & GROWTH NEWS DISCOVERY
// =========================================================================
export async function discoverPerksAndOpportunities(
  player: PlayerProfile,
  lang: Language,
  config: AIConfig
): Promise<{
  perks: DiscoveredPerk[];
  news: GrowthNewsItem[];
  usedFallback: boolean;
  viaSharedProxy?: boolean;
  remainingToday?: number;
  errorMessage?: string;
}> {
  const city = player.city || 'Surabaya';
  const interest = player.rewardInterest || player.profession;

  const systemPrompt =
    'You are a practical career opportunities, free learning resources, and local lifestyle perk curator. Always return valid JSON only. Only include real, well-known official URLs when confident; otherwise leave sourceUrl empty string.';

  const userPrompt = `Recommend personalized rewards, freebies, and growth opportunities for this user:
- City / Area: ${city}
- Profession: ${player.profession}
- Main Goal: "${player.goal}"
- Reward & Freebie Interests: "${interest}"
- Language: ${lang === 'id' ? 'Bahasa Indonesia' : 'English'}

Return ONLY valid JSON:
{
  "perks": [
    {
      "type": "${lang === 'id' ? 'DISKON SEKITAR' : 'LOCAL DEAL'}" or "${lang === 'id' ? 'KLAIM GRATIS' : 'INTERNET FREEBIE'}",
      "title": "Short compelling title",
      "desc": "Brief benefit description (max 18 words)",
      "cost": 0,
      "actionTip": "Practical step to claim or enjoy it",
      "sourceUrl": ""
    }
  ],
  "news": [
    {
      "tag": "${lang === 'id' ? 'PELUANG / BEASISWA / INSIGHT' : 'OPPORTUNITY / GRANT / INSIGHT'}",
      "title": "Compelling opportunity or trend title",
      "summary": "Why it helps the user level up (max 20 words)",
      "actionTask": "Concrete 45-minute task title to act on this opportunity",
      "sourceUrl": ""
    }
  ]
}
Provide 4 perks (2 local deals for ${city} with cost 50-90 CR, 2 free internet resources/tools with cost 0) and 3 growth opportunities.`;

  try {
    const res = await callOpenAICompatible(config, systemPrompt, userPrompt, 0.7, 'perks');
    const parsed = extractJsonObject<{
      perks?: Array<{
        type?: string;
        title?: string;
        desc?: string;
        cost?: number;
        actionTip?: string;
        sourceUrl?: string;
      }>;
      news?: Array<{
        tag?: string;
        title?: string;
        summary?: string;
        actionTask?: string;
        sourceUrl?: string;
      }>;
    }>(res.content);

    if (parsed && Array.isArray(parsed.perks) && parsed.perks.length > 0) {
      const now = Date.now();
      const perks: DiscoveredPerk[] = parsed.perks.slice(0, 6).map((p, idx) => {
        const upperType = (p.type || '').toUpperCase();
        const isFree = upperType.includes('GRATIS') || upperType.includes('FREE');
        return {
          id: `ai_perk_${now}_${idx}`,
          type:
            p.type?.trim() ||
            (idx < 2
              ? lang === 'id'
                ? 'DISKON SEKITAR'
                : 'LOCAL DEAL'
              : lang === 'id'
                ? 'KLAIM GRATIS'
                : 'INTERNET FREEBIE'),
          title: (p.title || 'Recommended Perk').trim().slice(0, 120),
          desc: (p.desc || '').trim().slice(0, 220),
          cost:
            typeof p.cost === 'number' && p.cost >= 0
              ? Math.round(p.cost)
              : isFree
                ? 0
                : 60,
          actionTip: (p.actionTip || '').trim().slice(0, 300),
          sourceUrl:
            p.sourceUrl && p.sourceUrl.startsWith('http') ? p.sourceUrl.trim() : undefined,
        };
      });

      const news: GrowthNewsItem[] =
        Array.isArray(parsed.news) && parsed.news.length > 0
          ? parsed.news.slice(0, 5).map((n, idx) => ({
              id: `ai_news_${now}_${idx}`,
              tag: (n.tag || (lang === 'id' ? 'PELUANG' : 'OPPORTUNITY')).trim().slice(0, 32),
              title: (n.title || 'Growth Opportunity').trim().slice(0, 140),
              summary: (n.summary || '').trim().slice(0, 240),
              actionTask: (n.actionTask || `Pelajari: ${n.title}`).trim().slice(0, 140),
              sourceUrl:
                n.sourceUrl && n.sourceUrl.startsWith('http') ? n.sourceUrl.trim() : undefined,
            }))
          : getDefaultGrowthNews(city, player.profession, player.goal, lang);

      return {
        perks,
        news,
        usedFallback: false,
        viaSharedProxy: res.viaSharedProxy,
        remainingToday: res.remainingToday,
      };
    }

    throw new Error('Invalid perks/news JSON structure');
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    return {
      perks: getDefaultDiscoveredPerks(city, player.profession, interest, lang),
      news: getDefaultGrowthNews(city, player.profession, player.goal, lang),
      usedFallback: true,
      errorMessage: rawMsg === 'API_KEY_MISSING' || rawMsg === 'PROXY_UNAVAILABLE' ? undefined : rawMsg,
    };
  }
}
