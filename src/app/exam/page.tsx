'use client';

import { useState } from 'react';
import type { ExamRequest, ExamPartSpec, ExamQuestionSpec } from '@/exam/types';
import { CUSTOM_CURRICULUM_TOPIC_ID, getCurriculumTopicOptions } from '@/exam/curriculumContext';
import type { GradeLevel } from '@/types/shared';

interface VerificationResult {
  questionRef: string;
  isValid: boolean;
  computedAnswer: string | null;
  message: string;
}

interface GenerateResponse {
  exam: unknown;
  examMarkdown: string;
  answerKeyMarkdown: string;
  verification: VerificationResult[];
  error?: string;
}

const GRADE_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: 'זי', label: "ז'" },
  { value: 'חי', label: "ח'" },
  { value: 'טי', label: "ט'" },
  { value: 'יי', label: "י'" },
  { value: 'יאי', label: "יא'" },
  { value: 'יבי', label: "יב'" },
];

const QUESTION_TYPES: { value: ExamQuestionSpec['questionType']; label: string }[] = [
  { value: 'חישובי', label: 'חישובי' },
  { value: 'בעיה_מילולית', label: 'בעיה מילולית' },
  { value: 'הוכחה', label: 'הוכחה' },
  { value: 'קריאה_וניתוח', label: 'קריאה וניתוח' },
  { value: 'מעורב', label: 'מעורב' },
];

function emptyQuestion(): ExamQuestionSpec {
  return { topic: '', questionType: 'חישובי', points: 20, subQuestionCount: 2 };
}

function emptyPart(): ExamPartSpec {
  return { title: '', questionSpecs: [emptyQuestion()] };
}

export default function ExamPage() {
  const [className, setClassName] = useState("שכבה ב' מואצת");
  const [date, setDate] = useState(new Date().toLocaleDateString('he-IL'));
  const [grade, setGrade] = useState<GradeLevel>('חי');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [totalPoints, setTotalPoints] = useState(100);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [parts, setParts] = useState<ExamPartSpec[]>([emptyPart()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'exam' | 'answers' | 'verification'>('exam');
  const [exporting, setExporting] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const curriculumTopicOptions = getCurriculumTopicOptions(grade);

  function updatePart(idx: number, patch: Partial<ExamPartSpec>) {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }

  function updateQuestion(partIdx: number, qIdx: number, patch: Partial<ExamQuestionSpec>) {
    setParts(prev => prev.map((p, pi) =>
      pi === partIdx
        ? { ...p, questionSpecs: p.questionSpecs.map((q, qi) => qi === qIdx ? { ...q, ...patch } : q) }
        : p
    ));
  }

  function replaceQuestion(partIdx: number, qIdx: number, update: (question: ExamQuestionSpec) => ExamQuestionSpec) {
    setParts(prev => prev.map((p, pi) =>
      pi === partIdx
        ? { ...p, questionSpecs: p.questionSpecs.map((q, qi) => qi === qIdx ? update(q) : q) }
        : p
    ));
  }

  function handleGradeChange(nextGrade: GradeLevel) {
    setGrade(nextGrade);
    setParts(prev => prev.map(part => ({
      ...part,
      questionSpecs: part.questionSpecs.map(question => {
        const { curriculumTopicId: _, ...rest } = question;
        return rest;
      }),
    })));
  }

  function handleCurriculumTopicChange(partIdx: number, qIdx: number, topicId: string) {
    if (!topicId) {
      replaceQuestion(partIdx, qIdx, question => {
        const { curriculumTopicId: _, ...rest } = question;
        return rest;
      });
      return;
    }

    if (topicId === CUSTOM_CURRICULUM_TOPIC_ID) {
      updateQuestion(partIdx, qIdx, { curriculumTopicId: topicId, topic: '' });
      return;
    }

    const selectedTopic = curriculumTopicOptions.find(topic => topic.id === topicId);
    updateQuestion(partIdx, qIdx, {
      curriculumTopicId: topicId,
      topic: selectedTopic?.name ?? '',
    });
  }

  function addQuestion(partIdx: number) {
    setParts(prev => prev.map((p, i) =>
      i === partIdx ? { ...p, questionSpecs: [...p.questionSpecs, emptyQuestion()] } : p
    ));
  }

  function removeQuestion(partIdx: number, qIdx: number) {
    setParts(prev => prev.map((p, pi) =>
      pi === partIdx
        ? { ...p, questionSpecs: p.questionSpecs.filter((_, qi) => qi !== qIdx) }
        : p
    ));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const request: ExamRequest = {
      className,
      date,
      grade,
      durationMinutes,
      totalPoints,
      parts,
      ...(teacherNotes ? { teacherNotes } : {}),
    };

    try {
      const resp = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = (await resp.json()) as GenerateResponse;
      if (!resp.ok || data.error) {
        setError(data.error ?? `שגיאה ${resp.status}`);
      } else {
        setResult(data);
        setActiveTab('exam');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאת רשת');
    } finally {
      setLoading(false);
    }
  }

  const passedCount = result?.verification.filter(v => v.isValid).length ?? 0;
  const failedCount = result?.verification.filter(v => !v.isValid).length ?? 0;

  async function handleDownload(type: 'exam' | 'answers') {
    if (!result) return;
    const markdown = type === 'exam' ? result.examMarkdown : result.answerKeyMarkdown;
    const filename = type === 'exam' ? 'מבחן' : 'פתרון';
    setExporting(type);
    try {
      const resp = await fetch('/api/exam/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename }),
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
      a.download = `${filename}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצוא');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>יצירת מבחן</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Field label="שכבה / כיתה" value={className} onChange={setClassName} />
        <Field label="תאריך" value={date} onChange={setDate} />
        <SelectField label="שכבת גיל" value={grade} options={GRADE_OPTIONS} onChange={v => handleGradeChange(v as GradeLevel)} />
        <Field label="משך (דקות)" type="number" value={String(durationMinutes)} onChange={v => setDurationMinutes(Number(v))} />
        <Field label='סה"כ ניקוד' type="number" value={String(totalPoints)} onChange={v => setTotalPoints(Number(v))} />
      </div>

      {parts.map((part, pi) => (
        <div key={pi} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Field
              label={`כותרת חלק ${pi + 1}`}
              value={part.title}
              onChange={v => updatePart(pi, { title: v })}
              placeholder="למשל: אלגברה"
            />
            {parts.length > 1 && (
              <button
                type="button"
                onClick={() => setParts(prev => prev.filter((_, i) => i !== pi))}
                style={btnDanger}
              >
                הסר חלק
              </button>
            )}
          </div>

          {part.questionSpecs.map((q, qi) => (
            <div key={qi} style={{ background: '#f8f9fa', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
                <SelectField
                  label="נושא בתוכנית"
                  value={q.curriculumTopicId ?? ''}
                  options={[
                    { value: '', label: 'בחר/י נושא' },
                    ...curriculumTopicOptions.map(topic => ({ value: topic.id, label: topic.name })),
                    { value: CUSTOM_CURRICULUM_TOPIC_ID, label: 'אחר / פירוט חופשי' },
                  ]}
                  onChange={v => handleCurriculumTopicChange(pi, qi, v)}
                />
                <Field
                  label={q.curriculumTopicId === CUSTOM_CURRICULUM_TOPIC_ID ? 'פירוט חופשי' : 'מיקוד'}
                  value={q.topic}
                  onChange={v => updateQuestion(pi, qi, { topic: v })}
                  placeholder={q.curriculumTopicId === CUSTOM_CURRICULUM_TOPIC_ID ? 'למשל: חזרה ממוקדת לפני מבחן' : 'אפשר לדייק את הנושא'}
                />
                <SelectField
                  label="סוג"
                  value={q.questionType}
                  options={QUESTION_TYPES}
                  onChange={v => updateQuestion(pi, qi, { questionType: v as ExamQuestionSpec['questionType'] })}
                />
                <Field label="ניקוד" type="number" value={String(q.points)} onChange={v => updateQuestion(pi, qi, { points: Number(v) })} />
                <Field label="תת-שאלות" type="number" value={String(q.subQuestionCount ?? '')} onChange={v => {
                  if (v) { updateQuestion(pi, qi, { subQuestionCount: Number(v) }); }
                  else {
                    setParts(prev => prev.map((p, pidx) =>
                      pidx === pi
                        ? { ...p, questionSpecs: p.questionSpecs.map((qq, qidx) => {
                            if (qidx !== qi) return qq;
                            const { subQuestionCount: _, ...rest } = qq;
                            return rest as ExamQuestionSpec;
                          })}
                        : p
                    ));
                  }
                }} />
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={labelStyle}>אילוצים (שורה לכל אילוץ)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }}
                  value={q.constraints?.join('\n') ?? ''}
                  onChange={e => {
                    const lines = e.target.value.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                      updateQuestion(pi, qi, { constraints: lines });
                    } else {
                      setParts(prev => prev.map((p, pidx) =>
                        pidx === pi
                          ? { ...p, questionSpecs: p.questionSpecs.map((qq, qidx) => {
                              if (qidx !== qi) return qq;
                              const { constraints: _, ...rest } = qq;
                              return rest as ExamQuestionSpec;
                            })}
                          : p
                      ));
                    }
                  }}
                />
              </div>
              {part.questionSpecs.length > 1 && (
                <button type="button" onClick={() => removeQuestion(pi, qi)} style={{ ...btnDanger, fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  הסר שאלה
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={() => addQuestion(pi)} style={btnSecondary}>+ שאלה</button>
        </div>
      ))}

      <button type="button" onClick={() => setParts(prev => [...prev, emptyPart()])} style={{ ...btnSecondary, marginBottom: '1rem' }}>
        + חלק חדש
      </button>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>הערות למורה</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={teacherNotes}
          onChange={e => setTeacherNotes(e.target.value)}
          placeholder="הערות נוספות לגבי רמת הקושי, סגנון השאלות וכו'"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          ...btnPrimary,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'מייצר מבחן...' : 'ייצר מבחן'}
      </button>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee', borderRadius: 6, color: '#c00' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          {/* Verification summary */}
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 6,
            marginBottom: '1.5rem',
            background: failedCount > 0 ? '#fff3e0' : '#e8f5e9',
            border: `1px solid ${failedCount > 0 ? '#ffcc80' : '#a5d6a7'}`,
          }}>
            <strong>אימות מתמטי:</strong>{' '}
            {failedCount === 0
              ? `${passedCount}/${passedCount} תקינים`
              : `${passedCount} תקינים, ${failedCount} נכשלו`}
            {failedCount > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {result.verification.filter(v => !v.isValid).map((v, i) => (
                  <div key={i} style={{ color: '#c00' }}>
                    {v.questionRef}: {v.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => handleDownload('exam')}
              disabled={exporting !== null}
              style={{ ...btnDownload, opacity: exporting ? 0.6 : 1 }}
            >
              {exporting === 'exam' ? 'מייצא...' : 'הורד מבחן (docx)'}
            </button>
            <button
              type="button"
              onClick={() => handleDownload('answers')}
              disabled={exporting !== null}
              style={{ ...btnDownload, background: '#43a047', opacity: exporting ? 0.6 : 1 }}
            >
              {exporting === 'answers' ? 'מייצא...' : 'הורד פתרון (docx)'}
            </button>
          </div>

          {/* Collapsible preview */}
          <button
            type="button"
            onClick={() => setShowPreview(prev => !prev)}
            style={{ ...btnSecondary, marginBottom: '0.75rem' }}
          >
            {showPreview ? 'הסתר תצוגה מקדימה' : 'הצג תצוגה מקדימה'}
          </button>

          {showPreview && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
                <TabButton active={activeTab === 'exam'} onClick={() => setActiveTab('exam')}>מבחן</TabButton>
                <TabButton active={activeTab === 'answers'} onClick={() => setActiveTab('answers')}>פתרון</TabButton>
                <TabButton active={activeTab === 'verification'} onClick={() => setActiveTab('verification')}>
                  אימות ({passedCount}/{passedCount + failedCount})
                </TabButton>
              </div>

              {activeTab === 'exam' && (
                <pre style={preStyle}>{result.examMarkdown}</pre>
              )}

              {activeTab === 'answers' && (
                <pre style={preStyle}>{result.answerKeyMarkdown}</pre>
              )}

              {activeTab === 'verification' && (
                <div>
                  {result.verification.map((v, i) => (
                    <div key={i} style={{
                      padding: '0.5rem 0.75rem',
                      marginBottom: '0.25rem',
                      borderRadius: 4,
                      background: v.isValid ? '#e8f5e9' : '#ffebee',
                    }}>
                      <strong>{v.questionRef}</strong>: {v.message}
                      {v.computedAnswer && <span style={{ color: '#666' }}> (תשובה: {v.computedAnswer})</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
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
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        style={inputStyle}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        border: 'none',
        borderBottom: active ? '2px solid #1976d2' : '2px solid transparent',
        background: 'none',
        fontWeight: active ? 700 : 400,
        color: active ? '#1976d2' : '#666',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.95rem',
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.75rem 2rem',
  background: '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.4rem 1rem',
  background: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  padding: '0.3rem 0.75rem',
  background: '#fee',
  border: '1px solid #e99',
  borderRadius: 4,
  fontSize: '0.85rem',
  color: '#c00',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnDownload: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: '#1565c0',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  flex: 1,
};

const preStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  background: '#f9f9f9',
  padding: '1.5rem',
  borderRadius: 8,
  lineHeight: 1.8,
  fontSize: '0.95rem',
  border: '1px solid #eee',
};
