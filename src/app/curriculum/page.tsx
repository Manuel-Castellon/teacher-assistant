'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildClassActivityTimeline,
  buildClassProgressSummary,
  buildExamFromTaughtMaterial,
  buildLessonSuggestion,
  CLASS_PROGRESS_STORAGE_KEY,
  createClassProgressProfile,
  getCurriculumUnitForGrade,
  STATUS_LABELS,
  updateTopicProgress,
  type ClassActivityEntry,
  type ClassProgressProfile,
  type TopicProgressStatus,
} from '@/curriculumProgress/progress';
import { gradeLabel, type GradeLevel } from '@/types/shared';

const GRADE_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: 'זי', label: "ז'" },
  { value: 'חי', label: "ח'" },
  { value: 'טי', label: "ט'" },
  { value: 'יי', label: "י'" },
  { value: 'יאי', label: "יא'" },
  { value: 'יבי', label: "יב'" },
];

const STATUS_OPTIONS: { value: TopicProgressStatus; label: string }[] = [
  { value: 'not_started', label: STATUS_LABELS.not_started },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'needs_review', label: STATUS_LABELS.needs_review },
];

export default function CurriculumPage() {
  const [classes, setClasses] = useState<ClassProgressProfile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newClassName, setNewClassName] = useState("ז' 1");
  const [newClassGrade, setNewClassGrade] = useState<GradeLevel>('זי');
  const [syncStatus, setSyncStatus] = useState<'local' | 'server' | 'saving' | 'error'>('local');
  const [syncMessage, setSyncMessage] = useState('נשמר מקומית בדפדפן');

  useEffect(() => {
    let cancelled = false;
    let localProfiles: ClassProgressProfile[] = [];
    try {
      const raw = window.localStorage.getItem(CLASS_PROGRESS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as ClassProgressProfile[] : [];
      localProfiles = parsed;
      setClasses(parsed);
      setSelectedClassId(parsed[0]?.id ?? '');
    } catch {
      setClasses([]);
      setSelectedClassId('');
    }

    void loadServerProfiles();

    async function loadServerProfiles() {
      try {
        const resp = await fetch('/api/curriculum/classes', { method: 'GET' });
        if (cancelled) return;
        if (!resp.ok) throw new Error(`שגיאה ${resp.status}`);
        const data = await resp.json() as { authenticated?: boolean; profiles?: ClassProgressProfile[] };
        if (!data.authenticated) {
          setSyncStatus('local');
          setSyncMessage('לא מחובר/ת: נשמר מקומית בדפדפן');
          return;
        }
        const profiles = data.profiles ?? [];
        if (profiles.length === 0 && localProfiles.length > 0) {
          await saveServerProfiles(localProfiles, localProfiles[0]?.id ?? '');
          return;
        }
        setClasses(profiles);
        setSelectedClassId(profiles[0]?.id ?? '');
        window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(profiles));
        setSyncStatus('server');
        setSyncMessage('מסונכרן לחשבון');
      } catch {
        if (!cancelled) {
          setSyncStatus('error');
          setSyncMessage('סנכרון לחשבון נכשל; ממשיך לשמור מקומית');
        }
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  function persist(next: ClassProgressProfile[], nextSelectedId = selectedClassId) {
    setClasses(next);
    setSelectedClassId(nextSelectedId);
    window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(next));
    setSyncStatus('saving');
    setSyncMessage('שומר...');
    void saveServerProfiles(next, nextSelectedId);
  }

  async function saveServerProfiles(next: ClassProgressProfile[], nextSelectedId: string) {
    try {
      const resp = await fetch('/api/curriculum/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: next }),
      });
      if (!resp.ok) throw new Error(`שגיאה ${resp.status}`);
      const data = await resp.json() as { authenticated?: boolean; profiles?: ClassProgressProfile[] };
      if (!data.authenticated) {
        setSyncStatus('local');
        setSyncMessage('לא מחובר/ת: נשמר מקומית בדפדפן');
        return;
      }
      const profiles = data.profiles ?? next;
      setClasses(profiles);
      setSelectedClassId(profiles.some(profile => profile.id === nextSelectedId) ? nextSelectedId : profiles[0]?.id ?? '');
      window.localStorage.setItem(CLASS_PROGRESS_STORAGE_KEY, JSON.stringify(profiles));
      setSyncStatus('server');
      setSyncMessage('מסונכרן לחשבון');
    } catch {
      setSyncStatus('error');
      setSyncMessage('סנכרון לחשבון נכשל; נשמר מקומית בדפדפן');
    }
  }

  const selectedClass = classes.find(item => item.id === selectedClassId);
  const summary = useMemo(
    () => selectedClass ? buildClassProgressSummary(selectedClass) : undefined,
    [selectedClass],
  );
  const lessonSuggestion = selectedClass ? buildLessonSuggestion(selectedClass) : undefined;
  const examTopics = selectedClass ? buildExamFromTaughtMaterial(selectedClass) : [];
  const activityTimeline = useMemo(
    () => selectedClass ? buildClassActivityTimeline(selectedClass, 8) : [],
    [selectedClass],
  );

  function addClass() {
    const now = new Date().toISOString();
    const profile = createClassProgressProfile({
      id: crypto.randomUUID(),
      name: newClassName.trim() || `כיתה ${gradeLabel(newClassGrade)}`,
      grade: newClassGrade,
      now,
    });
    persist([profile, ...classes], profile.id);
  }

  function patchSelectedClass(patch: Partial<Pick<ClassProgressProfile, 'name' | 'grade'>>) {
    if (!selectedClass) return;
    const now = new Date().toISOString();
    const nextProfile: ClassProgressProfile = {
      ...selectedClass,
      ...patch,
      updatedAt: now,
      topics: patch.grade && patch.grade !== selectedClass.grade ? {} : selectedClass.topics,
    };
    persist(classes.map(item => item.id === selectedClass.id ? nextProfile : item));
  }

  function patchTopic(topicId: string, patch: Parameters<typeof updateTopicProgress>[2]) {
    if (!selectedClass) return;
    const nextProfile = updateTopicProgress(selectedClass, topicId, patch, new Date().toISOString());
    persist(classes.map(item => item.id === selectedClass.id ? nextProfile : item));
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>מעקב תכנית לימודים</h1>
          <p style={subtitleStyle}>סמנו מה הכיתה באמת למדה, ואז השתמשו בזה כהצעה למערך הבא או למבחן מחומר שנלמד.</p>
        </div>
        <div style={headerActionsStyle}>
          <span style={syncBadgeStyle(syncStatus)}>{syncMessage}</span>
          <a href="/lesson-plan" style={linkButtonStyle}>מערך שיעור</a>
          <a href="/exam" style={linkButtonStyle}>מבחן</a>
        </div>
      </header>

      <section style={panelStyle}>
        <div style={classFormStyle}>
          <Field label="כיתה חדשה" value={newClassName} onChange={setNewClassName} />
          <SelectField label="שכבה" value={newClassGrade} options={GRADE_OPTIONS} onChange={v => setNewClassGrade(v as GradeLevel)} />
          <button type="button" onClick={addClass} style={btnPrimary}>הוסף כיתה</button>
        </div>

        {classes.length > 0 && (
          <div style={classPickerStyle}>
            <SelectField
              label="כיתה פעילה"
              value={selectedClassId}
              options={classes.map(item => ({ value: item.id, label: `${item.name} · ${gradeLabel(item.grade)}` }))}
              onChange={setSelectedClassId}
            />
          </div>
        )}
      </section>

      {!selectedClass || !summary ? (
        <section style={emptyStateStyle}>הוסיפו כיתה כדי להתחיל לעקוב אחרי התקדמות בפועל.</section>
      ) : (
        <>
          <section style={panelStyle}>
            <div style={editClassGridStyle}>
              <Field label="שם הכיתה" value={selectedClass.name} onChange={name => patchSelectedClass({ name })} />
              <SelectField label="שכבת גיל" value={selectedClass.grade} options={GRADE_OPTIONS} onChange={v => patchSelectedClass({ grade: v as GradeLevel })} />
            </div>

            <div style={statsGridStyle}>
              <Stat label="הושלמו" value={summary.completedCount} />
              <Stat label="בתהליך" value={summary.inProgressCount} />
              <Stat label="דורשים חזרה" value={summary.needsReviewCount} />
              <Stat label="לא הותחלו" value={summary.notStartedCount} />
              <Stat label="שעות בפועל" value={summary.totalHoursSpent} />
            </div>

            <div style={suggestionsStyle}>
              <div>
                <strong>הצעה לשיעור הבא</strong>
                <p style={hintTextStyle}>{lessonSuggestion ? lessonSuggestion.topic : 'אין נושא הבא זמין.'}</p>
              </div>
              <div style={actionsStyle}>
                {lessonSuggestion && (
                  <a
                    href={`/lesson-plan?classId=${encodeURIComponent(selectedClass.id)}&topicId=${encodeURIComponent(lessonSuggestion.topicId)}`}
                    style={btnSecondaryLink}
                  >
                    פתח כהצעה למערך
                  </a>
                )}
                {examTopics.length > 0 && (
                  <a
                    href={`/exam?classId=${encodeURIComponent(selectedClass.id)}&mode=taught`}
                    style={btnSecondaryLink}
                  >
                    מבחן מחומר שנלמד
                  </a>
                )}
              </div>
            </div>
          </section>

          {activityTimeline.length > 0 && (
            <section style={panelStyle}>
              <div style={timelineHeaderStyle}>
                <strong>פעילות אחרונה בכיתה</strong>
                <span style={hintTextStyle}>{activityTimeline.length} רישומים אחרונים</span>
              </div>
              <ActivityTimeline entries={activityTimeline} />
            </section>
          )}

          <section style={topicListStyle}>
            {summary.topics.map(({ topic, progress }) => (
              <article key={topic.id} style={topicCardStyle}>
                <div style={topicHeaderStyle}>
                  <div>
                    <h2 style={topicTitleStyle}>{topic.name}</h2>
                    <p style={topicMetaStyle}>{topic.recommendedHours} שעות בתכנית · {topic.subTopics.length} תתי-נושאים</p>
                  </div>
                  <SelectField
                    label="סטטוס"
                    value={progress.status}
                    options={STATUS_OPTIONS}
                    onChange={v => patchTopic(topic.id, { status: v as TopicProgressStatus })}
                  />
                </div>

                <div style={topicFieldsStyle}>
                  <Field
                    label="שעות בפועל"
                    type="number"
                    value={String(progress.hoursSpent)}
                    onChange={v => patchTopic(topic.id, { hoursSpent: Number(v) })}
                  />
                  <Field
                    label="נלמד לאחרונה"
                    type="date"
                    value={progress.lastTaughtDate ?? ''}
                    onChange={v => patchTopic(topic.id, v ? { lastTaughtDate: v } : { lastTaughtDate: '' })}
                  />
                  <Field
                    label="הערות"
                    value={progress.notes ?? ''}
                    onChange={v => patchTopic(topic.id, { notes: v })}
                    placeholder="למשל: צריך עוד בעיות מילוליות"
                  />
                </div>
              </article>
            ))}
          </section>
        </>
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

function ActivityTimeline({ entries }: { entries: ClassActivityEntry[] }) {
  return (
    <ol style={timelineListStyle}>
      {entries.map((entry, idx) => (
        <li key={`${entry.date}-${entry.topicId}-${idx}`} style={timelineItemStyle}>
          <div style={timelineDateStyle}>
            {formatTimelineDate(entry.date)}
            <span style={timelineStatusStyle}>{STATUS_LABELS[entry.status]}</span>
          </div>
          <div style={timelineBodyStyle}>
            <span style={timelineTopicStyle}>{entry.topicName}</span>
            {entry.note && <span style={timelineNoteStyle}>{entry.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatTimelineDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  return `${day}.${month}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <span style={statValueStyle}>{value}</span>
      <span style={statLabelStyle}>{label}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1080,
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

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

function syncBadgeStyle(status: 'local' | 'server' | 'saving' | 'error'): React.CSSProperties {
  const colors = {
    local: { background: '#f8fafc', border: '#cbd5e1', color: '#475569' },
    server: { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
    saving: { background: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    error: { background: '#fffbeb', border: '#fde68a', color: '#92400e' },
  }[status];
  return {
    padding: '0.42rem 0.7rem',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    background: colors.background,
    color: colors.color,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  };
}

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
  padding: '1rem',
  marginBottom: '1rem',
  background: '#fff',
};

const classFormStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) minmax(160px, 220px) auto',
  gap: '0.8rem',
  alignItems: 'end',
};

const classPickerStyle: React.CSSProperties = {
  marginTop: '1rem',
  maxWidth: 420,
};

const editClassGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.8rem',
  marginBottom: '1rem',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '0.75rem',
  marginBottom: '1rem',
};

const statStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '0.75rem',
  background: '#f8fafc',
};

const statValueStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '1.35rem',
  fontWeight: 700,
};

const statLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#64748b',
  fontSize: '0.85rem',
  marginTop: '0.15rem',
};

const suggestionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'center',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '0.9rem',
};

const hintTextStyle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  color: '#4b5563',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const timelineHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: '0.6rem',
  gap: '0.6rem',
};

const timelineListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.5rem',
};

const timelineItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(78px, auto) 1fr',
  gap: '0.75rem',
  padding: '0.55rem 0.7rem',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
};

const timelineDateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.2rem',
  fontVariantNumeric: 'tabular-nums',
  color: '#374151',
};

const timelineStatusStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#6b7280',
};

const timelineBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const timelineTopicStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#111827',
};

const timelineNoteStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '0.9rem',
  lineHeight: 1.45,
};

const topicListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
};

const topicCardStyle: React.CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 8,
  padding: '1rem',
  background: '#fff',
};

const topicHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 240px)',
  gap: '1rem',
  alignItems: 'start',
  marginBottom: '0.75rem',
};

const topicTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.05rem',
};

const topicMetaStyle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  color: '#64748b',
  fontSize: '0.85rem',
};

const topicFieldsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '140px 170px minmax(220px, 1fr)',
  gap: '0.75rem',
};

const emptyStateStyle: React.CSSProperties = {
  border: '1px dashed #cbd5e1',
  borderRadius: 8,
  padding: '1.25rem',
  color: '#64748b',
  background: '#f8fafc',
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
  padding: '0.65rem 1.2rem',
  background: '#1769aa',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: '0.95rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  padding: '0.45rem 0.85rem',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
  color: '#111827',
  whiteSpace: 'nowrap',
};

const btnSecondaryLink: React.CSSProperties = {
  ...linkButtonStyle,
  background: '#eef6ff',
  borderColor: '#b6d4f0',
};
