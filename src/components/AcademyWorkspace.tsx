import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Lock,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import type { Language, PlayerProfile, Quest } from '../types';
import {
  buildQuestFromLesson,
  gradeAcademyQuiz,
  loadLocalEnrollments,
  saveLocalEnrollments,
  STARTER_ACADEMY_COURSES,
  type AcademyCourse,
  type AcademyEnrollmentState,
  type AcademyLesson,
} from '../engine/v2/academy';
import { getActiveDreamStep } from '../engine/coaching';
import { getDimensionLabel } from '../engine/v2/dimensions';
import type { EvidenceRecord } from '../engine/v2/evidence';

interface AcademyWorkspaceProps {
  uid?: string;
  player: PlayerProfile;
  lang: Language;
  evidenceList: EvidenceRecord[];
  onAddQuest: (quest: Quest) => void;
  onOpenEvidenceModal: (opts: {
    dimension: AcademyCourse['dimensions'][number];
    targetType: 'assignment';
    targetId: string;
    title: string;
  }) => void;
  onOpenStudioTool?: (canvasId: string) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AcademyWorkspace: React.FC<AcademyWorkspaceProps> = ({
  uid,
  player,
  lang,
  evidenceList,
  onAddQuest,
  onOpenEvidenceModal,
  onOpenStudioTool,
  onNotify,
}) => {
  const id = lang === 'id';
  const [enrollments, setEnrollments] = useState<Record<string, AcademyEnrollmentState>>(() =>
    loadLocalEnrollments(uid)
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>(STARTER_ACADEMY_COURSES[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    STARTER_ACADEMY_COURSES[0].modules[0].lessons[0].id
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [lastQuizFeedback, setLastQuizFeedback] = useState<{
    lessonId: string;
    scorePct: number;
    passed: boolean;
    correctCount: number;
    total: number;
  } | null>(null);

  const course = useMemo(
    () => STARTER_ACADEMY_COURSES.find((c) => c.id === selectedCourseId) ?? STARTER_ACADEMY_COURSES[0],
    [selectedCourseId]
  );

  const allLessons = useMemo(
    () => course.modules.flatMap((m) => m.lessons),
    [course]
  );

  const activeLesson: AcademyLesson = useMemo(
    () => allLessons.find((l) => l.id === selectedLessonId) ?? allLessons[0],
    [allLessons, selectedLessonId]
  );

  const enrollment = enrollments[course.id];
  const isEnrolled = enrollment?.status === 'active' || enrollment?.status === 'completed';

  const persistEnrollments = (next: Record<string, AcademyEnrollmentState>) => {
    setEnrollments(next);
    saveLocalEnrollments(next, uid);
  };

  const handleEnrollFree = (target: AcademyCourse) => {
    if (target.accessType !== 'free') return;
    const next: Record<string, AcademyEnrollmentState> = {
      ...enrollments,
      [target.id]: {
        courseId: target.id,
        status: 'active',
        source: 'free',
        completedLessonIds: [],
        quizScores: {},
        submittedAssignments: {},
        enrolledAt: Date.now(),
      },
    };
    persistEnrollments(next);
    onNotify(
      id ? `Berhasil mendaftar ke "${target.titleId}"!` : `Enrolled in "${target.titleEn}"!`,
      'success'
    );
  };

  const markLessonDone = (lessonId: string) => {
    if (!enrollment) return;
    const completed = [...new Set([...enrollment.completedLessonIds, lessonId])];
    const allDone = allLessons.every((l) => completed.includes(l.id));
    const next: Record<string, AcademyEnrollmentState> = {
      ...enrollments,
      [course.id]: {
        ...enrollment,
        completedLessonIds: completed,
        status: allDone ? 'completed' : 'active',
        ...(allDone && !enrollment.certificateCode
          ? { certificateCode: `LU-${course.competencyCode}-${Date.now().toString(36).toUpperCase().slice(-5)}` }
          : {}),
      },
    };
    persistEnrollments(next);
    onNotify(id ? 'Pelajaran ditandai selesai!' : 'Lesson marked complete!', 'success');
  };

  const handleSubmitQuiz = () => {
    if (!activeLesson.quizQuestions?.length || !enrollment) return;
    const result = gradeAcademyQuiz(activeLesson.quizQuestions, quizAnswers);
    setLastQuizFeedback({ lessonId: activeLesson.id, ...result });
    const completed = result.passed
      ? [...new Set([...enrollment.completedLessonIds, activeLesson.id])]
      : enrollment.completedLessonIds;
    const next: Record<string, AcademyEnrollmentState> = {
      ...enrollments,
      [course.id]: {
        ...enrollment,
        completedLessonIds: completed,
        quizScores: {
          ...enrollment.quizScores,
          [activeLesson.id]: { scorePct: result.scorePct, passed: result.passed, completedAt: Date.now() },
        },
      },
    };
    persistEnrollments(next);
    onNotify(
      result.passed
        ? id
          ? `Lulus Kuis! Skor ${result.scorePct}% (${result.correctCount}/${result.total}).`
          : `Quiz Passed! Score ${result.scorePct}% (${result.correctCount}/${result.total}).`
        : id
          ? `Skor ${result.scorePct}% — butuh minimal 70% untuk lulus. Pelajari penjelasan lalu coba lagi.`
          : `Score ${result.scorePct}% — need at least 70% to pass. Review explanations and retry.`,
      result.passed ? 'success' : 'warning'
    );
  };

  const handleSendLessonToQuest = (lesson: AcademyLesson) => {
    const activeStep = getActiveDreamStep(player);
    const quest = buildQuestFromLesson(lesson, lang, activeStep?.id ?? null);
    if (!quest) return;
    onAddQuest(quest);
  };

  const completedCount = enrollment?.completedLessonIds.length ?? 0;
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
  const linkedAssignmentEvidence = evidenceList.filter((e) => e.targetId === activeLesson.id);

  return (
    <section className="space-y-4">
      <div className="anime-panel overflow-hidden border border-indigo-200 bg-white">
        <div className="blender-bar px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-indigo-900 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            {id
              ? 'LEVELUP ACADEMY · PEMBELAJARAN TERINTEGRASI PETA IMPIAN & QUEST'
              : 'LEVELUP ACADEMY · INTEGRATED WITH DREAM MAP & DAILY QUESTS'}
          </span>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
            {id ? `Competency Lv.${player.competencyLevel ?? 1}` : `Competency Lv.${player.competencyLevel ?? 1}`}
          </span>
        </div>

        {/* Course Catalog Strip */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50/70">
          {STARTER_ACADEMY_COURSES.map((c) => {
            const active = c.id === course.id;
            const enr = enrollments[c.id];
            const lessonsTotal = c.modules.reduce((sum, m) => sum + m.lessons.length, 0);
            const pct = enr ? Math.round((enr.completedLessonIds.length / Math.max(1, lessonsTotal)) * 100) : 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(c.id);
                  setSelectedLessonId(c.modules[0].lessons[0].id);
                  setQuizAnswers({});
                  setLastQuizFeedback(null);
                }}
                className={`text-left p-3 rounded border transition flex flex-col justify-between gap-2 ${
                  active
                    ? 'border-indigo-600 bg-white ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-orange-400">
                      {c.competencyCode}
                    </span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                        c.accessType === 'free'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {c.accessType === 'free'
                        ? (id ? 'GRATIS' : 'FREE')
                        : 'SOCIOPRENEUR.ONLINE'}
                    </span>
                  </div>
                  <h3 className="font-hud font-bold text-sm text-slate-900 mt-1.5 leading-snug">
                    {id ? c.titleId : c.titleEn}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                    {id ? c.summaryId : c.summaryEn}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500">
                    {c.estimatedHours} {id ? 'jam' : 'hrs'} · {lessonsTotal} {id ? 'materi' : 'lessons'}
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {enr ? `${pct}%` : c.accessType === 'free' ? (id ? 'Siap Ikut' : 'Open') : (id ? 'Pratinjau' : 'Preview')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Course Player */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Modules & Lesson Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="rounded border border-indigo-200 bg-indigo-50/70 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950">{id ? 'Kompetensi Target' : 'Target Competency'}</span>
                <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-900 text-white">
                  {course.competencyTier}
                </span>
              </div>
              <p className="font-semibold text-indigo-900">
                {id ? course.competencyNameId : course.competencyNameEn}
              </p>
              <div className="flex flex-wrap gap-1">
                {course.dimensions.map((d) => (
                  <span key={d} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white border border-indigo-200 text-indigo-900">
                    {getDimensionLabel(d, lang)}
                  </span>
                ))}
              </div>

              {!isEnrolled ? (
                course.accessType === 'free' ? (
                  <button
                    type="button"
                    onClick={() => handleEnrollFree(course)}
                    className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-hud font-bold text-xs uppercase"
                  >
                    {id ? 'DAFTAR KURSUS GRATIS' : 'ENROLL FOR FREE'}
                  </button>
                ) : (
                  <a
                    href={course.externalProductUrl || 'https://sociopreneur.online'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-sky-700 text-white font-hud font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-orange-400" />
                    <span>{id ? 'Beli di Sociopreneur.online' : 'Purchase on Sociopreneur.online'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] font-bold text-indigo-900">
                    <span>{id ? 'PROGRES KURSUS' : 'COURSE PROGRESS'}</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white border border-indigo-200 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  {enrollment?.certificateCode && (
                    <div className="mt-2 rounded bg-emerald-50 border border-emerald-200 p-2 text-[11px] text-emerald-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {id ? 'Sertifikat Pratinjau:' : 'Certificate Preview:'}{' '}
                        <strong className="font-mono">{enrollment.certificateCode}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {course.modules.map((mod) => (
              <div key={mod.id} className="rounded border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                  <p className="font-hud font-bold text-xs text-slate-900">{id ? mod.titleId : mod.titleEn}</p>
                  <p className="text-[10px] text-slate-600">{id ? mod.descriptionId : mod.descriptionEn}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {mod.lessons.map((les) => {
                    const selected = les.id === activeLesson.id;
                    const done = enrollment?.completedLessonIds.includes(les.id);
                    return (
                      <button
                        key={les.id}
                        type="button"
                        onClick={() => {
                          setSelectedLessonId(les.id);
                          setQuizAnswers({});
                          setLastQuizFeedback(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between gap-2 transition ${
                          selected ? 'bg-indigo-50 text-indigo-950 font-bold' : 'bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block truncate">{id ? les.titleId : les.titleEn}</span>
                          <span className="font-mono text-[9px] text-slate-500 uppercase">
                            {les.type} · {les.estimatedMinutes}m
                          </span>
                        </div>
                        {done && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Active Lesson Content / Quiz / Assignment */}
          <div className="lg:col-span-8 rounded border border-slate-200 bg-white p-4 space-y-4 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">
                  {activeLesson.type} · {activeLesson.estimatedMinutes} {id ? 'menit' : 'min'}
                </span>
                <h4 className="font-hud font-bold text-base text-slate-900 mt-1">
                  {id ? activeLesson.titleId : activeLesson.titleEn}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeLesson.autoQuestTemplate && (
                  <button
                    type="button"
                    onClick={() => handleSendLessonToQuest(activeLesson)}
                    className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-hud font-bold text-[11px] flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{id ? 'Jadikan Tugas Harian' : 'Add to Daily Quests'}</span>
                  </button>
                )}
                {activeLesson.linkedCanvasType && onOpenStudioTool && (
                  <button
                    type="button"
                    onClick={() => onOpenStudioTool(activeLesson.linkedCanvasType!)}
                    className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-orange-600 text-white font-hud font-bold text-[11px] flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>{id ? 'Buka di Business Studio' : 'Open in Business Studio'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
              {id ? activeLesson.contentId : activeLesson.contentEn}
            </div>

            {/* Interactive Quiz */}
            {activeLesson.type === 'quiz' && activeLesson.quizQuestions && (
              <div className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
                {activeLesson.quizQuestions.map((q, idx) => (
                  <div key={q.id} className="space-y-1.5 bg-white p-3 rounded border border-slate-200">
                    <p className="font-bold text-slate-900">
                      {idx + 1}. {id ? q.promptId : q.promptEn}
                    </p>
                    <div className="space-y-1">
                      {(id ? q.optionsId : q.optionsEn).map((opt, optIdx) => (
                        <label key={optIdx} className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                          <input
                            type="radio"
                            name={`quiz_${q.id}`}
                            checked={quizAnswers[q.id] === optIdx}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className="mt-0.5 accent-indigo-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {lastQuizFeedback?.lessonId === activeLesson.id && (
                      <p className="text-[11px] text-indigo-900 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 mt-1">
                        {id ? q.explanationId : q.explanationEn}
                      </p>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={!isEnrolled}
                  onClick={handleSubmitQuiz}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-hud font-bold text-xs uppercase"
                >
                  {isEnrolled
                    ? (id ? 'PERIKSA JAWABAN KUIS' : 'SUBMIT QUIZ ANSWERS')
                    : (id ? 'Daftar Kursus Dulu untuk Mengikuti Kuis' : 'Enroll First to Submit Quiz')}
                </button>
              </div>
            )}

            {/* Practical Assignment -> Evidence Vault */}
            {activeLesson.type === 'assignment' && (
              <div className="rounded border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  {id ? 'Tugas Praktik Berbasis Bukti Nyata (Rubrik Mentor)' : 'Evidence-Based Practical Assignment'}
                </p>
                <p className="text-slate-700">
                  {id ? activeLesson.assignmentPromptId : activeLesson.assignmentPromptEn}
                </p>
                {(id ? activeLesson.assignmentRubricId : activeLesson.assignmentRubricEn)?.length ? (
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                    {(id ? activeLesson.assignmentRubricId : activeLesson.assignmentRubricEn)!.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenEvidenceModal({
                        dimension: course.dimensions[0] || 'SKILLS',
                        targetType: 'assignment',
                        targetId: activeLesson.id,
                        title: id ? activeLesson.titleId : activeLesson.titleEn,
                      })
                    }
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-hud font-bold text-xs uppercase"
                  >
                    {id ? 'Unggah Bukti ke Evidence Vault' : 'Submit Proof to Evidence Vault'}
                  </button>
                  {linkedAssignmentEvidence.length > 0 && (
                    <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-900">
                      {linkedAssignmentEvidence.length} {id ? 'bukti terkirim' : 'evidence submitted'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Article / Studio Action Complete Button */}
            {activeLesson.type !== 'quiz' && isEnrolled && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {id
                    ? 'Selesaikan bacaan & praktik agar progres kursus tercatat.'
                    : 'Mark complete after reviewing and practicing.'}
                </span>
                <button
                  type="button"
                  onClick={() => markLessonDone(activeLesson.id)}
                  disabled={enrollment?.completedLessonIds.includes(activeLesson.id)}
                  className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-900 text-white font-hud font-bold text-xs uppercase"
                >
                  {enrollment?.completedLessonIds.includes(activeLesson.id)
                    ? (id ? '✓ Selesai' : '✓ Completed')
                    : (id ? 'Tandai Materi Selesai' : 'Mark Lesson Complete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
