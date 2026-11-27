import React, { useEffect, useState } from 'react';
import { Award, BookOpen, CheckCircle2, GraduationCap, Loader2, RefreshCw, Send } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Language } from '../types';
import {
  fetchPendingSubmissionsForReview,
  gradeSubmissionByMentor,
  publishAcademyCourseToCloud,
  type SubmissionReviewItem,
} from '../services/firebaseService';

interface MentorReviewPanelProps {
  cloudUser: User;
  lang: Language;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const MentorReviewPanel: React.FC<MentorReviewPanelProps> = ({
  cloudUser,
  lang,
  onNotify,
}) => {
  const id = lang === 'id';
  const [submissions, setSubmissions] = useState<SubmissionReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  // Quick Course Management form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSummary, setCourseSummary] = useState('');
  const [courseAccess, setCourseAccess] = useState<'free' | 'paid_external' | 'cohort_only'>('free');
  const [publishing, setPublishing] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const items = await fetchPendingSubmissionsForReview(40);
      setSubmissions(items);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const handleGrade = async (item: SubmissionReviewItem, approve: boolean) => {
    const score = Math.max(0, Math.min(100, Number(scoreMap[item.id] ?? (approve ? 85 : 55))));
    const feedback = (feedbackMap[item.id] || '').trim() || (approve ? 'Bukti terverifikasi sesuai rubrik.' : 'Mohon lengkapi bukti lapangan.');
    try {
      await gradeSubmissionByMentor(cloudUser, item.id, {
        status: approve ? 'graded' : 'revision_requested',
        passed: approve && score >= 70,
        score,
        feedback,
      });
      onNotify(
        approve
          ? (id ? `Pengumpulan disetujui (skor ${score})!` : `Submission approved (score ${score})!`)
          : (id ? 'Permintaan revisi dikirim ke peserta.' : 'Revision requested from learner.'),
        'success'
      );
      await loadQueue();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handlePublishCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    setPublishing(true);
    try {
      const slug = courseTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      await publishAcademyCourseToCloud(cloudUser, {
        id: `crs_${slug}_${Date.now().toString(36).slice(-4)}`,
        slug,
        title: courseTitle.trim(),
        summary: courseSummary.trim() || 'Kursus pengembangan LevelUp Academy.',
        pathwayIds: ['sociopreneur', 'entrepreneur'],
        accessType: courseAccess,
        status: 'published',
      });
      setCourseTitle('');
      setCourseSummary('');
      onNotify(id ? 'Kursus baru berhasil dipublikasikan ke katalog Firestore!' : 'Course published to Firestore catalog!', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="anime-panel overflow-hidden border border-indigo-200">
      <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-indigo-950 flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
          {id
            ? 'LEVELUP ACADEMY · MANAJEMEN KURSUS & ANTREAN TINJAUAN MENTOR'
            : 'LEVELUP ACADEMY · COURSE MANAGEMENT & MENTOR REVIEW QUEUE'}
        </span>
        <button
          type="button"
          onClick={() => void loadQueue()}
          disabled={loading}
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>{id ? 'Muat Ulang' : 'Refresh'}</span>
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        {/* Left: Mentor Review Queue */}
        <div className="lg:col-span-7 space-y-2.5">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            {id ? `Antrean Penilaian Tugas & Rubrik (${submissions.length})` : `Mentor Review Queue (${submissions.length})`}
          </p>
          {submissions.length === 0 ? (
            <p className="rounded border border-slate-200 bg-slate-50 p-4 text-center text-slate-500">
              {id
                ? 'Belum ada pengumpulan tugas Academy yang menunggu tinjauan Mentor.'
                : 'No Academy submissions waiting for Mentor review yet.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {submissions.map((item) => (
                <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-800 truncate">
                      {item.courseId} · {item.lessonId} ({item.uid.slice(0, 8)})
                    </span>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 uppercase">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoreMap[item.id] ?? item.score ?? 85}
                      onChange={(e) => setScoreMap((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                      className="w-16 rounded border border-slate-300 bg-white px-2 py-1 font-mono"
                      aria-label="Rubric score"
                    />
                    <input
                      type="text"
                      value={feedbackMap[item.id] ?? item.feedback ?? ''}
                      onChange={(e) => setFeedbackMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={id ? 'Catatan umpan balik mentor...' : 'Mentor rubric feedback...'}
                      className="flex-grow rounded border border-slate-300 bg-white px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => void handleGrade(item, true)}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{id ? 'Setujui' : 'Approve'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGrade(item, false)}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    >
                      {id ? 'Revisi' : 'Revise'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Course Publisher */}
        <form onSubmit={(e) => void handlePublishCourse(e)} className="lg:col-span-5 rounded border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-600" />
            {id ? 'Publikasikan Kursus Baru ke Katalog' : 'Publish New Course to Catalog'}
          </p>
          <input
            type="text"
            required
            maxLength={160}
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder={id ? 'Judul kursus (mis. Strategi Ekspor Kopi UMKM)' : 'Course title'}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
          />
          <textarea
            rows={2}
            maxLength={1000}
            value={courseSummary}
            onChange={(e) => setCourseSummary(e.target.value)}
            placeholder={id ? 'Ringkasan kompetensi dan hasil belajar...' : 'Competency summary and learning outcomes...'}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
          />
          <select
            value={courseAccess}
            onChange={(e) => setCourseAccess(e.target.value as 'free' | 'paid_external' | 'cohort_only')}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-semibold"
          >
            <option value="free">{id ? 'Gratis (Akses Terbuka)' : 'Free (Open Access)'}</option>
            <option value="paid_external">{id ? 'Berbayar via Sociopreneur.online' : 'Paid via Sociopreneur.online'}</option>
            <option value="cohort_only">{id ? 'Khusus Kohort Inkubasi' : 'Cohort Only'}</option>
          </select>
          <button
            type="submit"
            disabled={publishing}
            className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-hud font-bold uppercase flex items-center justify-center gap-1.5"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{id ? 'Publikasikan Kursus' : 'Publish Course'}</span>
          </button>
        </form>
      </div>
    </section>
  );
};
