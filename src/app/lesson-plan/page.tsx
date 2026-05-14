'use client';

import { useEffect, useState } from 'react';
import type { LessonDuration, LessonPlan, LessonType } from '@/types/lessonPlan';
import type { GradeLevel } from '@/types/shared';
import { CUSTOM_LESSON_PLAN_TOPIC_ID, getLessonPlanCurriculumTopicOptions } from '@/lessonPlan/curriculumContext';

interface GenerateLessonPlanResponse {
  plan?: LessonPlan;
  markdown?: string;
  invariantViolations?: { code: string; message: string }[];
  error?: string;
}

interface SavedLessonPlan {
  id: string;
  savedAt: string;
  request: LessonPlanFormState;
  response: GenerateLessonPlanResponse;
}

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
}

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
};

export default function LessonPlanPage() {
  const [form, setForm] = useState<LessonPlanFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateLessonPlanResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedLessonPlan[]>([]);

  const curriculumTopicOptions = getLessonPlanCurriculumTopicOptions(form.grade);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_LESSON_PLANS_KEY);
      if (raw) setSavedPlans(JSON.parse(raw) as SavedLessonPlan[]);
    } catch {
      setSavedPlans([]);
    }
  }, []);

  function updateForm(patch: Partial<LessonPlanFormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function handleGradeChange(grade: GradeLevel) {
    setForm(prev => ({ ...prev, grade, curriculumTopicId: '' }));
  }

  function handleCurriculumTopicChange(topicId: string) {
    const selectedTopic = curriculumTopicOptions.find(topic => topic.id === topicId);
    setForm(prev => ({
      ...prev,
      curriculumTopicId: topicId,
      topic: topicId && topicId !== CUSTOM_LESSON_PLAN_TOPIC_ID ? selectedTopic?.name ?? prev.topic : prev.topic,
    }));
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
    setForm(saved.request);
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

    const request = { ...form };
    try {
      const resp = await fetch('/api/lesson-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = (await resp.json()) as GenerateLessonPlanResponse;
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

  async function handleDownload() {
    if (!result?.markdown) return;
    setExporting(true);
    setError(null);
    try {
      const resp = await fetch('/api/exam/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: result.markdown, filename: 'מערך שיעור' }),
      });
      if (!resp.ok) {
        const err = await resp.json() as { error?: string };
        setError(err.error ?? 'שגיאה ביצוא');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'מערך שיעור.docx';
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
                {saved.request.grade} · {saved.request.topic} · {new Date(saved.savedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
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
            onChange={v => updateForm({ lessonType: v as LessonType })}
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
            label="הקשר מהשיעור הקודם"
            value={form.previousLessonContext}
            onChange={previousLessonContext => updateForm({ previousLessonContext })}
            placeholder="אופציונלי"
          />
        </div>

        <button type="button" onClick={handleGenerate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'מייצר מערך...' : 'ייצר מערך שיעור'}
        </button>
      </section>

      {error && <div style={errorStyle}>{error}</div>}

      {result?.plan && (
        <section style={resultStyle}>
          <div style={resultHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>{result.plan.topic}</h2>
              <p style={subtitleStyle}>
                {result.plan.grade} · {result.plan.duration} דקות · {result.plan.lessonType}
              </p>
            </div>
            <div style={actionsStyle}>
              <button type="button" onClick={handleDownload} disabled={exporting || !result.markdown} style={btnDownload}>
                {exporting ? 'מייצא...' : 'הורד DOCX'}
              </button>
              <button type="button" onClick={() => setShowPreview(prev => !prev)} style={btnSecondary}>
                {showPreview ? 'הסתר תצוגה' : 'הצג תצוגה'}
              </button>
            </div>
          </div>

          {result.invariantViolations && result.invariantViolations.length === 0 && (
            <div style={successStyle}>בדיקות המבנה עברו: פתיחה עצמאית, עבודה עצמית אחרונה, וסכום זמנים תקין.</div>
          )}

          {showPreview && result.markdown && <MarkdownPreview markdown={result.markdown} />}
        </section>
      )}
    </main>
  );
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
