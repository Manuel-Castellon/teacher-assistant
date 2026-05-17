'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  QuestionBankItemFull,
  QuestionBankItemSummary,
  QuestionLicense,
  QuestionType,
  QuestionBankDifficulty,
} from '@/questionBank/types';
import type { GradeLevel } from '@/types/shared';

interface ListResponse {
  items?: QuestionBankItemSummary[];
  error?: string;
}

interface DetailResponse {
  item?: QuestionBankItemFull;
  error?: string;
}

const GRADES: GradeLevel[] = ['זי','חי','טי','יי','יאי','יבי'];
const GRADE_LABEL: Record<GradeLevel, string> = {
  'זי': "ז'", 'חי': "ח'", 'טי': "ט'", 'יי': "י'", 'יאי': "יא'", 'יבי': "יב'",
};
const LICENSES: QuestionLicense[] = ['ministry-public','teacher-original','open-license','public-domain','copyrighted-personal-use','student-submitted'];
const LICENSE_LABEL: Record<QuestionLicense, string> = {
  'ministry-public': 'משרד החינוך',
  'teacher-original': 'המורה',
  'open-license': 'רישיון פתוח',
  'public-domain': 'נחלת הכלל',
  'copyrighted-personal-use': 'ספר לימוד (שימוש פרטי)',
  'student-submitted': 'תלמיד/ה',
  'unknown': '—',
};
const QTYPES: QuestionType[] = ['חישובי','בעיה_מילולית','הוכחה','קריאה_וניתוח','מעורב'];
const DIFFS: QuestionBankDifficulty[] = ['בסיסי','בינוני','מתקדם','אתגר'];

export default function QuestionBankPage() {
  const [items, setItems] = useState<QuestionBankItemSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [grade, setGrade] = useState<GradeLevel | ''>('');
  const [license, setLicense] = useState<QuestionLicense | ''>('');
  const [questionType, setQuestionType] = useState<QuestionType | ''>('');
  const [difficulty, setDifficulty] = useState<QuestionBankDifficulty | ''>('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuestionBankItemFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (grade) params.set('grade', grade);
    if (license) params.set('license', license);
    if (questionType) params.set('questionType', questionType);
    if (difficulty) params.set('difficulty', difficulty);
    return params.toString();
  }, [grade, license, questionType, difficulty]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    (async () => {
      try {
        const resp = await fetch(`/api/question-bank${queryString ? `?${queryString}` : ''}`);
        const body = (await resp.json()) as ListResponse;
        if (cancelled) return;
        if (!resp.ok || body.error || !body.items) {
          setListError(body.error ?? 'שגיאה בטעינת השאלות');
          setItems([]);
        } else {
          setItems(body.items);
          if (body.items.length > 0 && !body.items.find(i => i.id === selectedId)) {
            setSelectedId(body.items[0]!.id);
          } else if (body.items.length === 0) {
            setSelectedId(null);
          }
        }
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // selectedId intentionally not in deps — only re-fetch on filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    (async () => {
      try {
        const resp = await fetch(`/api/question-bank/${encodeURIComponent(selectedId)}`);
        const body = (await resp.json()) as DetailResponse;
        if (cancelled) return;
        if (!resp.ok || body.error || !body.item) {
          setDetailError(body.error ?? 'שגיאה בטעינת השאלה');
          setDetail(null);
        } else {
          setDetail(body.item);
        }
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>בנק שאלות</h1>
      <p style={{ color: '#475569', marginBottom: '1rem' }}>
        שאלות מבחן ומשימות לפי כיתה, נושא ומקור. כל פריט נושא ייחוס מקור (קרדיט, עמוד, מספר תרגיל) לצורך מעקב זכויות.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
        <FilterSelect label="כיתה" value={grade} onChange={v => setGrade(v as GradeLevel | '')} options={GRADES.map(g => ({ value: g, label: GRADE_LABEL[g] }))} />
        <FilterSelect label="מקור" value={license} onChange={v => setLicense(v as QuestionLicense | '')} options={LICENSES.map(l => ({ value: l, label: LICENSE_LABEL[l] }))} />
        <FilterSelect label="סוג" value={questionType} onChange={v => setQuestionType(v as QuestionType | '')} options={QTYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))} />
        <FilterSelect label="קושי" value={difficulty} onChange={v => setDifficulty(v as QuestionBankDifficulty | '')} options={DIFFS.map(d => ({ value: d, label: d }))} />
      </div>

      {listError && <div style={errorBox}>{listError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '70vh', overflow: 'auto' }}>
          {listLoading ? (
            <li>טוען…</li>
          ) : items.length === 0 ? (
            <li style={{ color: '#64748b' }}>אין שאלות בסינון הנוכחי.</li>
          ) : (
            items.map(it => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(it.id)}
                  style={{
                    ...cardButton,
                    borderColor: it.id === selectedId ? '#1769aa' : '#cbd5e1',
                    background: it.id === selectedId ? '#eef6ff' : '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{it.sourceTitle}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    כיתה {GRADE_LABEL[it.grade]} · {it.questionType.replace(/_/g, ' ')}
                    {it.difficulty ? ` · ${it.difficulty}` : ''}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {LICENSE_LABEL[it.license]}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', background: '#fff', minHeight: 200 }}>
          {detailLoading ? (
            <div>טוען שאלה…</div>
          ) : detailError ? (
            <div style={errorBox}>{detailError}</div>
          ) : !detail ? (
            <div style={{ color: '#64748b' }}>בחר שאלה מהרשימה.</div>
          ) : (
            <ItemDetail item={detail} />
          )}
        </div>
      </div>
    </div>
  );
}

function ItemDetail({ item }: { item: QuestionBankItemFull }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Chip>כיתה {GRADE_LABEL[item.grade]}</Chip>
        <Chip>{item.questionType.replace(/_/g, ' ')}</Chip>
        {item.difficulty && <Chip>{item.difficulty}</Chip>}
        <Chip color="#0b6e4f">{LICENSE_LABEL[item.license]}</Chip>
      </div>

      <section style={{ marginBottom: '1rem' }}>
        <h3 style={sectionTitle}>שאלה</h3>
        <pre style={previewStyle}>{item.promptMarkdown}</pre>
      </section>

      {item.answerMarkdown && (
        <section style={{ marginBottom: '1rem' }}>
          <h3 style={sectionTitle}>פתרון מוצע</h3>
          <pre style={previewStyle}>{item.answerMarkdown}</pre>
        </section>
      )}

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {item.tags.map(t => <Chip key={t} color="#475569">{t}</Chip>)}
        </div>
      )}

      <section style={provenanceBox}>
        <h3 style={{ ...sectionTitle, marginTop: 0 }}>ייחוס מקור</h3>
        <Field label="כותר">{item.provenance.sourceTitle}</Field>
        {item.provenance.author && <Field label="מחבר">{item.provenance.author}</Field>}
        {item.provenance.publisher && <Field label="הוצאה">{item.provenance.publisher}</Field>}
        {item.provenance.year && <Field label="שנה">{String(item.provenance.year)}</Field>}
        {item.provenance.edition && <Field label="מהדורה">{item.provenance.edition}</Field>}
        {item.provenance.isbn && <Field label="ISBN/סמל">{item.provenance.isbn}</Field>}
        {item.provenance.pageNumber !== undefined && <Field label="עמוד">{String(item.provenance.pageNumber)}</Field>}
        {item.provenance.exerciseNumber && <Field label="מספר תרגיל">{item.provenance.exerciseNumber}</Field>}
        {item.provenance.sourceUrl && (
          <Field label="קישור">
            <a href={item.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">
              {item.provenance.sourceUrl}
            </a>
          </Field>
        )}
        <Field label="רישיון">{LICENSE_LABEL[item.provenance.license]}</Field>
        <Field label="נוסף בתאריך">{new Date(item.provenance.ingestedAt).toLocaleString('he-IL')}</Field>
        {item.provenance.notes && <Field label="הערות">{item.provenance.notes}</Field>}
      </section>
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
      <span style={{ color: '#475569' }}>{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: '0.3rem 0.5rem', borderRadius: 4, border: '1px solid #cbd5e1' }}>
        <option value="">הכל</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Chip({ children, color = '#1769aa' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: `${color}22`, color, padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 500 }}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', padding: '0.15rem 0' }}>
      <span style={{ color: '#64748b', minWidth: 100 }}>{label}:</span>
      <span style={{ color: '#0f172a' }}>{children}</span>
    </div>
  );
}

const cardButton: React.CSSProperties = {
  width: '100%', textAlign: 'right', padding: '0.7rem 0.85rem',
  border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff',
  cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
};
const errorBox: React.CSSProperties = {
  border: '1px solid #f5c2c7', background: '#fff3f4', color: '#9c1c1c',
  padding: '0.75rem', borderRadius: 6, marginBottom: '1rem',
};
const sectionTitle: React.CSSProperties = {
  fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.4rem 0', color: '#0f172a',
};
const previewStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '0.85rem', fontSize: '0.95rem', fontFamily: 'inherit', lineHeight: 1.6,
};
const provenanceBox: React.CSSProperties = {
  marginTop: '1rem', padding: '0.85rem 1rem', background: '#f1f5f9',
  border: '1px solid #cbd5e1', borderRadius: 6,
};
