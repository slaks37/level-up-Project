import React, { useState } from 'react';
import { CheckCircle2, FileCheck2, Link2, ShieldCheck } from 'lucide-react';
import type { Language } from '../types';
import { ModalShell } from './Modals';
import { DEVELOPMENT_DIMENSIONS, type DevelopmentDimension } from '../engine/v2/dimensions';
import {
  buildEvidenceDraft,
  type EvidenceKind,
  type EvidenceRecord,
  type EvidenceTargetType,
} from '../engine/v2/evidence';

interface EvidenceModalProps {
  ownerUid: string;
  lang: Language;
  defaultDimension?: DevelopmentDimension;
  defaultTargetType?: EvidenceTargetType;
  defaultTargetId?: string;
  defaultTitle?: string;
  existingEvidence: EvidenceRecord[];
  onSubmitEvidence: (record: EvidenceRecord) => Promise<void> | void;
  onClose: () => void;
}

const EVIDENCE_KINDS: Array<{ id: EvidenceKind; labelId: string; labelEn: string }> = [
  { id: 'reflection', labelId: 'Catatan Observasi / Refleksi', labelEn: 'Field Observation / Reflection' },
  { id: 'link', labelId: 'Tautan Portofolio / Dokumen', labelEn: 'Portfolio / Document Link' },
  { id: 'interview_log', labelId: 'Log Wawancara Pelanggan', labelEn: 'Customer Interview Log' },
  { id: 'canvas_snapshot', labelId: 'Snapshot Kanvas Business Studio', labelEn: 'Business Studio Canvas Snapshot' },
  { id: 'sales_proof', labelId: 'Bukti Uji Pasar / Penjualan Nyata', labelEn: 'Market Validation / Sales Proof' },
  { id: 'file', labelId: 'Tautan File / Foto Prototipe', labelEn: 'Prototype File / Photo Link' },
];

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  ownerUid,
  lang,
  defaultDimension = 'BUSINESS',
  defaultTargetType = 'dream_step',
  defaultTargetId = 'general',
  defaultTitle = '',
  existingEvidence,
  onSubmitEvidence,
  onClose,
}) => {
  const id = lang === 'id';
  const [dimension, setDimension] = useState<DevelopmentDimension>(defaultDimension);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('reflection');
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const related = existingEvidence.filter((e) => e.targetId === defaultTargetId).slice(0, 5);

  const handleSave = async (submitNow: boolean) => {
    if (!title.trim() || !summary.trim()) return;
    setSaving(true);
    try {
      const record = buildEvidenceDraft(ownerUid, {
        dimension,
        targetType: defaultTargetType,
        targetId: defaultTargetId,
        title,
        summary,
        evidenceKind,
        artifactUrl,
        submitNow,
      });
      await onSubmitEvidence(record);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={id ? 'EVIDENCE VAULT · BUKTI NYATA & PORTOFOLIO' : 'EVIDENCE VAULT · REAL-WORLD PROOF'}
      icon={<FileCheck2 className="w-4 h-4 text-emerald-600" />}
      maxWidth="max-w-xl"
      onClose={onClose}
    >
      <div className="space-y-3 text-xs">
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-950 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            {id
              ? 'Kompetensi dan Business Level hanya naik dari bukti nyata yang diverifikasi — bukan dari EXP harian atau asumsi AI. Status awal adalah Draft atau Terkirim (Menunggu Tinjauan Mentor).'
              : 'Competency and Business Levels advance strictly from verified real-world evidence — never from EXP or AI assumptions. Submitted entries enter Mentor review.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="block space-y-1 font-bold text-slate-700">
            <span>{id ? 'Dimensi Pengembangan' : 'Development Dimension'}</span>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as DevelopmentDimension)}
              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
            >
              {DEVELOPMENT_DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {id ? d.labelId : d.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 font-bold text-slate-700">
            <span>{id ? 'Jenis Bukti Nyata' : 'Evidence Kind'}</span>
            <select
              value={evidenceKind}
              onChange={(e) => setEvidenceKind(e.target.value as EvidenceKind)}
              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
            >
              {EVIDENCE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {id ? k.labelId : k.labelEn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 font-bold text-slate-700">
          <span>{id ? 'Judul Bukti / Capaian Nyata' : 'Evidence Title'}</span>
          <input
            type="text"
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={id ? 'Mis. 5 Wawancara Petani Kopi Garut — Batch 1' : 'E.g. 5 Local Farmer Interviews — Batch 1'}
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-normal"
          />
        </label>

        <label className="block space-y-1 font-bold text-slate-700">
          <span>{id ? 'Ringkasan Fakta Lapangan & Hasil Terukur' : 'Observed Facts & Measurable Outcome'}</span>
          <textarea
            rows={4}
            maxLength={2000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={
              id
                ? 'Jelaskan apa yang benar-benar terjadi di lapangan, angka/respons pelanggan, dan pembelajaran utama (hindari data pribadi sensitif orang lain).'
                : 'Describe concrete field observations, buyer responses, and key takeaways (avoid sharing others’ private PII).'
            }
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-normal"
          />
        </label>

        <label className="block space-y-1 font-bold text-slate-700">
          <span className="flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-sky-600" />
            {id ? 'Tautan Bukti Pendukung (Opsional, HTTPS)' : 'Supporting Artifact URL (Optional, HTTPS)'}
          </span>
          <input
            type="url"
            maxLength={500}
            value={artifactUrl}
            onChange={(e) => setArtifactUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-[11px] font-normal"
          />
        </label>

        {related.length > 0 && (
          <div className="rounded border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
            <p className="font-mono text-[10px] font-bold uppercase text-slate-600">
              {id ? 'Bukti Terkait Sebelumnya' : 'Previous Linked Evidence'}
            </p>
            {related.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 truncate">{item.title}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 uppercase shrink-0">
                  {item.reviewStatus}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            disabled={saving || !title.trim() || !summary.trim()}
            onClick={() => void handleSave(false)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold disabled:opacity-50"
          >
            {id ? 'Simpan Draft' : 'Save Draft'}
          </button>
          <button
            type="button"
            disabled={saving || !title.trim() || !summary.trim()}
            onClick={() => void handleSave(true)}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold uppercase flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{id ? 'Kirim ke Mentor / Portofolio' : 'Submit for Review'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
