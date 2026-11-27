import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Calculator,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  Plus,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Language, PlayerProfile, Quest } from '../types';
import {
  buildQuestFromStudioTool,
  BUSINESS_STUDIO_TOOLS,
  computeChecklistPct,
  loadLocalVenture,
  saveLocalVenture,
  type BusinessExperimentItem,
  type StudioCanvasId,
  type StudioWing,
  type VentureWorkspaceState,
} from '../engine/v2/businessStudio';
import {
  calculateBreakEven,
  calculateCashFlowProjection,
  calculateHppAndPricing,
} from '../engine/v2/studioCalculators';
import type { EvidenceOrigin } from '../engine/v2/progression';
import { getActiveDreamStep } from '../engine/coaching';
import type { DevelopmentDimension } from '../engine/v2/dimensions';
import { saveVentureToCloud } from '../services/firebaseService';
import { assertNoForbiddenPrivacyFields } from '../engine/v2/ecosystemContracts';

interface BusinessStudioWorkspaceProps {
  uid?: string;
  player: PlayerProfile;
  lang: Language;
  initialToolId?: StudioCanvasId;
  onAddQuest: (quest: Quest) => void;
  onOpenEvidenceModal: (opts: {
    dimension: DevelopmentDimension;
    targetType: 'business_milestone';
    targetId: string;
    title: string;
  }) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const WING_LABELS: Array<{ id: StudioWing; labelId: string; labelEn: string }> = [
  { id: 'discovery', labelId: '1. Discovery & Strategy (6)', labelEn: '1. Discovery & Strategy (6)' },
  { id: 'product_validation', labelId: '2. Product & Validation (2)', labelEn: '2. Product & Validation (2)' },
  { id: 'finance_ops', labelId: '3. Finance & Ops (5)', labelEn: '3. Finance & Ops (5)' },
  { id: 'growth_impact', labelId: '4. Legal, Export & Impact (3)', labelEn: '4. Legal, Export & Impact (3)' },
];

const ORIGIN_BADGE: Record<EvidenceOrigin, { id: string; en: string; cls: string }> = {
  user_input: { id: 'Input Pendiri', en: 'Founder Input', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
  ai_assumption: { id: 'Asumsi AI · Belum Tervalidasi', en: 'AI Assumption · Unvalidated', cls: 'bg-amber-100 text-amber-950 border-amber-300' },
  validated_evidence: { id: 'Bukti Lapangan Tervalidasi', en: 'Validated Field Evidence', cls: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
};

export const BusinessStudioWorkspace: React.FC<BusinessStudioWorkspaceProps> = ({
  uid,
  player,
  lang,
  initialToolId,
  onAddQuest,
  onOpenEvidenceModal,
  onNotify,
}) => {
  const id = lang === 'id';
  const [venture, setVenture] = useState<VentureWorkspaceState>(() => loadLocalVenture(uid, player.goal));
  const initialTool = BUSINESS_STUDIO_TOOLS.find((t) => t.id === initialToolId) ?? BUSINESS_STUDIO_TOOLS[0];
  const [activeWing, setActiveWing] = useState<StudioWing>(initialTool.wing);
  const [activeToolId, setActiveToolId] = useState<StudioCanvasId>(initialTool.id);

  // Experiment draft state
  const [expHypothesis, setExpHypothesis] = useState('');
  const [expMetric, setExpMetric] = useState('');
  const [expSample, setExpSample] = useState(10);

  const persistVenture = (next: VentureWorkspaceState) => {
    const stamped = { ...next, updatedAt: Date.now() };
    setVenture(stamped);
    saveLocalVenture(stamped, uid);
    if (uid) {
      void saveVentureToCloud(uid, stamped, player.pathwayId || 'sociopreneur').catch(() => {});
    }
  };

  const handlePrepareMarketplaceSubmission = () => {
    const legalTool = BUSINESS_STUDIO_TOOLS.find((t) => t.id === 'legal_readiness')!;
    const legalPct = computeChecklistPct(legalTool, venture.checklists.legal_readiness);
    const exportTool = BUSINESS_STUDIO_TOOLS.find((t) => t.id === 'export_readiness')!;
    const exportPct = computeChecklistPct(exportTool, venture.checklists.export_readiness);
    const hasPrototype = Boolean(venture.canvases.product_prototyping?.mvp_spec?.value?.trim());
    const hasHealthyPrice = hppResult.sellingPriceIdr > hppResult.hppPerUnitIdr;

    const payload = {
      submissionId: `sub_${venture.id}_${Date.now().toString(36)}`,
      venture: {
        levelupVentureId: venture.id,
        businessName: venture.name,
        sector: venture.sector,
        verifiedBusinessLevel: player.businessLevel ?? 0,
        legalReadinessPct: legalPct,
        exportReadinessPct: exportPct,
      },
      product: {
        suggestedRetailPriceIdr: hppResult.sellingPriceIdr,
        exportReady: exportPct >= 80,
      },
      consentRecord: {
        founderConsentedAt: new Date().toISOString(),
        consentVersion: 'marketplace_publish_v1',
      },
    };
    const firewall = assertNoForbiddenPrivacyFields(payload);
    if (!firewall.safe) {
      onNotify(id ? 'Pengajuan diblokir oleh firewall privasi.' : 'Submission blocked by privacy firewall.', 'error');
      return;
    }
    if (!hasPrototype || !hasHealthyPrice || legalPct < 50) {
      onNotify(
        id
          ? `Belum siap listing: pastikan Prototipe terisi, Harga Jual > HPP, dan Legal Readiness >= 50% (saat ini ${legalPct}%).`
          : `Not ready yet: complete Prototype spec, ensure Price > COGS, and reach Legal Readiness >= 50% (currently ${legalPct}%).`,
        'warning'
      );
      return;
    }
    onNotify(
      id
        ? `Paket kurasi produk "${venture.name}" valid & bebas data jurnal (Legal ${legalPct}%, Harga ${fmtIdr(hppResult.sellingPriceIdr)}) — siap dikirim ke Sociopreneur.online!`
        : `Product curation packet for "${venture.name}" verified & privacy-safe (Legal ${legalPct}%, Price ${fmtIdr(hppResult.sellingPriceIdr)}) — ready for Sociopreneur.online!`,
      'success'
    );
  };

  const wingTools = useMemo(
    () => BUSINESS_STUDIO_TOOLS.filter((t) => t.wing === activeWing),
    [activeWing]
  );

  const activeTool = useMemo(
    () => BUSINESS_STUDIO_TOOLS.find((t) => t.id === activeToolId) ?? wingTools[0],
    [activeToolId, wingTools]
  );

  const hppResult = useMemo(() => calculateHppAndPricing(venture.hppInput), [venture.hppInput]);
  const bepResult = useMemo(() => calculateBreakEven(venture.bepInput), [venture.bepInput]);
  const cashFlowResult = useMemo(
    () => calculateCashFlowProjection(venture.cashFlowStartingIdr, venture.cashFlowMonths),
    [venture.cashFlowStartingIdr, venture.cashFlowMonths]
  );

  const updateCanvasField = (fieldKey: string, value: string, origin?: EvidenceOrigin) => {
    const existingCanvas = venture.canvases[activeTool.id] || {};
    const prevEntry = existingCanvas[fieldKey];
    persistVenture({
      ...venture,
      canvases: {
        ...venture.canvases,
        [activeTool.id]: {
          ...existingCanvas,
          [fieldKey]: {
            value,
            origin: origin ?? prevEntry?.origin ?? 'user_input',
            linkedEvidenceId: prevEntry?.linkedEvidenceId,
            updatedAt: Date.now(),
          },
        },
      },
    });
  };

  const handleAddExperiment = () => {
    if (!expHypothesis.trim()) return;
    const item: BusinessExperimentItem = {
      id: `exp_${Date.now()}`,
      hypothesis: expHypothesis.trim(),
      targetMetric: expMetric.trim() || (id ? 'Minimal 5 pembeli uji coba' : 'At least 5 pilot buyers'),
      sampleSize: Math.max(1, Number(expSample) || 5),
      status: 'planned',
      origin: 'user_input',
      learnings: '',
      nextAction: '',
      updatedAt: Date.now(),
    };
    persistVenture({ ...venture, experiments: [item, ...venture.experiments] });
    setExpHypothesis('');
    setExpMetric('');
    onNotify(id ? 'Eksperimen bisnis ditambahkan!' : 'Business experiment added!', 'success');
  };

  const handleGenerateQuest = () => {
    const activeStep = getActiveDreamStep(player);
    const quest = buildQuestFromStudioTool(activeTool, lang, activeStep?.id ?? null);
    onAddQuest(quest);
  };

  const fmtIdr = (val: number) => `Rp ${Math.round(val).toLocaleString('id-ID')}`;

  return (
    <section className="space-y-4">
      <div className="anime-panel overflow-hidden border border-emerald-200 bg-white">
        <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-emerald-950 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            {id
              ? 'BUSINESS STUDIO · 16 TOOLS PENGEMBANGAN USAHA & KALKULATOR DETERMINISTIK'
              : 'BUSINESS STUDIO · 16 INTERACTIVE VENTURE TOOLS & DETERMINISTIC CALCULATORS'}
          </span>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
            {id ? `Business Lv.${player.businessLevel ?? 0}` : `Business Lv.${player.businessLevel ?? 0}`}
          </span>
        </div>

        {/* Venture Identity Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <label className="space-y-0.5">
            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
              {id ? 'Nama Usaha / Inisiatif' : 'Venture Name'}
            </span>
            <input
              type="text"
              value={venture.name}
              onChange={(e) => persistVenture({ ...venture, name: e.target.value })}
              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-hud font-bold text-slate-900"
            />
          </label>
          <label className="space-y-0.5">
            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
              {id ? 'Sektor / Komoditas' : 'Sector / Commodity'}
            </span>
            <input
              type="text"
              value={venture.sector}
              onChange={(e) => persistVenture({ ...venture, sector: e.target.value })}
              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
            />
          </label>
          <div className="flex items-end justify-end gap-1.5">
            <button
              type="button"
              onClick={handleGenerateQuest}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-[11px] flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{id ? 'Jadikan Tugas Harian' : 'Create Quest'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenEvidenceModal({
                  dimension: activeTool.dimension,
                  targetType: 'business_milestone',
                  targetId: `studio_${activeTool.id}`,
                  title: `${venture.name} — ${id ? activeTool.titleId : activeTool.titleEn}`,
                })
              }
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold text-[11px] flex items-center gap-1"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>{id ? 'Kirim Bukti' : 'Log Proof'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrepareMarketplaceSubmission}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-orange-600 text-white font-hud font-bold text-[11px] flex items-center gap-1"
              title={id ? 'Cek kesiapan kurasi produk untuk Sociopreneur.online (Stage 11)' : 'Validate product readiness for Sociopreneur.online'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>{id ? 'Cek Kurasi Pasar' : 'Marketplace Check'}</span>
            </button>
          </div>
        </div>

        {/* 4 Wings Navigation */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5 bg-white">
          {WING_LABELS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setActiveWing(w.id);
                const first = BUSINESS_STUDIO_TOOLS.find((t) => t.wing === w.id);
                if (first) setActiveToolId(first.id);
              }}
              className={`px-3 py-1.5 rounded text-xs font-hud font-bold transition ${
                activeWing === w.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {id ? w.labelId : w.labelEn}
            </button>
          ))}
        </div>

        {/* Workspace Grid: Left Tool List + Right Interactive Tool */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-1.5">
            {wingTools.map((tool) => {
              const selected = tool.id === activeTool.id;
              const checkPct =
                tool.toolMode === 'checklist'
                  ? computeChecklistPct(tool, venture.checklists[tool.id as 'legal_readiness' | 'export_readiness'])
                  : null;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveToolId(tool.id)}
                  className={`w-full text-left p-2.5 rounded border transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-hud font-bold text-xs text-slate-900">
                      {id ? tool.titleId : tool.titleEn}
                    </span>
                    {checkPct !== null && (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-white">
                        {checkPct}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{id ? tool.shortDescId : tool.shortDescEn}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 rounded border border-slate-200 bg-white p-4 space-y-4 text-xs">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="font-hud font-bold text-base text-slate-900">
                {id ? activeTool.titleId : activeTool.titleEn}
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {id ? activeTool.shortDescId : activeTool.shortDescEn}
              </p>
            </div>

            {/* MODE A: STRUCTURED CANVAS WITH PROVENANCE TAGS */}
            {activeTool.toolMode === 'canvas' && activeTool.fields && (
              <div className="space-y-3">
                <div className="rounded border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {id
                      ? 'Tandai setiap blok secara jujur: pisahkan Input Pendiri, Asumsi AI, dan Bukti Lapangan Tervalidasi.'
                      : 'Label every block accurately: separate Founder Input, AI Assumptions, and Validated Field Evidence.'}
                  </span>
                </div>
                {activeTool.fields.map((f) => {
                  const entry = venture.canvases[activeTool.id]?.[f.key];
                  const origin: EvidenceOrigin = entry?.origin ?? 'user_input';
                  const badge = ORIGIN_BADGE[origin];
                  return (
                    <div key={f.key} className="rounded border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{id ? f.labelId : f.labelEn}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                            {id ? badge.id : badge.en}
                          </span>
                          <select
                            value={origin}
                            onChange={(e) =>
                              updateCanvasField(f.key, entry?.value || '', e.target.value as EvidenceOrigin)
                            }
                            aria-label="Provenance status"
                            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px]"
                          >
                            <option value="user_input">{id ? 'Input Pendiri' : 'Founder Input'}</option>
                            <option value="ai_assumption">{id ? 'Asumsi AI' : 'AI Assumption'}</option>
                            <option value="validated_evidence">{id ? 'Bukti Tervalidasi' : 'Validated Evidence'}</option>
                          </select>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={entry?.value || ''}
                        onChange={(e) => updateCanvasField(f.key, e.target.value)}
                        placeholder={id ? f.placeholderId : f.placeholderEn}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODE B: EXPERIMENT TRACKER */}
            {activeTool.toolMode === 'experiments' && (
              <div className="space-y-3">
                <div className="rounded border border-sky-200 bg-sky-50/60 p-3 space-y-2">
                  <p className="font-bold text-sky-950 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-sky-600" />
                    {id ? 'Tambah Eksperimen Validasi Baru' : 'Add New Validation Experiment'}
                  </p>
                  <input
                    type="text"
                    value={expHypothesis}
                    onChange={(e) => setExpHypothesis(e.target.value)}
                    placeholder={id ? 'Hipotesis: Mis. 10 dari 20 kedai mau coba sampel kopi Garut Rp80rb/250g' : 'Hypothesis to test in the real market'}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={expMetric}
                      onChange={(e) => setExpMetric(e.target.value)}
                      placeholder={id ? 'Metrik sukses (mis. >= 5 pra-pesan)' : 'Success metric (e.g. >= 5 pre-orders)'}
                      className="sm:col-span-2 rounded border border-slate-300 bg-white px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddExperiment}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold uppercase flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{id ? 'Tambah' : 'Add'}</span>
                    </button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-700">
                    <span>{id ? 'Target Sampel:' : 'Sample Size:'}</span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={expSample}
                      onChange={(e) => setExpSample(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono"
                    />
                  </label>
                </div>

                {venture.experiments.length === 0 ? (
                  <p className="text-center py-6 text-slate-500">
                    {id ? 'Belum ada eksperimen pasar. Mulai dengan 1 hipotesis kecil yang bisa diuji minggu ini.' : 'No experiments yet. Start with 1 small hypothesis to test this week.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {venture.experiments.map((exp) => (
                      <div key={exp.id} className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">{exp.hypothesis}</p>
                            <p className="text-[11px] text-slate-600">
                              {id ? 'Metrik:' : 'Metric:'} {exp.targetMetric} · {id ? 'Sampel:' : 'Sample:'} {exp.sampleSize}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={exp.status}
                              onChange={(e) => {
                                const status = e.target.value as BusinessExperimentItem['status'];
                                persistVenture({
                                  ...venture,
                                  experiments: venture.experiments.map((item) =>
                                    item.id === exp.id
                                      ? {
                                          ...item,
                                          status,
                                          origin: status === 'validated' ? 'validated_evidence' : item.origin,
                                        }
                                      : item
                                  ),
                                });
                              }}
                              className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] font-bold"
                            >
                              <option value="planned">PLANNED</option>
                              <option value="running">RUNNING</option>
                              <option value="validated">VALIDATED</option>
                              <option value="invalidated">INVALIDATED</option>
                              <option value="pivoted">PIVOTED</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                persistVenture({
                                  ...venture,
                                  experiments: venture.experiments.filter((item) => item.id !== exp.id),
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600"
                              aria-label="Delete experiment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={exp.learnings}
                          onChange={(e) =>
                            persistVenture({
                              ...venture,
                              experiments: venture.experiments.map((item) =>
                                item.id === exp.id ? { ...item, learnings: e.target.value } : item
                              ),
                            })
                          }
                          placeholder={id ? 'Catat hasil & pembelajaran nyata dari eksperimen ini...' : 'Record concrete learnings from this test...'}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODE C: DETERMINISTIC HPP & PRICING CALCULATOR */}
            {activeTool.toolMode === 'hpp' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Jumlah Unit / Batch' : 'Batch Units'}</span>
                    <input
                      type="number"
                      min={1}
                      value={venture.hppInput.batchUnits}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          hppInput: { ...venture.hppInput, batchUnits: Math.max(1, Number(e.target.value) || 1) },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Target Margin Kotor (%)' : 'Target Gross Margin (%)'}</span>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      value={venture.hppInput.targetMarginPct ?? 35}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          hppInput: {
                            ...venture.hppInput,
                            targetMarginPct: Math.max(0, Math.min(95, Number(e.target.value) || 0)),
                            sellingPriceIdr: undefined,
                          },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Atau Harga Jual Manual (Rp)' : 'Or Manual Price (IDR)'}</span>
                    <input
                      type="number"
                      min={0}
                      value={venture.hppInput.sellingPriceIdr ?? ''}
                      placeholder={String(hppResult.sellingPriceIdr)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        persistVenture({
                          ...venture,
                          hppInput: { ...venture.hppInput, sellingPriceIdr: val > 0 ? val : undefined },
                        });
                      }}
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                </div>

                {(
                  [
                    ['directMaterials', id ? 'Bahan Baku & Kemasan (Rp)' : 'Direct Materials (IDR)'],
                    ['directLabor', id ? 'Tenaga Kerja Langsung (Rp)' : 'Direct Labor (IDR)'],
                    ['overheadCosts', id ? 'Biaya Overhead Batch (Rp)' : 'Batch Overhead (IDR)'],
                  ] as const
                ).map(([groupKey, label]) => (
                  <div key={groupKey} className="rounded border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          persistVenture({
                            ...venture,
                            hppInput: {
                              ...venture.hppInput,
                              [groupKey]: [...venture.hppInput[groupKey], { name: '', amountIdr: 0 }],
                            },
                          })
                        }
                        className="font-mono text-[10px] font-bold text-sky-700 hover:underline"
                      >
                        + {id ? 'Tambah Baris' : 'Add Item'}
                      </button>
                    </div>
                    {venture.hppInput[groupKey].map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5">
                        <input
                          type="text"
                          value={item.name}
                          placeholder={id ? 'Nama komponen biaya' : 'Cost item'}
                          onChange={(e) => {
                            const nextArr = venture.hppInput[groupKey].map((r, i) =>
                              i === idx ? { ...r, name: e.target.value } : r
                            );
                            persistVenture({ ...venture, hppInput: { ...venture.hppInput, [groupKey]: nextArr } });
                          }}
                          className="col-span-7 rounded border border-slate-300 bg-white px-2 py-1"
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.amountIdr}
                          onChange={(e) => {
                            const nextArr = venture.hppInput[groupKey].map((r, i) =>
                              i === idx ? { ...r, amountIdr: Math.max(0, Number(e.target.value) || 0) } : r
                            );
                            persistVenture({ ...venture, hppInput: { ...venture.hppInput, [groupKey]: nextArr } });
                          }}
                          className="col-span-4 rounded border border-slate-300 bg-white px-2 py-1 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextArr = venture.hppInput[groupKey].filter((_, i) => i !== idx);
                            persistVenture({ ...venture, hppInput: { ...venture.hppInput, [groupKey]: nextArr } });
                          }}
                          className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Deterministic Output Summary */}
                <div className="rounded border border-emerald-300 bg-emerald-50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <p className="font-mono text-[9px] text-emerald-800 uppercase">HPP / Unit</p>
                    <p className="font-hud text-sm font-bold text-slate-900">{fmtIdr(hppResult.hppPerUnitIdr)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-emerald-800 uppercase">{id ? 'Harga Jual' : 'Selling Price'}</p>
                    <p className="font-hud text-sm font-bold text-emerald-900">{fmtIdr(hppResult.sellingPriceIdr)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-emerald-800 uppercase">Gross Margin</p>
                    <p className="font-hud text-sm font-bold text-slate-900">{hppResult.grossMarginPct}%</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-emerald-800 uppercase">Markup</p>
                    <p className="font-hud text-sm font-bold text-slate-900">{hppResult.markupPct}%</p>
                  </div>
                </div>
                {hppResult.warnings.map((w, idx) => (
                  <p key={idx} className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {/* MODE D: DETERMINISTIC CASH FLOW PROJECTION */}
            {activeTool.toolMode === 'cashflow' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Saldo Kas Awal (Rp)' : 'Starting Cash Balance (IDR)'}</span>
                    <input
                      type="number"
                      value={venture.cashFlowStartingIdr}
                      onChange={(e) =>
                        persistVenture({ ...venture, cashFlowStartingIdr: Number(e.target.value) || 0 })
                      }
                      className="block w-48 rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      persistVenture({
                        ...venture,
                        cashFlowMonths: [
                          ...venture.cashFlowMonths,
                          {
                            monthLabel: `${id ? 'Bulan' : 'Month'} ${venture.cashFlowMonths.length + 1}`,
                            cashInflowsIdr: 0,
                            cashOutflowsIdr: 0,
                          },
                        ],
                      })
                    }
                    className="px-2.5 py-1.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold"
                  >
                    + {id ? 'Tambah Bulan' : 'Add Month'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border border-slate-200">
                    <thead className="bg-slate-100 font-mono text-[10px] text-slate-700">
                      <tr>
                        <th className="p-2 text-left">{id ? 'Bulan' : 'Month'}</th>
                        <th className="p-2 text-right">{id ? 'Kas Masuk' : 'Inflows'}</th>
                        <th className="p-2 text-right">{id ? 'Kas Keluar' : 'Outflows'}</th>
                        <th className="p-2 text-right">{id ? 'Arus Bersih' : 'Net'}</th>
                        <th className="p-2 text-right">{id ? 'Saldo Akhir' : 'Closing'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {cashFlowResult.months.map((m, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5 font-bold">{m.monthLabel}</td>
                          <td className="p-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={venture.cashFlowMonths[idx].cashInflowsIdr}
                              onChange={(e) => {
                                const next = venture.cashFlowMonths.map((row, i) =>
                                  i === idx ? { ...row, cashInflowsIdr: Math.max(0, Number(e.target.value) || 0) } : row
                                );
                                persistVenture({ ...venture, cashFlowMonths: next });
                              }}
                              className="w-28 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono"
                            />
                          </td>
                          <td className="p-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={venture.cashFlowMonths[idx].cashOutflowsIdr}
                              onChange={(e) => {
                                const next = venture.cashFlowMonths.map((row, i) =>
                                  i === idx ? { ...row, cashOutflowsIdr: Math.max(0, Number(e.target.value) || 0) } : row
                                );
                                persistVenture({ ...venture, cashFlowMonths: next });
                              }}
                              className="w-28 rounded border border-slate-300 px-1.5 py-0.5 text-right font-mono"
                            />
                          </td>
                          <td className={`p-1.5 text-right font-mono font-bold ${m.netCashFlowIdr >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {fmtIdr(m.netCashFlowIdr)}
                          </td>
                          <td className={`p-1.5 text-right font-mono font-bold ${m.closingBalanceIdr >= 0 ? 'text-slate-900' : 'text-rose-700 bg-rose-50'}`}>
                            {fmtIdr(m.closingBalanceIdr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {cashFlowResult.negativeCashMonths.length > 0 && (
                  <p className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {id
                        ? `Peringatan defisit kas pada: ${cashFlowResult.negativeCashMonths.join(', ')} (saldo terendah ${fmtIdr(cashFlowResult.lowestBalanceIdr)}).`
                        : `Negative cash balance alert in: ${cashFlowResult.negativeCashMonths.join(', ')} (lowest ${fmtIdr(cashFlowResult.lowestBalanceIdr)}).`}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* MODE E: DETERMINISTIC BREAK-EVEN ANALYSIS */}
            {activeTool.toolMode === 'bep' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Biaya Tetap Bulanan (Rp)' : 'Monthly Fixed Costs (IDR)'}</span>
                    <input
                      type="number"
                      min={0}
                      value={venture.bepInput.fixedCostsPerMonthIdr}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          bepInput: { ...venture.bepInput, fixedCostsPerMonthIdr: Math.max(0, Number(e.target.value) || 0) },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Harga Jual per Unit (Rp)' : 'Selling Price / Unit (IDR)'}</span>
                    <input
                      type="number"
                      min={0}
                      value={venture.bepInput.sellingPricePerUnitIdr}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          bepInput: { ...venture.bepInput, sellingPricePerUnitIdr: Math.max(0, Number(e.target.value) || 0) },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Biaya Variabel / HPP per Unit (Rp)' : 'Variable Cost / Unit (IDR)'}</span>
                    <input
                      type="number"
                      min={0}
                      value={venture.bepInput.variableCostPerUnitIdr}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          bepInput: { ...venture.bepInput, variableCostPerUnitIdr: Math.max(0, Number(e.target.value) || 0) },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                  <label className="space-y-1 font-bold text-slate-700">
                    <span>{id ? 'Target Penjualan Bulanan (Unit)' : 'Projected Monthly Units'}</span>
                    <input
                      type="number"
                      min={0}
                      value={venture.bepInput.projectedMonthlyUnits ?? 0}
                      onChange={(e) =>
                        persistVenture({
                          ...venture,
                          bepInput: { ...venture.bepInput, projectedMonthlyUnits: Math.max(0, Number(e.target.value) || 0) },
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono"
                    />
                  </label>
                </div>

                {bepResult.reachable ? (
                  <div className="rounded border border-sky-300 bg-sky-50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <p className="font-mono text-[9px] text-sky-900 uppercase flex items-center gap-1">
                        <Calculator className="w-3 h-3" /> BEP Unit
                      </p>
                      <p className="font-hud text-base font-bold text-slate-900">{bepResult.breakEvenUnits} unit</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] text-sky-900 uppercase">BEP Omzet</p>
                      <p className="font-hud text-sm font-bold text-sky-950">{fmtIdr(bepResult.breakEvenRevenueIdr || 0)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] text-sky-900 uppercase">Margin Kontribusi</p>
                      <p className="font-hud text-sm font-bold text-slate-900">
                        {fmtIdr(bepResult.contributionMarginPerUnitIdr)} ({bepResult.contributionMarginRatioPct}%)
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] text-sky-900 uppercase">Margin of Safety</p>
                      <p className={`font-hud text-sm font-bold ${(bepResult.marginOfSafetyUnits ?? 0) >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                        {bepResult.marginOfSafetyUnits ?? 0} unit
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded border border-rose-200 bg-rose-50 p-2.5 text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{bepResult.warning}</span>
                  </p>
                )}
              </div>
            )}

            {/* MODE F: READINESS CHECKLISTS (LEGAL & EXPORT) */}
            {activeTool.toolMode === 'checklist' && activeTool.checklistItems && (
              <div className="space-y-2.5">
                {(() => {
                  const key = activeTool.id as 'legal_readiness' | 'export_readiness';
                  const checkedMap = venture.checklists[key] || {};
                  const pct = computeChecklistPct(activeTool, checkedMap);
                  return (
                    <>
                      <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          {id ? 'Skor Kesiapan:' : 'Readiness Score:'} {pct}%
                        </span>
                        <span className="font-mono text-[10px] text-emerald-800">
                          {pct >= 80
                            ? (id ? 'Siap Pengajuan Kurasi Sociopreneur.online' : 'Ready for Sociopreneur.online Submission')
                            : (id ? 'Lengkapi dokumen inti terlebih dahulu' : 'Complete core requirements first')}
                        </span>
                      </div>
                      {activeTool.checklistItems.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer hover:border-emerald-300"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(checkedMap[item.key])}
                            onChange={(e) =>
                              persistVenture({
                                ...venture,
                                checklists: {
                                  ...venture.checklists,
                                  [key]: { ...checkedMap, [item.key]: e.target.checked },
                                },
                              })
                            }
                            className="mt-0.5 h-4 w-4 accent-emerald-600"
                          />
                          <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                            {Boolean(checkedMap[item.key]) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {id ? item.labelId : item.labelEn}
                          </span>
                        </label>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
