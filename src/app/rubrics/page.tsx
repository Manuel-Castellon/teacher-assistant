'use client';

import { useEffect, useState } from 'react';
import type { ExamRubric } from '@/examRubric/types';
import type { ExamRubricSummary } from '@/examRubric/loadRubrics';

interface ListResponse {
  rubrics?: ExamRubricSummary[];
  error?: string;
}

interface DetailResponse {
  rubric?: ExamRubric;
  markdown?: string;
  error?: string;
}

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<ExamRubricSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ rubric: ExamRubric; markdown: string } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const requestedId = new URLSearchParams(window.location.search).get('rubric');
    (async () => {
      try {
        const resp = await fetch('/api/rubrics');
        const body = (await resp.json()) as ListResponse;
        if (cancelled) return;
        if (!resp.ok || body.error || !body.rubrics) {
          setListError(body.error ?? 'שגיאה בטעינת רשימת המחוונים');
        } else {
          setRubrics(body.rubrics);
          const requested = requestedId && body.rubrics.find(r => r.id === requestedId);
          if (requested) {
            setSelectedId(requested.id);
          } else if (body.rubrics.length > 0 && body.rubrics[0]) {
            setSelectedId(body.rubrics[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    (async () => {
      try {
        const resp = await fetch(`/api/rubrics/${encodeURIComponent(selectedId)}`);
        const body = (await resp.json()) as DetailResponse;
        if (cancelled) return;
        if (!resp.ok || body.error || !body.rubric || !body.markdown) {
          setDetailError(body.error ?? 'שגיאה בטעינת המחוון');
          setDetail(null);
        } else {
          setDetail({ rubric: body.rubric, markdown: body.markdown });
        }
      } catch (err) {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  async function handleDownload(format: 'docx' | 'pdf') {
    if (!detail) return;
    const key = `${detail.rubric.id}:${format}`;
    setExporting(key);
    setDetailError(null);
    try {
      const resp = await fetch('/api/exam/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: detail.markdown,
          filename: `מחוון-${detail.rubric.id}`,
          format,
        }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        setDetailError(err.error ?? 'שגיאה ביצוא');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `מחוון-${detail.rubric.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'שגיאה ביצוא');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>מחוונים</h1>
      <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
        מחוונים מבוססי-קריטריון למבחנים אמיתיים או מיוצרים. ניתן לצפות בתצוגה מקדימה ולהוריד כ-DOCX או PDF.
      </p>

      {listError && (
        <div style={errorBox}>{listError}</div>
      )}

      {listLoading ? (
        <div>טוען מחוונים…</div>
      ) : rubrics.length === 0 ? (
        <div style={{ color: '#64748b' }}>אין מחוונים זמינים.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rubrics.map(summary => {
              const isSelected = summary.id === selectedId;
              return (
                <li key={summary.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(summary.id)}
                    style={{
                      ...cardButton,
                      borderColor: isSelected ? '#1769aa' : '#cbd5e1',
                      background: isSelected ? '#eef6ff' : '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{summary.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {summary.className} · {summary.date}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.15rem' }}>
                      {summary.questionCount} שאלות · {summary.totalPoints} נק'
                      {summary.hasBonus ? ' · בונוס' : ''}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', background: '#fff', minHeight: 200 }}>
            {detailLoading ? (
              <div>טוען מחוון…</div>
            ) : detailError ? (
              <div style={errorBox}>{detailError}</div>
            ) : !detail ? (
              <div style={{ color: '#64748b' }}>בחר מחוון מהרשימה כדי לצפות בתצוגה מקדימה.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDownload('docx')}
                    disabled={exporting !== null}
                    style={{ ...btnDownload, opacity: exporting ? 0.6 : 1 }}
                  >
                    {exporting === `${detail.rubric.id}:docx` ? 'מייצא…' : 'הורד מחוון (docx)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('pdf')}
                    disabled={exporting !== null}
                    style={{ ...btnDownload, background: '#b71c1c', opacity: exporting ? 0.6 : 1 }}
                  >
                    {exporting === `${detail.rubric.id}:pdf` ? 'מייצא…' : 'הורד מחוון (pdf)'}
                  </button>
                </div>

                {detail.rubric.projectLearnings.length > 0 && (
                  <details style={{ marginBottom: '1rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                      לקחים לפרויקט ({detail.rubric.projectLearnings.length})
                    </summary>
                    <ul style={{ marginTop: '0.5rem' }}>
                      {detail.rubric.projectLearnings.map((learning, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{learning}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <pre style={previewStyle}>{detail.markdown}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const cardButton: React.CSSProperties = {
  width: '100%',
  textAlign: 'right',
  padding: '0.75rem 0.9rem',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
};

const errorBox: React.CSSProperties = {
  border: '1px solid #f5c2c7',
  background: '#fff3f4',
  color: '#9c1c1c',
  padding: '0.75rem',
  borderRadius: 6,
  marginBottom: '1rem',
};

const btnDownload: React.CSSProperties = {
  padding: '0.55rem 1rem',
  background: '#1769aa',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: '0.95rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const previewStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '0.9rem',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  lineHeight: 1.55,
  maxHeight: '60vh',
  overflow: 'auto',
};
