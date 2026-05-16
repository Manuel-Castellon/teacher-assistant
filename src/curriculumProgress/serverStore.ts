import type { PoolClient } from 'pg';
import {
  buildClassProgressSummary,
  createClassProgressProfile,
  getCurriculumUnitForGrade,
  type ClassProgressProfile,
  type TopicProgress,
  type TopicProgressStatus,
} from './progress';
import type { GradeLevel } from '../types/shared';

export interface Queryable {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

interface ClassRow extends Record<string, unknown> {
  id: string;
  name: string;
  grade_level: GradeLevel;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProgressRow extends Record<string, unknown> {
  class_id: string;
  topic_id: string;
  status: TopicProgressStatus;
  hours_spent: string | number;
  last_taught_date: Date | string | null;
  notes: string | null;
}

export async function loadClassProgressProfile(
  db: Queryable,
  teacherId: string,
  classId: string,
): Promise<ClassProgressProfile | undefined> {
  const profiles = await listClassProgressProfiles(db, teacherId);
  return profiles.find(profile => profile.id === classId);
}

export async function listClassProgressProfiles(
  db: Queryable,
  teacherId: string,
): Promise<ClassProgressProfile[]> {
  const classes = await db.query<ClassRow>(
    `SELECT id, name, grade_level, created_at, updated_at
       FROM classes
      WHERE teacher_id = $1
      ORDER BY updated_at DESC, created_at DESC`,
    [teacherId],
  );

  if (classes.rows.length === 0) return [];

  const classIds = classes.rows.map(row => row.id);
  const progress = await db.query<ProgressRow>(
    `SELECT class_id, topic_id, status, hours_spent, last_taught_date, notes
       FROM teacher_progress
      WHERE class_id = ANY($1::uuid[])`,
    [classIds],
  );

  const progressByClass = new Map<string, Record<string, TopicProgress>>();
  for (const row of progress.rows) {
    const topics = progressByClass.get(row.class_id) ?? {};
    topics[row.topic_id] = {
      topicId: row.topic_id,
      status: row.status,
      hoursSpent: Number(row.hours_spent),
      ...(row.last_taught_date ? { lastTaughtDate: toDateOnly(row.last_taught_date) } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    };
    progressByClass.set(row.class_id, topics);
  }

  return classes.rows.map(row => ({
    id: row.id,
    name: row.name,
    grade: row.grade_level,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    topics: progressByClass.get(row.id) ?? {},
  }));
}

export async function replaceClassProgressProfiles(
  client: PoolClient,
  teacherId: string,
  profiles: ClassProgressProfile[],
): Promise<ClassProgressProfile[]> {
  await client.query('BEGIN');
  try {
    const savedIds: string[] = [];
    for (const profile of profiles) {
      const saved = await upsertClassProfile(client, teacherId, profile);
      savedIds.push(saved.id);
      await replaceTopicProgress(client, saved);
    }

    if (savedIds.length > 0) {
      await client.query(
        `DELETE FROM classes
          WHERE teacher_id = $1
            AND NOT (id = ANY($2::uuid[]))`,
        [teacherId, savedIds],
      );
    } else {
      await client.query('DELETE FROM classes WHERE teacher_id = $1', [teacherId]);
    }

    await client.query('COMMIT');
    return await listClassProgressProfiles(client, teacherId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function upsertClassProfile(
  db: Queryable,
  teacherId: string,
  profile: ClassProgressProfile,
): Promise<ClassProgressProfile> {
  const now = new Date().toISOString();
  const profileWithUuid = isUuid(profile.id)
    ? profile
    : createClassProgressProfile({
        id: crypto.randomUUID(),
        name: profile.name,
        grade: profile.grade,
        now,
      });

  const existing = await db.query<{ id: string }>(
    'SELECT id FROM classes WHERE id = $1::uuid AND teacher_id = $2',
    [profileWithUuid.id, teacherId],
  );

  if (existing.rows.length > 0) {
    const updated = await db.query<ClassRow>(
      `UPDATE classes
          SET name = $3,
              grade_level = $4,
              academic_year = $5
        WHERE id = $1::uuid
          AND teacher_id = $2
        RETURNING id, name, grade_level, created_at, updated_at`,
      [
        profileWithUuid.id,
        teacherId,
        profile.name,
        profile.grade,
        getCurriculumUnitForGrade(profile.grade).academicYear,
      ],
    );
    return rowToProfile(updated.rows[0]!, profile.topics);
  }

  const inserted = await db.query<ClassRow>(
    `INSERT INTO classes (id, teacher_id, name, grade_level, academic_year)
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING id, name, grade_level, created_at, updated_at`,
    [
      profileWithUuid.id,
      teacherId,
      profile.name,
      profile.grade,
      getCurriculumUnitForGrade(profile.grade).academicYear,
    ],
  );
  return rowToProfile(inserted.rows[0]!, profile.topics);
}

async function replaceTopicProgress(db: Queryable, profile: ClassProgressProfile): Promise<void> {
  await db.query('DELETE FROM teacher_progress WHERE class_id = $1::uuid', [profile.id]);

  const summary = buildClassProgressSummary(profile);
  for (const { topic, progress } of summary.topics) {
    if (isDefaultProgress(progress)) continue;
    await db.query(
      `INSERT INTO teacher_progress
        (curriculum_unit_id, topic_id, class_id, status, hours_spent, last_taught_date, notes)
       VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)`,
      [
        summary.unit.id,
        topic.id,
        profile.id,
        progress.status,
        progress.hoursSpent,
        progress.lastTaughtDate ?? null,
        progress.notes ?? null,
      ],
    );
  }
}

function rowToProfile(row: ClassRow, topics: Record<string, TopicProgress>): ClassProgressProfile {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade_level,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    topics,
  };
}

function isDefaultProgress(progress: TopicProgress): boolean {
  return progress.status === 'not_started'
    && progress.hoursSpent === 0
    && !progress.lastTaughtDate
    && !progress.notes;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}
