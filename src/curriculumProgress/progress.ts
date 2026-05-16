import grade7 from '../../data/curriculum/middle-school-grade7.json';
import grade8 from '../../data/curriculum/middle-school-grade8.json';
import grade9 from '../../data/curriculum/middle-school-grade9.json';
import year10 from '../../data/curriculum/high-school-5units-year10.json';
import year11 from '../../data/curriculum/high-school-5units-year11.json';
import year12 from '../../data/curriculum/high-school-5units-year12.json';
import type { CurriculumTopic, CurriculumUnit } from '../types/curriculum';
import type { LessonType } from '../types/lessonPlan';
import type { GradeLevel } from '../types/shared';

export const CLASS_PROGRESS_STORAGE_KEY = 'teacher-assistant.class-progress.v1';

export type TopicProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_review' | 'skipped';

export interface TopicProgress {
  topicId: string;
  status: TopicProgressStatus;
  hoursSpent: number;
  lastTaughtDate?: string;
  notes?: string;
}

export interface ClassProgressProfile {
  id: string;
  name: string;
  grade: GradeLevel;
  createdAt: string;
  updatedAt: string;
  topics: Record<string, TopicProgress>;
}

export interface TopicProgressView {
  topic: CurriculumTopic;
  progress: TopicProgress;
}

export interface ClassProgressSummary {
  unit: CurriculumUnit;
  topics: TopicProgressView[];
  completedCount: number;
  inProgressCount: number;
  needsReviewCount: number;
  skippedCount: number;
  notStartedCount: number;
  totalHoursSpent: number;
  nextLessonTopic?: TopicProgressView;
  reviewTopics: TopicProgressView[];
  examReadyTopics: TopicProgressView[];
}

export interface PostLessonProgressUpdate {
  topicId: string;
  status: TopicProgressStatus;
  hoursTaught: number;
  taughtDate: string;
  notes?: string;
}

export const STATUS_LABELS: Record<TopicProgressStatus, string> = {
  not_started: 'לא הותחל',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  needs_review: 'דורש חזרה',
  skipped: 'מדולג כרגע',
};

const CURRICULUM_BY_GRADE: Record<GradeLevel, CurriculumUnit> = {
  זי: grade7 as CurriculumUnit,
  חי: grade8 as CurriculumUnit,
  טי: grade9 as CurriculumUnit,
  יי: year10 as CurriculumUnit,
  יאי: year11 as CurriculumUnit,
  יבי: year12 as CurriculumUnit,
};

export function getCurriculumUnitForGrade(grade: GradeLevel): CurriculumUnit {
  return CURRICULUM_BY_GRADE[grade];
}

export function emptyTopicProgress(topicId: string): TopicProgress {
  return {
    topicId,
    status: 'not_started',
    hoursSpent: 0,
  };
}

export function createClassProgressProfile(params: {
  id: string;
  name: string;
  grade: GradeLevel;
  now: string;
}): ClassProgressProfile {
  return {
    id: params.id,
    name: params.name,
    grade: params.grade,
    createdAt: params.now,
    updatedAt: params.now,
    topics: {},
  };
}

export function buildClassProgressSummary(profile: ClassProgressProfile): ClassProgressSummary {
  const unit = getCurriculumUnitForGrade(profile.grade);
  const topics = unit.topics.map(topic => ({
    topic,
    progress: normalizeTopicProgress(topic.id, profile.topics[topic.id]),
  }));

  const completedCount = topics.filter(item => item.progress.status === 'completed').length;
  const inProgressCount = topics.filter(item => item.progress.status === 'in_progress').length;
  const needsReviewCount = topics.filter(item => item.progress.status === 'needs_review').length;
  const skippedCount = topics.filter(item => item.progress.status === 'skipped').length;
  const notStartedCount = topics.filter(item => item.progress.status === 'not_started').length;
  const totalHoursSpent = topics.reduce((sum, item) => sum + item.progress.hoursSpent, 0);
  const nextLessonTopic =
    topics.find(item => item.progress.status === 'in_progress')
    ?? topics.find(item => item.progress.status === 'needs_review')
    ?? topics.find(item => item.progress.status === 'not_started');

  return {
    unit,
    topics,
    completedCount,
    inProgressCount,
    needsReviewCount,
    skippedCount,
    notStartedCount,
    totalHoursSpent,
    ...(nextLessonTopic ? { nextLessonTopic } : {}),
    reviewTopics: topics.filter(item => item.progress.status === 'needs_review'),
    examReadyTopics: topics.filter(item => ['completed', 'needs_review'].includes(item.progress.status)),
  };
}

export function updateTopicProgress(
  profile: ClassProgressProfile,
  topicId: string,
  patch: Partial<Omit<TopicProgress, 'topicId'>>,
  now: string,
): ClassProgressProfile {
  const current = normalizeTopicProgress(topicId, profile.topics[topicId]);
  const next: TopicProgress = {
    ...current,
    ...patch,
    topicId,
    hoursSpent: Math.max(0, patch.hoursSpent ?? current.hoursSpent),
  };

  return {
    ...profile,
    updatedAt: now,
    topics: {
      ...profile.topics,
      [topicId]: stripEmptyTopicProgress(next),
    },
  };
}

export function recordPostLessonProgress(
  profile: ClassProgressProfile,
  update: PostLessonProgressUpdate,
  now: string,
): ClassProgressProfile {
  const current = normalizeTopicProgress(update.topicId, profile.topics[update.topicId]);
  const hoursTaught = Number.isFinite(update.hoursTaught) ? Math.max(0, update.hoursTaught) : 0;
  const notes = appendProgressNote(current.notes, update.taughtDate, update.notes);

  return updateTopicProgress(
    profile,
    update.topicId,
    {
      status: update.status,
      hoursSpent: current.hoursSpent + hoursTaught,
      lastTaughtDate: update.taughtDate,
      ...(notes ? { notes } : { notes: '' }),
    },
    now,
  );
}

export function getExamTopicWarning(profile: ClassProgressProfile, topicId?: string): string | undefined {
  if (!topicId) return undefined;
  const topic = getCurriculumUnitForGrade(profile.grade).topics.find(item => item.id === topicId);
  if (!topic) return 'הנושא לא נמצא בתכנית של הכיתה שנבחרה.';
  const progress = normalizeTopicProgress(topicId, profile.topics[topicId]);
  if (progress.status === 'not_started') return 'הנושא עדיין לא סומן כנלמד בכיתה הזו.';
  if (progress.status === 'in_progress') return 'הנושא עדיין בתהליך, כדאי לוודא שהמבחן לא מתקדם מדי.';
  if (progress.status === 'skipped') return 'הנושא סומן כמדולג כרגע בכיתה הזו.';
  return undefined;
}

export function buildLessonSuggestion(profile: ClassProgressProfile, preferredTopicId?: string): {
  topicId: string;
  topic: string;
  subTopic: string;
  lessonType: LessonType;
  teacherRequest: string;
  previousLessonContext: string;
} | undefined {
  const summary = buildClassProgressSummary(profile);
  const next = preferredTopicId
    ? summary.topics.find(item => item.topic.id === preferredTopicId)
    : summary.nextLessonTopic;
  if (!next) return undefined;

  return {
    topicId: next.topic.id,
    topic: next.topic.name,
    subTopic: firstSubTopicName(next.topic),
    lessonType: lessonTypeForStatus(next.progress.status),
    teacherRequest: renderLessonTeacherRequest(profile, next),
    previousLessonContext: renderClassContext(profile, summary),
  };
}

export function buildExamFromTaughtMaterial(profile: ClassProgressProfile, maxTopics = 3): {
  topicId: string;
  topic: string;
}[] {
  return buildClassProgressSummary(profile)
    .examReadyTopics
    .slice(0, maxTopics)
    .map(item => ({
      topicId: item.topic.id,
      topic: item.topic.name,
    }));
}

export function renderClassContext(
  profile: ClassProgressProfile,
  summary = buildClassProgressSummary(profile),
): string {
  const lines = [
    `כיתה: ${profile.name}`,
    `נושאים שהושלמו: ${summary.completedCount}`,
    `נושאים בתהליך: ${summary.inProgressCount}`,
    `נושאים שדורשים חזרה: ${summary.needsReviewCount}`,
    `נושאים שדולגו כרגע: ${summary.skippedCount}`,
  ];

  const recent = summary.topics
    .filter(item => item.progress.status !== 'not_started')
    .slice(-5);
  if (recent.length > 0) {
    lines.push(
      '',
      'מצב נושאים רלוונטיים:',
      ...recent.map(item => {
        const notes = item.progress.notes ? `; הערה: ${item.progress.notes}` : '';
        return `- ${item.topic.name}: ${STATUS_LABELS[item.progress.status]}, ${item.progress.hoursSpent} שעות${notes}`;
      }),
    );
  }

  return lines.join('\n');
}

function firstSubTopicName(topic: CurriculumTopic): string {
  return topic.subTopics[0]?.name ?? topic.name;
}

function lessonTypeForStatus(status: TopicProgressStatus): LessonType {
  if (status === 'not_started') return 'הקנייה';
  return 'תרגול';
}

function renderLessonTeacherRequest(
  profile: ClassProgressProfile,
  item: TopicProgressView,
): string {
  const objective = item.topic.subTopics
    .flatMap(subTopic => subTopic.learningObjectives)
    .find(Boolean);
  const statusLead: Record<TopicProgressStatus, string> = {
    not_started: 'שיעור פתיחה והקנייה',
    in_progress: 'שיעור המשך ותרגול',
    completed: 'שיעור תרגול והעמקה',
    needs_review: 'שיעור חזרה ממוקד',
    skipped: 'שיעור פתיחה והקנייה',
  };
  const notes = item.progress.notes ? ` ${sentenceWithPeriod(`להתייחס להערת המעקב: ${item.progress.notes}`)}` : '';
  const objectiveLine = objective ? ` ${sentenceWithPeriod(`מטרה מרכזית: ${objective}`)}` : '';

  return [
    `${statusLead[item.progress.status]} לכיתה ${profile.name} בנושא ${item.topic.name}.`,
    `לבנות מערך שמתחיל במשימת פתיחה עצמאית, כולל תרגול מדורג, ומסתיים בעבודה עצמאית.`,
    `להתאים לרמת הכיתה לפי מעקב ההתקדמות בפועל.${objectiveLine}${notes}`,
  ].join('\n');
}

export interface ClassActivityEntry {
  date: string;
  topicId: string;
  topicName: string;
  status: TopicProgressStatus;
  note: string;
}

const DATED_NOTE_PATTERN = /^(\d{4}-\d{2}-\d{2}):\s*(.*)$/;

export function buildClassActivityTimeline(profile: ClassProgressProfile, limit = 12): ClassActivityEntry[] {
  const unit = getCurriculumUnitForGrade(profile.grade);
  const topicOrder = new Map<string, number>(unit.topics.map((topic, index) => [topic.id, index]));
  const topicNames = new Map<string, string>(unit.topics.map(topic => [topic.id, topic.name]));

  const entries: ClassActivityEntry[] = [];
  for (const topic of Object.values(profile.topics)) {
    if (!topicNames.has(topic.topicId)) continue;
    const seenDates = new Set<string>();
    const lines = topic.notes ? topic.notes.split('\n') : [];

    for (const line of lines) {
      const match = DATED_NOTE_PATTERN.exec(line.trim());
      if (!match) continue;
      const [, date, note] = match;
      if (!date) continue;
      seenDates.add(date);
      entries.push({
        date,
        topicId: topic.topicId,
        topicName: topicNames.get(topic.topicId)!,
        status: topic.status,
        note: note?.trim() ?? '',
      });
    }

    if (topic.lastTaughtDate && !seenDates.has(topic.lastTaughtDate)) {
      entries.push({
        date: topic.lastTaughtDate,
        topicId: topic.topicId,
        topicName: topicNames.get(topic.topicId)!,
        status: topic.status,
        note: '',
      });
    }
  }

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (topicOrder.get(a.topicId) ?? 0) - (topicOrder.get(b.topicId) ?? 0);
  });

  return entries.slice(0, Math.max(0, limit));
}

function sentenceWithPeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?؟。:;״"]$/.test(trimmed) || /[.!?]$/.test(trimmed)
    ? trimmed
    : `${trimmed}.`;
}

function appendProgressNote(existing: string | undefined, taughtDate: string, note: string | undefined): string {
  const trimmed = note?.trim();
  if (!trimmed) return existing?.trim() ?? '';
  const datedNote = taughtDate ? `${taughtDate}: ${trimmed}` : trimmed;
  return [existing?.trim(), datedNote].filter(Boolean).join('\n');
}

function normalizeTopicProgress(topicId: string, progress?: TopicProgress): TopicProgress {
  if (!progress) return emptyTopicProgress(topicId);
  return {
    topicId,
    status: progress.status,
    hoursSpent: Math.max(0, Number.isFinite(progress.hoursSpent) ? progress.hoursSpent : 0),
    ...(progress.lastTaughtDate ? { lastTaughtDate: progress.lastTaughtDate } : {}),
    ...(progress.notes?.trim() ? { notes: progress.notes } : {}),
  };
}

function stripEmptyTopicProgress(progress: TopicProgress): TopicProgress {
  return {
    topicId: progress.topicId,
    status: progress.status,
    hoursSpent: progress.hoursSpent,
    ...(progress.lastTaughtDate ? { lastTaughtDate: progress.lastTaughtDate } : {}),
    ...(progress.notes?.trim() ? { notes: progress.notes } : {}),
  };
}
