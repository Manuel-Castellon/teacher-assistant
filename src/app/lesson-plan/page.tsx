'use client';

import { useEffect, useRef, useState } from 'react';
import type { LessonDuration, LessonPlan, LessonType } from '@/types/lessonPlan';
import { gradeLabel, type GradeLevel } from '@/types/shared';
import { CUSTOM_LESSON_PLAN_TOPIC_ID, getLessonPlanCurriculumTopicOptions } from '@/lessonPlan/curriculumContext';
import type { BackendName } from '@/exam/backends';
import {
  resolveIncludeWorksheet,
  supportsWorksheetForLessonType,
} from '@/lessonPlan/worksheetPolicy';
import {
  buildClassActivityTimeline,
  buildLessonSuggestion,
  CLASS_PROGRESS_STORAGE_KEY,
  getCurriculumUnitForGrade,
  recordPostLessonProgress,
  renderClassContext,
  STATUS_LABELS,
  type ClassProgressProfile,
  type TopicProgressStatus,
} from '@/curriculumProgress/progress';

interface GenerateLessonPlanResponse {
  plan?: LessonPlan;
  markdown?: string;
  worksheetMarkdown?: string;
  artifactId?: string;
  artifactWarning?: string;
  worksheetVerification?: {
    provider: 'sympy';
    total: number;
    verified: number;
    failed: number;
    skipped: number;
    warning?: string;
    results: {
      questionRef: string;
      isValid: boolean;
      computedAnswer: string | null;
      message: string;
    }[];
  };
  invariantViolations?: { code: string; message: string }[];
  error?: string;
}

interface SavedLessonPlan {
  id: string;
  savedAt: string;
  request: LessonPlanFormState;
  response: GenerateLessonPlanResponse;
}

type AIBackend = 'auto' | BackendName;

type ClassContextSource = 'auto' | 'manual' | 'none';

interface LessonPlanFormState {
  topic: string;
  subTopic: string;
  grade: GradeLevel;
  duration: LessonDuration;
  lessonType: LessonType;
  curriculumTopicId: string;
  teacherRequest: string;
  teacherNotes: string;
  previousLessonContext: string;
  includeWorksheet: boolean;
  backend: AIBackend;
  classContextSource: ClassContextSource;
}

const CLASS_CONTEXT_SOURCE_OPTIONS: { value: ClassContextSource; label: string }[] = [
  { value: 'auto', label: 'אוטומטי מהמעקב' },
  { value: 'manual', label: 'ידני (ערוך טקסט)' },
  { value: 'none', label: 'ללא הקשר כיתה' },
];

const SAVED_LESSON_PLANS_KEY = 'teacher-assistant.saved-lesson-plans.v1';

const GRADE_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: 'זי', label: "ז'" },
  { value: 'חי', label: "ח'" },
  { value: 'טי', label: "ט'" },
  { value: 'יי', label: "י'" },
  { value: 'יאי', label: "יא'" },
  { value: 'יבי', label: "יב'" },
];

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '45', label: '45 דקות' },
  { value: '90', label: '90 דקות' },
];

const LESSON_TYPE_OPTIONS: { value: LessonType; label: string }[] = [
  { value: 'שגרה', label: 'שגרה' },
  { value: 'הקנייה', label: 'הקנייה' },
  { value: 'תרגול', label: 'תרגול' },
  { value: 'חזרה_למבחן', label: 'חזרה למבחן' },
  { value: 'חזרה_לבגרות', label: 'חזרה לבגרות' },
  { value: 'מבחן', label: 'מבחן' },
];

const BACKEND_OPTIONS: { value: AIBackend; label: string }[] = [
  { value: 'auto', label: 'אוטומטי' },
  { value: 'gemini', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash Preview' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'claude-cli', label: 'Claude CLI' },
  { value: 'codex', label: 'GPT-5.5 (Codex)' },
];

const PROGRESS_STATUS_OPTIONS: { value: TopicProgressStatus; label: string }[] = [
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'needs_review', label: STATUS_LABELS.needs_review },
];

const INITIAL_FORM: LessonPlanFormState = {
  topic: 'גאומטריה',
  subTopic: 'שטחים של מרובעים',
  grade: 'זי',
  duration: 45,
  lessonType: 'תרגול',
  curriculumTopicId: 'ms-grade7-t10',
  teacherRequest:
    'מערך שיעור בנושא גאומטריה לתלמידי כיתה ז\'. תרגילים מתקדמים בשטחים של מרובעים (מקבילית, טרפז, מלבן, ריבוע), שימוש בנוסחאות בכל הכיוונים: חישוב שטח מנתוני צלעות וחישוב אורכי צלעות בעזרת שטח. אפשר לכלול משוואות, אבל רק ממעלה ראשונה.',
  teacherNotes: '',
  previousLessonContext: '',
  includeWorksheet: true,
  backend: 'auto',
  classContextSource: 'auto',
};

export default function LessonPlanPage() {
  const [form, setForm] = useState<LessonPlanFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateLessonPlanResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedLessonPlan[]>([]);
  const [classProfiles, setClassProfiles] = useState<ClassProgressProfile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [postLessonStatus, setPostLessonStatus] = useState<TopicProgressStatus>('completed');
  const [postLessonHours, setPostLessonHours] = useState('1');
  const [postLessonDate, setPostLessonDate] = useState(new Date().toISOString().slice(0, 10));
  const [postLessonNotes, setPostLessonNotes] = useState('');
  const [progressSaveStatus, setProgressSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'local' | 'error'>('idle');
  const [progressSaveMessage, setProgressSaveMessage] = useState('');

  const curriculumTopicOptions = getLessonPlanCurriculumTopicOptions(form.grade);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_LESSON_PLANS_KEY);
      if (raw) setSavedPlans(JSON.parse(raw) as SavedLessonPlan[]);
    } catch {
      setSavedPlans([]);
    }

    try {
      const raw = window.localStorage.getItem(CLASS_PROGRESS_STORAGE_KEY);
      const profiles = raw ? JSON.parse(raw) as ClassProgressProfile[] : [];
      setClassProfiles(profiles);

      const params = new URLSearchParams(window.location.search);
      const classId = params.get('classId') ?? '';
      const topicId = params.get('topicId') ?? undefined;
      const profile = profiles.find(item => item.id === classId);
      if (profile) {
        setSelectedClassId(profile.id);
        applyClassSuggestion(profile, topicId);
      }
    } catch {
      setClassProfiles([]);
    }
  }, []);

  const selectedClass = classProfiles.find(item => item.id === selectedClassId);
  const postLessonTopicId = getTrackableTopicId(form.curriculumTopicId, selectedClass);
  const activityTimeline = selectedClass ? buildClassActivityTimeline(selectedClass, 4) : [];
  const worksheetSupported = supportsWorksheetForLessonType(form.lessonType);
  const effectiveIncludeWorksheet = resolveIncludeWorksheet(form.lessonType, form.includeWorksheet);

  function updateForm(patch: Partial<LessonPlanFormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function handleGradeChange(grade: GradeLevel) {
    setForm(prev => ({ ...prev, grade, curriculumTopicId: '' }));
  }

  function handleLessonTypeChange(lessonType: LessonType) {
    setForm(prev => ({
      ...prev,
      lessonType,
      includeWorksheet: supportsWorksheetForLessonType(lessonType)
        ? (supportsWorksheetForLessonType(prev.lessonType) ? prev.includeWorksheet : true)
        : false,
    }));
  }

  function handleCurriculumTopicChange(topicId: string) {
    const selectedTopic = curriculumTopicOptions.find(topic => topic.id === topicId);
    setForm(prev => ({
      ...prev,
      curriculumTopicId: topicId,
      topic: topicId && topicId !== CUSTOM_LESSON_PLAN_TOPIC_ID ? selectedTopic?.name ?? prev.topic : prev.topic,
    }));
  }

  function handleClassContextChange(classId: string) {
    setSelectedClassId(classId);
    setProgressSaveStatus('idle');
    setProgressSaveMessage('');
    if (!classId) {
      updateForm({ previousLessonContext: '', classContextSource: 'none' });
      return;
    }
    if (form.classContextSource === 'none') {
      updateForm({ classContextSource: 'auto' });
    }
  }

  function handleClassContextSourceChange(source: ClassContextSource) {
    if (source === 'manual' && !form.previousLessonContext) {
      const profile = classProfiles.find(item => item.id === selectedClassId);
      updateForm({
        classContextSource: source,
        previousLessonContext: profile ? renderClassContext(profile) : '',
      });
      return;
    }
    if (source !== 'manual') {
      updateForm({ classContextSource: source, previousLessonContext: '' });
      return;
    }
    updateForm({ classContextSource: source });
  }

  function applyClassSuggestion(profile: ClassProgressProfile, preferredTopicId?: string) {
    const suggestion = buildLessonSuggestion(profile, preferredTopicId);
    const topicId = preferredTopicId ?? suggestion?.topicId;
    const topicOptions = getLessonPlanCurriculumTopicOptions(profile.grade);
    const selectedTopic = topicId ? topicOptions.find(topic => topic.id === topicId) : undefined;
    setForm(prev => ({
      ...prev,
      grade: profile.grade,
      curriculumTopicId: selectedTopic?.id ?? suggestion?.topicId ?? prev.curriculumTopicId,
      topic: selectedTopic?.name ?? suggestion?.topic ?? prev.topic,
      subTopic: suggestion?.subTopic ?? selectedTopic?.learningObjectives[0] ?? prev.subTopic,
      lessonType: suggestion?.lessonType ?? prev.lessonType,
      teacherRequest: suggestion?.teacherRequest ?? '',
      previousLessonContext: prev.classContextSource === 'manual' ? renderClassContext(profile) : prev.previousLessonContext,
    }));
  }

  async function persistClassProfiles(nextProfiles: ClassProgressProfile[], nextSelectedClassId: string) {
    setClassProfiles(nextProfiles);
    setSelectedClassId(nextSelectedClassId);
    window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(nextProfiles));

    const resp = await fetch('/api/curriculum/classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: nextProfiles }),
    });
    if (!resp.ok) throw new Error(`שגיאה ${resp.status}`);
    const data = await readJsonOrError<{ authenticated?: boolean; profiles?: ClassProgressProfile[]; error?: string }>(resp);
    if (data.error) throw new Error(data.error);
    if (!data.authenticated) return { authenticated: false, profiles: nextProfiles };

    const profiles = data.profiles ?? nextProfiles;
    setClassProfiles(profiles);
    setSelectedClassId(profiles.some(profile => profile.id === nextSelectedClassId) ? nextSelectedClassId : profiles[0]?.id ?? '');
    window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(profiles));
    return { authenticated: true, profiles };
  }

  async function handleSavePostLessonProgress() {
    if (!selectedClass || !postLessonTopicId) return;

    setProgressSaveStatus('saving');
    setProgressSaveMessage('שומר התקדמות...');
    const now = new Date().toISOString();
    const nextProfile = recordPostLessonProgress(selectedClass, {
      topicId: postLessonTopicId,
      status: postLessonStatus,
      hoursTaught: Number(postLessonHours),
      taughtDate: postLessonDate,
      notes: postLessonNotes,
    }, now);
    const nextProfiles = classProfiles.map(profile => profile.id === selectedClass.id ? nextProfile : profile);

    try {
      const saved = await persistClassProfiles(nextProfiles, selectedClass.id);
      updateForm({ previousLessonContext: renderClassContext(nextProfile) });
      setPostLessonNotes('');
      setProgressSaveStatus(saved.authenticated ? 'saved' : 'local');
      setProgressSaveMessage(saved.authenticated ? 'נשמר במעקב הכיתה' : 'נשמר מקומית בדפדפן');
    } catch (err) {
      setClassProfiles(nextProfiles);
      window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(nextProfiles));
      updateForm({ previousLessonContext: renderClassContext(nextProfile) });
      setProgressSaveStatus('error');
      setProgressSaveMessage(err instanceof Error ? `נשמר מקומית; סנכרון נכשל: ${err.message}` : 'נשמר מקומית; סנכרון נכשל');
    }
  }

  function rememberPlan(request: LessonPlanFormState, response: GenerateLessonPlanResponse) {
    const saved: SavedLessonPlan = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      savedAt: new Date().toISOString(),
      request,
      response,
    };
    setSavedPlans(prev => {
      const next = [saved, ...prev].slice(0, 8);
      try {
        window.localStorage.setItem(SAVED_LESSON_PLANS_KEY, JSON.stringify(next));
      } catch {
        // The generated result is still visible even if browser storage is unavailable.
      }
      return next;
    });
  }

  function openSavedPlan(saved: SavedLessonPlan) {
    setForm({
      ...INITIAL_FORM,
      ...saved.request,
      includeWorksheet: resolveIncludeWorksheet(saved.request.lessonType, saved.request.includeWorksheet),
    });
    setResult(saved.response);
    setShowPreview(true);
    setError(null);
  }

  function clearSavedPlans() {
    setSavedPlans([]);
    window.localStorage.removeItem(SAVED_LESSON_PLANS_KEY);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const profile = classProfiles.find(item => item.id === selectedClassId);
    const previousLessonContext = resolvePreviousLessonContextForRequest(form, profile);
    const request = {
      ...form,
      previousLessonContext,
      includeWorksheet: effectiveIncludeWorksheet,
      ...(selectedClassId ? { classId: selectedClassId } : {}),
    };
    try {
      const resp = await fetch('/api/lesson-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await readJsonOrError<GenerateLessonPlanResponse>(resp);
      if (!resp.ok || data.error) {
        setError(data.error ?? `שגיאה ${resp.status}`);
        setResult(data);
      } else {
        setResult(data);
        rememberPlan(request, data);
        setShowPreview(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאת רשת');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(format: 'docx' | 'pdf', kind: 'plan' | 'worksheet' = 'plan') {
    const markdown = kind === 'plan' ? result?.markdown : result?.worksheetMarkdown;
    if (!markdown) return;
    const filename = kind === 'plan'
      ? buildLessonPlanFilename(result?.plan, form)
      : buildWorksheetFilename(result?.plan, form);
    setExporting(true);
    setError(null);
    try {
      const resp = await fetch('/api/exam/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename, format }),
      });
      if (!resp.ok) {
        const err = await readJsonOrError<{ error?: string }>(resp);
        setError(err.error ?? 'שגיאה ביצוא');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצוא');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>יצירת מערך שיעור</h1>
          <p style={subtitleStyle}>הזינו בקשה חופשית כמו שהמורה הייתה כותבת, ובחרו את שכבת הגיל והנושא בתכנית.</p>
        </div>
        <a href="/exam" style={linkButtonStyle}>יצירת מבחן</a>
      </header>

      {savedPlans.length > 0 && (
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <strong>מערכים אחרונים</strong>
            <button type="button" onClick={clearSavedPlans} style={btnSecondary}>נקה</button>
          </div>
          <div style={savedListStyle}>
            {savedPlans.map(saved => (
              <button key={saved.id} type="button" onClick={() => openSavedPlan(saved)} style={btnSecondary}>
                {gradeLabel(saved.request.grade)} · {saved.request.topic} · {new Date(saved.savedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </section>
      )}

      {classProfiles.length > 0 && (
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <strong>הקשר כיתה</strong>
            <a href="/curriculum" style={linkButtonStyle}>עדכן התקדמות</a>
          </div>
          <div style={classContextGridStyle}>
            <SelectField
              label="כיתה למעקב"
              value={selectedClassId}
              options={[
                { value: '', label: 'ללא הקשר כיתה' },
                ...classProfiles.map(profile => ({
                  value: profile.id,
                  label: `${profile.name} · ${gradeLabel(profile.grade)}`,
                })),
              ]}
              onChange={handleClassContextChange}
            />
            <button
              type="button"
              disabled={!selectedClass}
              onClick={() => selectedClass && applyClassSuggestion(selectedClass)}
              style={{ ...btnSecondary, opacity: selectedClass ? 1 : 0.55 }}
            >
              השתמש בהצעה מהמעקב
            </button>
          </div>
          {selectedClass && (
            <div style={{ marginTop: '0.75rem' }}>
              <SelectField
                label="הקשר כיתה בפרומפט"
                value={form.classContextSource}
                options={CLASS_CONTEXT_SOURCE_OPTIONS}
                onChange={v => handleClassContextSourceChange(v as ClassContextSource)}
              />
              <p style={hintTextStyle}>
                {form.classContextSource === 'auto' && 'הקשר הכיתה נטען מהמעקב בזמן יצירת המערך (טרי בכל בקשה).'}
                {form.classContextSource === 'manual' && 'אפשר לערוך את ההקשר בשדה "הקשר מהשיעור הקודם" למטה.'}
                {form.classContextSource === 'none' && 'המערך ייווצר ללא הקשר כיתה.'}
              </p>
            </div>
          )}
          {selectedClass && activityTimeline.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.4rem' }}>פעילות אחרונה</strong>
              <ul style={miniTimelineStyle}>
                {activityTimeline.map((entry, idx) => (
                  <li key={`${entry.date}-${entry.topicId}-${idx}`} style={miniTimelineItemStyle}>
                    <span style={miniTimelineDateStyle}>{formatTimelineDate(entry.date)}</span>
                    <span style={miniTimelineTopicStyle}>{entry.topicName}</span>
                    {entry.note && <span style={miniTimelineNoteStyle}>· {entry.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p style={hintTextStyle}>ההצעה ממלאת ברירות מחדל בלבד. אפשר לשנות ידנית כל נושא, סוג שיעור או הערת מורה.</p>
        </section>
      )}

      <section style={formSurfaceStyle}>
        <div style={gridStyle}>
          <Field label="נושא" value={form.topic} onChange={topic => updateForm({ topic })} />
          <Field label="תת-נושא / מיקוד" value={form.subTopic} onChange={subTopic => updateForm({ subTopic })} />
          <SelectField label="שכבת גיל" value={form.grade} options={GRADE_OPTIONS} onChange={v => handleGradeChange(v as GradeLevel)} />
          <SelectField
            label="משך"
            value={String(form.duration)}
            options={DURATION_OPTIONS}
            onChange={v => updateForm({ duration: Number(v) as LessonDuration })}
          />
          <SelectField
            label="סוג שיעור"
            value={form.lessonType}
            options={LESSON_TYPE_OPTIONS}
            onChange={v => handleLessonTypeChange(v as LessonType)}
          />
          <SelectField
            label="מודל AI"
            value={form.backend}
            options={BACKEND_OPTIONS}
            onChange={v => updateForm({ backend: v as AIBackend })}
          />
          <SelectField
            label="נושא בתכנית"
            value={form.curriculumTopicId}
            options={[
              { value: '', label: 'ללא שיוך' },
              ...curriculumTopicOptions.map(topic => ({
                value: topic.id,
                label: topic.sourceGrade
                  ? `${topic.name} (תכנית ${topic.sourceGrade})`
                  : topic.name,
              })),
              { value: CUSTOM_LESSON_PLAN_TOPIC_ID, label: 'אחר / פירוט חופשי' },
            ]}
            onChange={handleCurriculumTopicChange}
          />
        </div>

        {worksheetSupported ? (
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.includeWorksheet}
              onChange={e => updateForm({ includeWorksheet: e.target.checked })}
              style={checkboxStyle}
            />
            <span>
              <strong>צור דף עבודה לתלמידים</strong>
              <span style={toggleHintStyle}> מתאים לשיעורי הקנייה, תרגול וחזרה; אפשר לבטל אם רוצים רק תרגול כיתתי.</span>
            </span>
          </label>
        ) : (
          <p style={hintTextStyle}>בסוג שיעור מבחן לא נוצר דף עבודה לתלמידים.</p>
        )}

        <CurriculumHints topics={curriculumTopicOptions} selectedTopicId={form.curriculumTopicId} />

        <div style={stackStyle}>
          <TextArea
            label="בקשת המורה (חובה)"
            value={form.teacherRequest}
            onChange={teacherRequest => updateForm({ teacherRequest })}
            minHeight={150}
            placeholder="מה המטרה של השיעור? מה התלמידים צריכים לדעת לעשות בסוף? אילו סוגי תרגילים לכלול?"
          />
          <TextArea
            label="דגשים נוספים"
            value={form.teacherNotes}
            onChange={teacherNotes => updateForm({ teacherNotes })}
            placeholder="למשל: לא להעמיס בהקנייה, להכין דף עבודה, לעבוד בלוחות מחיקים"
          />
          <TextArea
            label={form.classContextSource === 'manual'
              ? 'הקשר מהשיעור הקודם (ידני)'
              : 'הקשר מהשיעור הקודם'}
            value={form.previousLessonContext}
            onChange={previousLessonContext => updateForm({ previousLessonContext })}
            placeholder={form.classContextSource === 'auto' && selectedClass
              ? 'במצב אוטומטי ההקשר נטען מהמעקב; אפשר להוסיף ידנית כדי לדרוס.'
              : 'אופציונלי'}
          />
        </div>

        <button type="button" onClick={handleGenerate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'מייצר מערך...' : 'ייצר מערך שיעור'}
        </button>
      </section>

      {loading && <GeneratingIndicator includeWorksheet={effectiveIncludeWorksheet} />}

      {error && <div style={errorStyle}>{error}</div>}

      {result?.plan && (
        <section style={resultStyle}>
          <div style={resultHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>{result.plan.topic}</h2>
              <p style={subtitleStyle}>
                {gradeLabel(result.plan.grade)} · {result.plan.duration} דקות · {result.plan.lessonType}
              </p>
            </div>
            <div style={actionsStyle}>
              <button type="button" onClick={() => handleDownload('docx')} disabled={exporting || !result.markdown} style={btnDownload}>
                {exporting ? 'מייצא...' : 'הורד DOCX'}
              </button>
              <button type="button" onClick={() => handleDownload('pdf')} disabled={exporting || !result.markdown} style={btnDownloadPdf}>
                {exporting ? 'מייצא...' : 'הורד PDF'}
              </button>
              {result.worksheetMarkdown && (
                <>
                  <button type="button" onClick={() => handleDownload('docx', 'worksheet')} disabled={exporting} style={btnDownloadWorksheet}>
                    {exporting ? 'מייצא...' : 'דף עבודה DOCX'}
                  </button>
                  <button type="button" onClick={() => handleDownload('pdf', 'worksheet')} disabled={exporting} style={btnDownloadWorksheetPdf}>
                    {exporting ? 'מייצא...' : 'דף עבודה PDF'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => setShowPreview(prev => !prev)} style={btnSecondary}>
                {showPreview ? 'הסתר תצוגה' : 'הצג תצוגה'}
              </button>
            </div>
          </div>

          {result.invariantViolations && result.invariantViolations.length === 0 && (
            <div style={successStyle}>בדיקות המבנה עברו: פתיחה עצמאית, עבודה עצמית אחרונה, וסכום זמנים תקין.</div>
          )}

          {result.artifactId && (
            <div style={successStyle}>נשמר בארכיון המורה: {result.artifactId}</div>
          )}

          {result.artifactWarning && (
            <div style={warningStyle}>{result.artifactWarning}</div>
          )}

          {result.worksheetVerification && (
            <div style={result.worksheetVerification.failed > 0 || result.worksheetVerification.warning ? warningStyle : successStyle}>
              אימות דף עבודה: {result.worksheetVerification.verified}/{result.worksheetVerification.total} פריטים אומתו ב-SymPy
              {result.worksheetVerification.skipped > 0 ? ` · ${result.worksheetVerification.skipped} דורשים בדיקה ידנית` : ''}
              {result.worksheetVerification.warning ? ` · ${result.worksheetVerification.warning}` : ''}
            </div>
          )}

          {selectedClass && (
            <section style={postLessonPanelStyle}>
              <div style={panelHeaderStyle}>
                <strong>עדכון אחרי השיעור</strong>
                <a href="/curriculum" style={linkButtonStyle}>פתח מעקב כיתה</a>
              </div>
              {postLessonTopicId ? (
                <>
                  <div style={postLessonGridStyle}>
                    <SelectField
                      label="סטטוס אחרי השיעור"
                      value={postLessonStatus}
                      options={PROGRESS_STATUS_OPTIONS}
                      onChange={value => setPostLessonStatus(value as TopicProgressStatus)}
                    />
                    <Field
                      label="שעות שנלמדו עכשיו"
                      type="number"
                      value={postLessonHours}
                      onChange={setPostLessonHours}
                    />
                    <Field
                      label="תאריך"
                      type="date"
                      value={postLessonDate}
                      onChange={setPostLessonDate}
                    />
                  </div>
                  <TextArea
                    label="מה קרה בפועל"
                    value={postLessonNotes}
                    onChange={setPostLessonNotes}
                    placeholder="למשל: הספקנו רק את סעיפים א-ג; לפתוח בפעם הבאה בתרגול בעיות מילוליות"
                  />
                  <div style={postLessonActionsStyle}>
                    <button
                      type="button"
                      onClick={handleSavePostLessonProgress}
                      disabled={progressSaveStatus === 'saving'}
                      style={{ ...btnPrimary, opacity: progressSaveStatus === 'saving' ? 0.6 : 1 }}
                    >
                      {progressSaveStatus === 'saving' ? 'שומר...' : 'שמור למעקב הכיתה'}
                    </button>
                    {progressSaveMessage && (
                      <span style={progressMessageStyle(progressSaveStatus)}>{progressSaveMessage}</span>
                    )}
                  </div>
                </>
              ) : (
                <p style={hintTextStyle}>בחרו נושא בתכנית כדי לשמור את תוצאות השיעור למעקב הכיתה.</p>
              )}
            </section>
          )}

          {showPreview && result.markdown && <MarkdownPreview markdown={result.markdown} />}
        </section>
      )}
    </main>
  );
}

function resolvePreviousLessonContextForRequest(
  form: LessonPlanFormState,
  profile: ClassProgressProfile | undefined,
): string {
  if (form.classContextSource === 'none') return '';
  if (form.classContextSource === 'manual') return form.previousLessonContext.trim();
  // 'auto': prefer existing text if teacher typed one; otherwise pass a localStorage-rendered
  // snapshot as a fallback for signed-out users. Server-side load (when signed in) overrides this.
  const typed = form.previousLessonContext.trim();
  if (typed) return typed;
  return profile ? renderClassContext(profile) : '';
}

function formatTimelineDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  return `${day}.${month}`;
}

const miniTimelineStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.3rem',
  fontSize: '0.88rem',
};

const miniTimelineItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  alignItems: 'baseline',
  flexWrap: 'wrap',
};

const miniTimelineDateStyle: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: '#64748b',
  minWidth: '3.2rem',
};

const miniTimelineTopicStyle: React.CSSProperties = {
  color: '#111827',
  fontWeight: 500,
};

const miniTimelineNoteStyle: React.CSSProperties = {
  color: '#4b5563',
};

function buildLessonPlanFilename(plan: LessonPlan | undefined, fallback: LessonPlanFormState): string {
  const topic = plan?.topic?.trim() || fallback.topic.trim() || 'ללא נושא';
  const grade = gradeLabel(plan?.grade ?? fallback.grade);
  return sanitizeFilename(`מערך שיעור ${topic} כיתה ${grade}`);
}

function buildWorksheetFilename(plan: LessonPlan | undefined, fallback: LessonPlanFormState): string {
  const topic = plan?.topic?.trim() || fallback.topic.trim() || 'ללא נושא';
  const grade = gradeLabel(plan?.grade ?? fallback.grade);
  return sanitizeFilename(`דף עבודה ${topic} כיתה ${grade}`);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function getTrackableTopicId(topicId: string, profile?: ClassProgressProfile): string {
  if (!topicId || topicId === CUSTOM_LESSON_PLAN_TOPIC_ID) return '';
  if (!profile) return topicId;
  const belongsToClassGrade = getCurriculumUnitForGrade(profile.grade).topics.some(topic => topic.id === topicId);
  if (!belongsToClassGrade) return '';
  return topicId;
}

async function readJsonOrError<T extends { error?: string }>(resp: Response): Promise<T> {
  const text = await resp.text();
  if (!text.trim()) {
    return { error: `שגיאה ${resp.status}` } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text } as T;
  }
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <input type={type} style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, minHeight = 96 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <textarea
        style={{ ...inputStyle, minHeight, resize: 'vertical' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  return (
    <div style={previewStyle}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '0.5rem' }} />;
        if (line.startsWith('#### ')) return <h4 key={idx} style={previewH4}>{renderInline(line.slice(5))}</h4>;
        if (line.startsWith('### ')) return <h3 key={idx} style={previewH3}>{renderInline(line.slice(4))}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx} style={previewH2}>{renderInline(line.slice(3))}</h2>;
        if (line.startsWith('# ')) return <h1 key={idx} style={previewH1}>{renderInline(line.slice(2))}</h1>;
        return <p key={idx} style={previewParagraph}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\$[^$]+\$|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('$') && token.endsWith('$')) {
      return <span key={idx} style={mathStyle}>{token}</span>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={idx} style={codeStyle}>{token.slice(1, -1)}</code>;
    }
    return <span key={idx}>{token}</span>;
  });
}

function CurriculumHints({ topics, selectedTopicId }: {
  topics: { id: string; learningObjectives: string[] }[];
  selectedTopicId: string;
}) {
  const selected = topics.find(t => t.id === selectedTopicId);
  if (!selected || selected.learningObjectives.length === 0) return null;

  return (
    <details style={hintsDetailsStyle}>
      <summary style={hintsSummaryStyle}>יעדי למידה בתכנית ({selected.learningObjectives.length})</summary>
      <ul style={hintsListStyle}>
        {selected.learningObjectives.map((obj, i) => (
          <li key={i} style={hintsItemStyle}>{obj}</li>
        ))}
      </ul>
    </details>
  );
}

const GENERATING_MESSAGES = [
  'קורא את בקשת המורה...',
  'בוחר תרגילים מתאימים...',
  'מתאים לתכנית הלימודים...',
  'בונה את שלבי השיעור...',
  'בודק שהזמנים מסתדרים...',
  'מכין דף עבודה...',
  'כמעט מוכן...',
];

const GENERATING_MESSAGES_WITHOUT_WORKSHEET = GENERATING_MESSAGES.filter(message => message !== 'מכין דף עבודה...');

function GeneratingIndicator({ includeWorksheet }: { includeWorksheet: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const startRef = useRef(Date.now());
  const messages = includeWorksheet ? GENERATING_MESSAGES : GENERATING_MESSAGES_WITHOUT_WORKSHEET;

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages.length]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds} שניות`;

  return (
    <div style={indicatorContainer}>
      <div style={indicatorBar}>
        <div style={indicatorFill} />
      </div>
      <div style={indicatorTextRow}>
        <span style={indicatorMessage}>{messages[msgIndex % messages.length]}</span>
        <span style={indicatorTime}>{timeStr}</span>
      </div>
      <style>{`
        @keyframes lp-progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

const indicatorContainer: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.85rem 1rem',
  background: '#f0f5ff',
  border: '1px solid #c7d8f0',
  borderRadius: 8,
};

const indicatorBar: React.CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: '#dce6f5',
  overflow: 'hidden',
  marginBottom: '0.6rem',
};

const indicatorFill: React.CSSProperties = {
  width: '50%',
  height: '100%',
  borderRadius: 2,
  background: '#3b82f6',
  animation: 'lp-progress-slide 1.8s ease-in-out infinite',
};

const indicatorTextRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.88rem',
};

const indicatorMessage: React.CSSProperties = {
  color: '#1e4a7a',
  fontWeight: 500,
};

const indicatorTime: React.CSSProperties = {
  color: '#6b7280',
  fontVariantNumeric: 'tabular-nums',
};

const hintsDetailsStyle: React.CSSProperties = {
  margin: '0.5rem 0 0.75rem',
  padding: '0.6rem 0.75rem',
  background: '#f0f5ff',
  border: '1px solid #c7d8f0',
  borderRadius: 6,
  fontSize: '0.85rem',
  lineHeight: 1.6,
};

const hintsSummaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontWeight: 500,
  color: '#1e4a7a',
};

const hintsListStyle: React.CSSProperties = {
  margin: '0.4rem 0 0',
  paddingInlineStart: '1.2rem',
};

const hintsItemStyle: React.CSSProperties = {
  color: '#374151',
  marginBottom: '0.15rem',
};

const pageStyle: React.CSSProperties = {
  maxWidth: 1040,
  margin: '0 auto',
  padding: '2rem 1rem 3rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1.25rem',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.75rem',
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  margin: '0.35rem 0 0',
  color: '#4b5563',
  lineHeight: 1.5,
};

const panelStyle: React.CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 8,
  padding: '0.85rem',
  marginBottom: '1rem',
  background: '#f8fbff',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '0.6rem',
};

const savedListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const classContextGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) auto',
  gap: '0.75rem',
  alignItems: 'end',
};

const hintTextStyle: React.CSSProperties = {
  margin: '0.6rem 0 0',
  color: '#64748b',
  fontSize: '0.88rem',
  lineHeight: 1.5,
};

const formSurfaceStyle: React.CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 8,
  padding: '1rem',
  background: '#fff',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: '0.9rem',
  marginBottom: '1rem',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.55rem',
  border: '1px solid #d7dee8',
  borderRadius: 6,
  padding: '0.7rem 0.8rem',
  marginBottom: '0.8rem',
  background: '#f8fbff',
  lineHeight: 1.5,
};

const checkboxStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 3,
};

const toggleHintStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.88rem',
};

const stackStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  marginBottom: '1rem',
};

const fieldStyle: React.CSSProperties = {
  display: 'block',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.55rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  background: '#fff',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.75rem 1.4rem',
  background: '#1769aa',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.45rem 0.85rem',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnDownload: React.CSSProperties = {
  ...btnPrimary,
  background: '#2e7d32',
};

const btnDownloadPdf: React.CSSProperties = {
  ...btnPrimary,
  background: '#b71c1c',
};

const btnDownloadWorksheet: React.CSSProperties = {
  ...btnPrimary,
  background: '#2f6f73',
};

const btnDownloadWorksheetPdf: React.CSSProperties = {
  ...btnPrimary,
  background: '#8a3a16',
};

const linkButtonStyle: React.CSSProperties = {
  ...btnSecondary,
  textDecoration: 'none',
  color: '#111827',
  whiteSpace: 'nowrap',
};

const errorStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.85rem',
  background: '#fff1f2',
  border: '1px solid #fecdd3',
  borderRadius: 6,
  color: '#9f1239',
  whiteSpace: 'pre-wrap',
};

const successStyle: React.CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem',
  borderRadius: 6,
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#065f46',
};

const warningStyle: React.CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem',
  borderRadius: 6,
  background: '#fffbeb',
  border: '1px solid #fde68a',
  color: '#92400e',
};

const resultStyle: React.CSSProperties = {
  marginTop: '1.5rem',
};

const resultHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1rem',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const postLessonPanelStyle: React.CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 8,
  padding: '0.9rem',
  background: '#fff',
  marginBottom: '1rem',
};

const postLessonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const postLessonActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: '0.75rem',
};

function progressMessageStyle(status: 'idle' | 'saving' | 'saved' | 'local' | 'error'): React.CSSProperties {
  const colors = {
    idle: { background: '#f8fafc', border: '#cbd5e1', color: '#475569' },
    saving: { background: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    saved: { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
    local: { background: '#f8fafc', border: '#cbd5e1', color: '#475569' },
    error: { background: '#fffbeb', border: '#fde68a', color: '#92400e' },
  }[status];
  return {
    padding: '0.45rem 0.7rem',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    background: colors.background,
    color: colors.color,
    fontSize: '0.86rem',
  };
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.35rem',
};

const previewStyle: React.CSSProperties = {
  background: '#f9fafb',
  padding: '1.4rem',
  borderRadius: 8,
  lineHeight: 1.8,
  fontSize: '0.95rem',
  border: '1px solid #e5e7eb',
};

const previewH1: React.CSSProperties = {
  fontSize: '1.35rem',
  margin: '0 0 0.25rem',
  fontWeight: 700,
};

const previewH2: React.CSSProperties = {
  fontSize: '1.16rem',
  margin: '0.35rem 0 0.15rem',
  fontWeight: 700,
};

const previewH3: React.CSSProperties = {
  fontSize: '1.04rem',
  margin: '0.45rem 0 0.1rem',
  fontWeight: 700,
  color: '#174a7c',
};

const previewH4: React.CSSProperties = {
  fontSize: '1rem',
  margin: '0.35rem 0 0.1rem',
  fontWeight: 700,
};

const previewParagraph: React.CSSProperties = {
  margin: 0,
};

const mathStyle: React.CSSProperties = {
  direction: 'ltr',
  unicodeBidi: 'isolate',
  display: 'inline-block',
  fontFamily: 'Cambria Math, Times New Roman, serif',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  padding: '0 0.2rem',
  margin: '0 0.1rem',
};

const codeStyle: React.CSSProperties = {
  direction: 'ltr',
  unicodeBidi: 'isolate',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.9em',
  background: '#eef2ff',
  borderRadius: 4,
  padding: '0 0.25rem',
};
