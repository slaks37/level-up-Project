import React, { useMemo, useState } from 'react';
import { Bot, Lock, PlusCircle, Send, ShieldCheck, Sparkles } from 'lucide-react';
import type { Language, PlayerProfile, Quest } from '../types';
import {
  buildScopedAgnesContext,
  type AgnesExpertiseMode,
  type UserPrivacySettings,
} from '../engine/v2/privacy';
import { getActiveDreamStep } from '../engine/coaching';
import type { DevelopmentDimension } from '../engine/v2/dimensions';

interface AgnesCopilotWorkspaceProps {
  player: PlayerProfile;
  lang: Language;
  privacySettings: UserPrivacySettings;
  privateJournalNotes: string[];
  healthMetrics: { sleepHours?: number | null; mood?: string; energy?: string; hasPainAlert?: boolean };
  calendarEventTitles: string[];
  onAddQuest: (quest: Quest) => void;
  onOpenPrivacySettings: () => void;
}

interface ModeMeta {
  id: AgnesExpertiseMode;
  labelId: string;
  labelEn: string;
  dimension: DevelopmentDimension;
  promptHintId: string;
  promptHintEn: string;
}

const MODE_CATALOG: readonly ModeMeta[] = [
  { id: 'personal_coach', labelId: 'Personal Coach', labelEn: 'Personal Coach', dimension: 'PURPOSE', promptHintId: 'Bantu aku menata prioritas misi & kebiasaan minggu ini', promptHintEn: 'Help align my purpose and weekly habits' },
  { id: 'career_coach', labelId: 'Career Coach', labelEn: 'Career Coach', dimension: 'CAREER', promptHintId: 'Susun strategi naik peran dan urai hambatan proyek kerja', promptHintEn: 'Plan career advancement and unblock project work' },
  { id: 'learning_tutor', labelId: 'Learning Tutor', labelEn: 'Learning Tutor', dimension: 'SKILLS', promptHintId: 'Jelaskan konsep HPP vs Margin dan latihan soalnya', promptHintEn: 'Explain COGS vs Margin with practice exercises' },
  { id: 'business_mentor', labelId: 'Business Mentor', labelEn: 'Business Mentor', dimension: 'BUSINESS', promptHintId: 'Kritisi asumsi model bisnis & susun eksperimen validasi', promptHintEn: 'Challenge BMC assumptions & design validation test' },
  { id: 'marketing_advisor', labelId: 'Marketing Advisor', labelEn: 'Marketing Advisor', dimension: 'BUSINESS', promptHintId: 'Rancang pesan produk & kampanye 7 hari untuk pembeli awal', promptHintEn: 'Draft value messaging & 7-day launch campaign' },
  { id: 'financial_assistant', labelId: 'Financial Assistant', labelEn: 'Financial Assistant', dimension: 'FINANCIAL', promptHintId: 'Cek kesehatan struktur biaya & arus kas sebelum skala', promptHintEn: 'Review cost structure & cash flow health' },
  { id: 'wellness_companion', labelId: 'Wellness Companion', labelEn: 'Wellness Companion', dimension: 'HEALTH', promptHintId: 'Bantu atur ritme tidur, pemulihan, dan workout ringan', promptHintEn: 'Balance sleep recovery and sustainable workouts' },
  { id: 'export_assistant', labelId: 'Export Assistant', labelEn: 'Export Assistant', dimension: 'BUSINESS', promptHintId: 'Apa langkah awal menyiapkan dokumen ekspor B2B & MOQ?', promptHintEn: 'First steps for B2B export documentation & MOQ' },
  { id: 'impact_advisor', labelId: 'Impact Advisor', labelEn: 'Impact Advisor', dimension: 'IMPACT', promptHintId: 'Cara mengukur dampak sosial komunitas yang bisa diverifikasi', promptHintEn: 'How to measure verifiable community social impact' },
  { id: 'daily_planner', labelId: 'Daily Planner', labelEn: 'Daily Planner', dimension: 'CAREER', promptHintId: 'Rancang jadwal harian 2 jalur (Karier + Impian) hari ini', promptHintEn: 'Build a dual-track Career + Dream schedule today' },
] as const;

interface CopilotMessage {
  id: string;
  role: 'user' | 'agnes';
  mode: AgnesExpertiseMode;
  text: string;
  suggestedAction?: string;
  originTag?: 'ai_assumption';
}

function buildDeterministicCopilotReply(
  mode: ModeMeta,
  question: string,
  scoped: ReturnType<typeof buildScopedAgnesContext>,
  lang: Language
): { text: string; suggestedAction: string } {
  const id = lang === 'id';
  const focusStep = scoped.activeDreamStepTitle || scoped.goal;
  const header = id
    ? `[Mode: ${mode.labelId} · Output berstatus Asumsi AI — verifikasi lewat praktik nyata]`
    : `[Mode: ${mode.labelEn} · Tagged as AI Assumption — verify via real-world action]`;

  if (mode.id === 'financial_assistant') {
    return {
      text: id
        ? `${header}\n\nUntuk pertanyaanmu ("${question.slice(0, 120)}"), gunakan perhitungan deterministik di **Business Studio → Kalkulator HPP, BEP & Arus Kas** (jangan mengandalkan taksiran AI untuk angka rupiah akhir).\n1. Pastikan bahan baku, tenaga kerja, dan overhead per batch terpisah.\n2. Cek Margin Kotor minimal 30% sebelum promosi.\n3. Bandingkan target penjualan bulanan dengan titik BEP.`
        : `${header}\n\nFor "${question.slice(0, 120)}", always use the deterministic **Business Studio → HPP, BEP & Cash Flow Calculators** rather than probabilistic AI estimates.\n1. Separate direct materials, labor, and overhead.\n2. Target healthy contribution margin before discounting.\n3. Compare monthly projected units against Break-Even.`,
      suggestedAction: id
        ? 'Validasi angka HPP & BEP aktual di Business Studio (25m)'
        : 'Validate actual HPP & BEP numbers in Business Studio (25m)',
    };
  }

  if (mode.id === 'wellness_companion') {
    const hasHealth = Boolean(scoped.healthMetrics);
    return {
      text: id
        ? `${header}\n\n${hasHealth ? `Metrik energi/tidur terizin aktif (tidur: ${scoped.healthMetrics?.sleepHours ?? '-'} jam, mood: ${scoped.healthMetrics?.mood || '-'}).` : 'Metrik kesehatan & jurnal pribadi tetap TERKUNCI (privasi aktif).'}\nFokus hari ini: pilih 1 sesi gerak ringan 15 menit, jaga hidrasi, dan hentikan latihan segera jika muncul nyeri.`
        : `${header}\n\n${hasHealth ? `Consented wellness metrics active (sleep: ${scoped.healthMetrics?.sleepHours ?? '-'}h, mood: ${scoped.healthMetrics?.mood || '-'}).` : 'Health metrics & private journals stay LOCKED by default.'}\nToday's focus: pick one 15-minute light movement block, stay hydrated, and pause immediately if any pain occurs.`,
      suggestedAction: id
        ? 'Sesi pemulihan & jalan santai 15 menit tanpa memaksakan nyeri'
        : '15-minute recovery walk without pushing through pain',
    };
  }

  return {
    text: id
      ? `${header}\n\nKonteks aktif: Profesi **${scoped.profession}** · Fokus impian: **${focusStep}**.\nTiga langkah konkret untuk "${question.slice(0, 120)}":\n1. Pecah masalah menjadi 1 eksperimen atau deliverable kecil berdurasi 20–30 menit.\n2. Uji langsung ke 1–3 orang/pelanggan nyata agar berubah dari Asumsi AI menjadi Bukti Lapangan.\n3. Simpan hasilnya di Evidence Vault agar progres Kompetensi & Business Level terverifikasi.`
      : `${header}\n\nActive context: **${scoped.profession}** · Dream focus: **${focusStep}**.\nThree concrete steps for "${question.slice(0, 120)}":\n1. Narrow this into one 20–30 minute deliverable or micro-experiment.\n2. Test with 1–3 real users/stakeholders to turn AI assumptions into validated field evidence.\n3. Log proof in the Evidence Vault for verified Competency & Business Level credit.`,
    suggestedAction: id
      ? `Eksekusi 1 langkah nyata (${mode.labelId}): ${question.slice(0, 75)}`
      : `Execute 1 real step (${mode.labelEn}): ${question.slice(0, 75)}`,
  };
}

export const AgnesCopilotWorkspace: React.FC<AgnesCopilotWorkspaceProps> = ({
  player,
  lang,
  privacySettings,
  privateJournalNotes,
  healthMetrics,
  calendarEventTitles,
  onAddQuest,
  onOpenPrivacySettings,
}) => {
  const id = lang === 'id';
  const [modeId, setModeId] = useState<AgnesExpertiseMode>('business_mentor');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const activeMode = MODE_CATALOG.find((m) => m.id === modeId) ?? MODE_CATALOG[0];
  const activeStep = getActiveDreamStep(player);

  const scopedPreview = useMemo(
    () =>
      buildScopedAgnesContext(
        modeId,
        {
          goal: player.goal,
          profession: player.profession,
          pathwayId: player.pathwayId,
          activeDreamStepTitle: activeStep?.title,
          pendingQuestTitles: player.quests.filter((q) => !q.completed).map((q) => q.title),
          privateJournalNotes,
          healthMetrics,
          calendarEventTitles,
        },
        privacySettings
      ),
    [modeId, player, activeStep, privateJournalNotes, healthMetrics, calendarEventTitles, privacySettings]
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean) return;
    const reply = buildDeterministicCopilotReply(activeMode, clean, scopedPreview, lang);
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', mode: modeId, text: clean },
      {
        id: `a_${Date.now() + 1}`,
        role: 'agnes',
        mode: modeId,
        text: reply.text,
        suggestedAction: reply.suggestedAction,
        originTag: 'ai_assumption',
      },
    ]);
    setPrompt('');
  };

  return (
    <section className="anime-panel overflow-hidden border border-sky-200 bg-white">
      <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-slate-800 flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-sky-600" />
          {id
            ? 'AGNES AI 2.0 · 10 MODE COPILOT DENGAN BATAS PRIVASI KETAT'
            : 'AGNES AI 2.0 · 10-MODE COPILOT WITH STRICT PRIVACY BOUNDARIES'}
        </span>
        <button
          type="button"
          onClick={onOpenPrivacySettings}
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 flex items-center gap-1"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>{id ? 'Atur Izin Data' : 'Manage Consent'}</span>
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        {/* 10 Mode Selector */}
        <div className="flex flex-wrap gap-1.5">
          {MODE_CATALOG.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModeId(m.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-hud font-bold border transition ${
                modeId === m.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-400'
              }`}
            >
              {id ? m.labelId : m.labelEn}
            </button>
          ))}
        </div>

        {/* Live Data-Access Boundary Transparency Bar */}
        <div className="rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 flex flex-wrap items-center gap-2 text-[10px] text-emerald-950">
          <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="font-bold">{id ? 'Batas Data Mode Ini:' : 'Active Mode Data Boundary:'}</span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-white border border-emerald-200">
            {id ? 'PII Disensor: AKTIF' : 'PII Redaction: ON'}
          </span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-white border border-emerald-200">
            {id ? 'Jurnal Pribadi:' : 'Private Journal:'}{' '}
            {scopedPreview.privateJournalNotes ? (id ? 'DIIZINKAN' : 'CONSENTED') : (id ? 'DIBLOKIR' : 'BLOCKED')}
          </span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-white border border-emerald-200">
            {id ? 'Metrik Kesehatan:' : 'Health Metrics:'}{' '}
            {scopedPreview.healthMetrics ? (id ? 'DIIZINKAN' : 'CONSENTED') : (id ? 'DIBLOKIR' : 'BLOCKED')}
          </span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950">
            {id ? 'Tidak mengubah Koin/Level otomatis' : 'Read-only (No auto coin/level writes)'}
          </span>
        </div>

        {/* Chat Stream */}
        <div className="rounded border border-slate-200 bg-slate-50 p-3 min-h-[220px] max-h-[380px] overflow-y-auto space-y-2.5">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-sky-600 mx-auto" />
              <p className="font-bold text-slate-800">
                {id ? `Agnes siap membantu dalam mode ${activeMode.labelId}` : `Agnes ready in ${activeMode.labelEn} mode`}
              </p>
              <button
                type="button"
                onClick={() => setPrompt(id ? activeMode.promptHintId : activeMode.promptHintEn)}
                className="px-3 py-1.5 rounded border border-sky-300 bg-white hover:bg-sky-50 text-sky-900 font-semibold text-[11px]"
              >
                “{id ? activeMode.promptHintId : activeMode.promptHintEn}”
              </button>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded border text-xs whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white border-slate-900 ml-8'
                    : 'bg-white text-slate-800 border-slate-200 mr-4'
                }`}
              >
                {msg.originTag && (
                  <span className="inline-block mb-1.5 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                    {id ? 'ASUMSI AI · BELUM TERVALIDASI' : 'AI ASSUMPTION · UNVALIDATED'}
                  </span>
                )}
                <p>{msg.text}</p>
                {msg.suggestedAction && (
                  <button
                    type="button"
                    onClick={() =>
                      onAddQuest({
                        id: `agnes_v2_${Date.now()}`,
                        title: msg.suggestedAction!.slice(0, 140),
                        category: activeMode.dimension === 'HEALTH' ? 'FITNESS' : activeMode.dimension === 'SKILLS' ? 'STUDY' : 'CAREER',
                        dimension: activeMode.dimension,
                        unitType: 'MINUTES',
                        defaultQty: 20,
                        estMinutes: 20,
                        skillTag: activeMode.labelId,
                        dreamStepId: activeStep?.id ?? null,
                        exp: 20,
                        gold: 1,
                        completed: false,
                      })
                    }
                    className="mt-2 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-[10px] inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>{id ? 'Tambahkan sebagai Tugas Harian' : 'Add as Daily Quest'}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={id ? activeMode.promptHintId : activeMode.promptHintEn}
            className="flex-grow rounded border border-slate-300 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-sky-700 disabled:opacity-50 text-white font-hud font-bold text-xs uppercase flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{id ? 'Kirim' : 'Send'}</span>
          </button>
        </form>
      </div>
    </section>
  );
};
