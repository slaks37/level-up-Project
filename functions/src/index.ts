import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'stefenlaksana.sl@gmail.com').toLowerCase();

interface AuthedReq extends Request {
  user?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    isAdmin: boolean;
  };
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '256kb' }));

async function getAIConfig() {
  const snap = await db.doc('adminSecrets/aiProvider').get();
  const data = snap.exists ? snap.data() || {} : {};
  return {
    baseUrl: String(data.baseUrl || process.env.AGNES_AI_BASE_URL || 'https://apihub.agnes-ai.com/v1').trim(),
    model: String(data.model || process.env.AGNES_AI_MODEL || 'agnes-2.5-flash').trim(),
    apiKey: String(data.apiKey || process.env.AGNES_AI_API_KEY || '').trim(),
    enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
    dailyLimit: typeof data.dailyLimit === 'number' ? data.dailyLimit : Number(process.env.DEFAULT_DAILY_LIMIT || 20),
  };
}

function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function requireAuth(req: AuthedReq, res: Response, next: NextFunction): Promise<void> {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(token, true);
    const email = (decoded.email || '').toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    let isAdmin = Boolean(email === ADMIN_EMAIL && emailVerified);
    if (!isAdmin) {
      const adminDoc = await db.doc(`admins/${decoded.uid}`).get();
      if (adminDoc.exists) isAdmin = true;
    }
    req.user = { uid: decoded.uid, email, emailVerified, isAdmin };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
}

app.get('/api/health', async (_req: Request, res: Response) => {
  const cfg = await getAIConfig();
  res.json({
    ok: true,
    proxyMode: 'firebase-cloud-functions-v2',
    sharedAiConfigured: Boolean(cfg.apiKey),
    enabled: cfg.enabled,
    model: cfg.model,
    dailyLimit: cfg.dailyLimit,
  });
});

app.post('/api/admin/test-ai', requireAuth, async (req: AuthedReq, res: Response) => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const current = await getAIConfig();
  const baseUrl = String(req.body?.baseUrl || current.baseUrl).replace(/\/+$/, '');
  const model = String(req.body?.model || current.model);
  const apiKey = String(req.body?.apiKey || current.apiKey).trim();
  if (!apiKey) {
    res.status(400).json({ ok: false, error: 'Missing API Key' });
    return;
  }

  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  const start = Date.now();
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{ role: 'user', content: 'Reply with: LEVEL UP FUNCTIONS OK' }],
      }),
    });
    const latencyMs = Date.now() - start;
    if (!upstream.ok) {
      res.status(502).json({ ok: false, latencyMs, error: `HTTP ${upstream.status}` });
      return;
    }
    const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
    res.json({ ok: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'OK' });
  } catch (err) {
    res.status(502).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/ai/chat', requireAuth, async (req: AuthedReq, res: Response) => {
  const user = req.user!;
  const cfg = await getAIConfig();
  if (!cfg.enabled && !user.isAdmin) {
    res.status(503).json({ error: 'Shared AI is currently disabled by Admin.' });
    return;
  }
  if (!cfg.apiKey) {
    res.status(503).json({ error: 'Admin has not configured Agnes AI API key yet.' });
    return;
  }

  const today = getTodayDateKey();
  const userRef = db.doc(`users/${user.uid}`);
  const userSnap = await userRef.get();
  const uData = userSnap.exists ? userSnap.data() || {} : {};
  if (uData.status === 'suspended' && !user.isAdmin) {
    res.status(403).json({ error: 'Account suspended by Admin.' });
    return;
  }

  const prevToday = uData.aiQuotaDate === today ? Number(uData.aiRequestsToday || 0) : 0;
  if (!user.isAdmin && cfg.dailyLimit > 0 && prevToday >= cfg.dailyLimit) {
    res.status(429).json({
      error: `Daily AI quota reached (${prevToday}/${cfg.dailyLimit}).`,
    });
    return;
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (messages.length === 0 || messages.length > 10) {
    res.status(400).json({ error: 'Invalid messages array' });
    return;
  }

  const feature = String(req.body?.feature || 'chat').slice(0, 32);
  const endpoint = cfg.baseUrl.replace(/\/+$/, '').endsWith('/chat/completions')
    ? cfg.baseUrl.replace(/\/+$/, '')
    : `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const start = Date.now();

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: typeof req.body?.temperature === 'number' ? req.body.temperature : 0.65,
        messages,
      }),
    });

    const latencyMs = Date.now() - start;
    if (!upstream.ok) {
      await db.collection('aiUsageLogs').add({
        uid: user.uid,
        email: user.email,
        feature,
        model: cfg.model,
        status: 'error',
        latencyMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(502).json({ error: `Upstream AI error HTTP ${upstream.status}` });
      return;
    }

    const data = (await upstream.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI completion');

    const nextToday = prevToday + 1;
    if (userSnap.exists) {
      await userRef.update({
        aiQuotaDate: today,
        aiRequestsToday: nextToday,
        aiTotalRequests: Number(uData.aiTotalRequests || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await db.collection('aiUsageLogs').add({
      uid: user.uid,
      email: user.email,
      feature,
      model: data.model || cfg.model,
      status: 'ok',
      latencyMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      content,
      model: data.model || cfg.model,
      usage: {
        usedToday: nextToday,
        dailyLimit: cfg.dailyLimit,
        remainingToday: Math.max(0, cfg.dailyLimit - nextToday),
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Proxy failure' });
  }
});

export const api = onRequest({ region: 'asia-southeast2', maxInstances: 10 }, app);
