import { Router, type Request, type Response, type NextFunction } from 'express';

export type AgnesMode =
  | 'personal_coach'
  | 'career_coach'
  | 'learning_tutor'
  | 'business_mentor'
  | 'marketing_advisor'
  | 'financial_assistant'
  | 'wellness_companion'
  | 'export_assistant'
  | 'impact_advisor'
  | 'daily_planner';

export const ALLOWED_AGNES_MODES = new Set<AgnesMode>([
  'personal_coach',
  'career_coach',
  'learning_tutor',
  'business_mentor',
  'marketing_advisor',
  'financial_assistant',
  'wellness_companion',
  'export_assistant',
  'impact_advisor',
  'daily_planner',
]);

const JOURNAL_ALLOWED_MODES = new Set<AgnesMode>(['personal_coach', 'wellness_companion']);
const HEALTH_ALLOWED_MODES = new Set<AgnesMode>(['wellness_companion', 'daily_planner']);

const ALLOWED_UPSTREAM_AI_HOSTS = new Set([
  'apihub.agnes-ai.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
]);

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+62|62|0)8[1-9](?:[\s-]?\d){6,11}\b/g;
const NIK_RE = /\b\d{16}\b/g;

export function redactServerPii(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(PHONE_RE, '[REDACTED_PHONE]')
    .replace(NIK_RE, '[REDACTED_ID]');
}

/**
 * SSRF protection (SEC-03): only allow HTTPS requests to explicitly vetted AI provider hosts.
 */
export function isAllowedUpstreamAiUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_UPSTREAM_AI_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export interface ServerPrivacyConsent {
  sharePrivateJournalWithAgnes: boolean;
  shareHealthMetricsWithAgnes: boolean;
}

export interface AgnesV2RouterDeps {
  requireAuth: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  getPrivacyConsent: (uid: string) => Promise<ServerPrivacyConsent>;
  getAiConfig: () => Promise<{ baseUrl: string; model: string; apiKey: string; enabled: boolean; dailyLimit: number }>;
  consumeQuota: (uid: string, email: string, dailyLimit: number) => Promise<{ allowed: boolean; usedToday: number; dailyLimit: number; suspended?: boolean }>;
  recordAudit: (entry: { uid: string; email: string; feature: string; model: string; status: 'ok' | 'error' | 'quota_exceeded'; latencyMs: number }) => Promise<void>;
  callUpstream?: (endpoint: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string) => Promise<string>;
}

const MODE_SYSTEM_PROMPTS: Record<AgnesMode, string> = {
  personal_coach: 'You are Agnes Personal Coach. Help clarify purpose and habits. Treat all suggestions as hypotheses, never medical therapy.',
  career_coach: 'You are Agnes Career Coach. Help unblock projects, plan sprints, and build career portfolio outputs.',
  learning_tutor: 'You are Agnes Learning Tutor. Explain concepts clearly, never leak graded quiz answers, and suggest hands-on practice.',
  business_mentor: 'You are Agnes Business Mentor. Challenge assumptions critically and push for low-cost real-world validation experiments.',
  marketing_advisor: 'You are Agnes Marketing Advisor. Help craft honest value messaging and measurable weekly acquisition tests.',
  financial_assistant: 'You are Agnes Financial Assistant. Explain COGS, Break-Even, and Cash Flow concepts; remind users to trust deterministic Business Studio calculators for final math.',
  wellness_companion: 'You are Agnes Wellness Companion. Support sustainable sleep, nutrition, and light movement. Never diagnose illness; advise stopping on pain.',
  export_assistant: 'You are Agnes Export Assistant. Guide HS Codes, MOQ, Incoterms, packaging, and compliance checklists.',
  impact_advisor: 'You are Agnes Impact Advisor. Help define measurable, verifiable community and SDG outcomes.',
  daily_planner: 'You are Agnes Daily Planner. Balance Career execution and Dream/Venture milestones into 15-30 minute concrete actions.',
};

export function createAgnesV2Router(deps: AgnesV2RouterDeps): Router {
  const router = Router();

  router.post('/assist', deps.requireAuth, async (req: Request, res: Response) => {
    const authed = (req as Request & { user?: { uid: string; email: string; isAdmin: boolean } }).user!;
    const body = (req.body || {}) as {
      mode?: string;
      lang?: 'id' | 'en';
      prompt?: string;
      context?: {
        goal?: string;
        profession?: string;
        activeDreamStep?: string;
        ventureSummary?: string;
        privateJournalNotes?: string[];
        healthMetrics?: Record<string, unknown>;
      };
    };

    const mode = body.mode as AgnesMode;
    if (!ALLOWED_AGNES_MODES.has(mode)) {
      res.status(400).json({ error: { code: 'INVALID_MODE', message: 'Unsupported Agnes AI 2.0 mode.' } });
      return;
    }

    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1200) : '';
    if (!rawPrompt) {
      res.status(400).json({ error: { code: 'EMPTY_PROMPT', message: 'Prompt is required.' } });
      return;
    }

    const cfg = await deps.getAiConfig();
    if (!cfg.enabled && !authed.isAdmin) {
      res.status(503).json({ error: { code: 'AI_DISABLED', message: 'Shared AI is currently paused by Admin.' } });
      return;
    }

    const consent = await deps.getPrivacyConsent(authed.uid);
    const allowJournal = JOURNAL_ALLOWED_MODES.has(mode) && consent.sharePrivateJournalWithAgnes;
    const allowHealth = HEALTH_ALLOWED_MODES.has(mode) && consent.shareHealthMetricsWithAgnes;

    // Server-side Privacy & PII Firewall — never trust client flags alone!
    const safeContext: Record<string, unknown> = {
      goal: redactServerPii(String(body.context?.goal || '').slice(0, 240)),
      profession: redactServerPii(String(body.context?.profession || '').slice(0, 140)),
      ...(body.context?.activeDreamStep ? { activeDreamStep: redactServerPii(String(body.context.activeDreamStep).slice(0, 200)) } : {}),
      ...(body.context?.ventureSummary && ['business_mentor', 'marketing_advisor', 'financial_assistant', 'export_assistant', 'impact_advisor'].includes(mode)
        ? { ventureSummary: redactServerPii(String(body.context.ventureSummary).slice(0, 400)) }
        : {}),
      ...(allowJournal && Array.isArray(body.context?.privateJournalNotes)
        ? { privateJournalNotes: body.context.privateJournalNotes.slice(0, 3).map((n) => redactServerPii(String(n).slice(0, 300))) }
        : {}),
      ...(allowHealth && body.context?.healthMetrics ? { healthMetrics: body.context.healthMetrics } : {}),
    };

    const quota = await deps.consumeQuota(authed.uid, authed.email, cfg.dailyLimit);
    if (!quota.allowed) {
      await deps.recordAudit({ uid: authed.uid, email: authed.email, feature: `agnes_v2:${mode}`, model: cfg.model, status: 'quota_exceeded', latencyMs: 0 });
      res.status(quota.suspended ? 403 : 429).json({
        error: { code: quota.suspended ? 'ACCOUNT_SUSPENDED' : 'QUOTA_EXCEEDED', message: 'Daily AI quota reached.' },
      });
      return;
    }

    const lang = body.lang === 'en' ? 'en' : 'id';
    const systemPrompt = `${MODE_SYSTEM_PROMPTS[mode]} Respond concisely in ${lang === 'en' ? 'English' : 'Indonesian'}. Never claim to modify coins, EXP, Competency Level, or Business Level.`;
    const sanitizedPrompt = redactServerPii(rawPrompt);
    const compositeUserPrompt = `Context: ${JSON.stringify(safeContext)}\n\nQuestion: ${sanitizedPrompt}`;

    const start = performance.now();
    try {
      let replyText: string;
      if (deps.callUpstream) {
        replyText = await deps.callUpstream(cfg.baseUrl, cfg.apiKey, cfg.model, systemPrompt, compositeUserPrompt);
      } else if (cfg.apiKey && isAllowedUpstreamAiUrl(cfg.baseUrl)) {
        const endpoint = cfg.baseUrl.replace(/\/+$/, '').endsWith('/chat/completions')
          ? cfg.baseUrl.replace(/\/+$/, '')
          : `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const upstream = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
          body: JSON.stringify({
            model: cfg.model,
            temperature: 0.35,
            max_tokens: 900,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: compositeUserPrompt },
            ],
          }),
        });
        if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
        const json = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
        replyText = json.choices?.[0]?.message?.content || '';
        if (!replyText) throw new Error('Empty AI completion');
      } else {
        replyText =
          lang === 'en'
            ? `[Deterministic Fallback · ${mode}] Focus on one 20-minute actionable step for "${safeContext.goal || 'your goal'}" and log real field evidence in the Evidence Vault.`
            : `[Fallback Deterministik · ${mode}] Fokus pada 1 aksi nyata 20 menit untuk "${safeContext.goal || 'tujuanmu'}" lalu simpan bukti lapangannya di Evidence Vault.`;
      }

      const latencyMs = Math.round(performance.now() - start);
      await deps.recordAudit({ uid: authed.uid, email: authed.email, feature: `agnes_v2:${mode}`, model: cfg.model, status: 'ok', latencyMs });
      res.json({
        mode,
        content: replyText,
        origin: 'ai_assumption',
        authoritative: false,
        piiRedacted: true,
        boundaries: {
          journalIncluded: Boolean(safeContext.privateJournalNotes),
          healthIncluded: Boolean(safeContext.healthMetrics),
        },
        usage: { usedToday: quota.usedToday, dailyLimit: quota.dailyLimit },
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      await deps.recordAudit({ uid: authed.uid, email: authed.email, feature: `agnes_v2:${mode}`, model: cfg.model, status: 'error', latencyMs });
      res.status(502).json({
        error: { code: 'AI_UPSTREAM_ERROR', message: err instanceof Error ? err.message : 'AI Gateway error' },
      });
    }
  });

  return router;
}
