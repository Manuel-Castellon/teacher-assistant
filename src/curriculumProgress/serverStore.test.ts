import type { PoolClient } from 'pg';
import {
  listClassProgressProfiles,
  replaceClassProgressProfiles,
  type Queryable,
} from './serverStore';
import type { ClassProgressProfile, TopicProgressStatus } from './progress';
import type { GradeLevel } from '../types/shared';

interface MemoryClass {
  id: string;
  teacher_id: string;
  name: string;
  grade_level: GradeLevel;
  academic_year: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface MemoryProgress {
  class_id: string;
  curriculum_unit_id: string;
  topic_id: string;
  status: TopicProgressStatus;
  hours_spent: number;
  last_taught_date: Date | string | null;
  notes: string | null;
}

class MemoryClient implements Queryable {
  classes = new Map<string, MemoryClass>();
  progress: MemoryProgress[] = [];
  queries: string[] = [];
  failOnProgressInsert = false;

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push(text);
    const compact = text.replace(/\s+/g, ' ').trim();

    if (compact === 'BEGIN' || compact === 'COMMIT' || compact === 'ROLLBACK') return rows([]);

    if (compact.startsWith('SELECT id, name, grade_level, created_at, updated_at FROM classes')) {
      const teacherId = params[0] as string;
      return rows<T>(
        [...this.classes.values()]
          .filter(item => item.teacher_id === teacherId)
          .map(({ id, name, grade_level, created_at, updated_at }) => ({ id, name, grade_level, created_at, updated_at })),
      );
    }

    if (compact.startsWith('SELECT class_id, topic_id, status, hours_spent, last_taught_date, notes FROM teacher_progress')) {
      const classIds = params[0] as string[];
      return rows<T>(this.progress.filter(item => classIds.includes(item.class_id)));
    }

    if (compact.startsWith('SELECT id FROM classes WHERE id')) {
      const id = params[0] as string;
      const teacherId = params[1] as string;
      const match = this.classes.get(id);
      return rows<T>(match && match.teacher_id === teacherId ? [{ id }] : []);
    }

    if (compact.startsWith('UPDATE classes')) {
      const id = params[0] as string;
      const existing = this.classes.get(id)!;
      const next = {
        ...existing,
        name: params[2] as string,
        grade_level: params[3] as GradeLevel,
        academic_year: params[4] as string,
        updated_at: '2026-05-15T09:00:00.000Z',
      };
      this.classes.set(id, next);
      return rows<T>([classRow(next)]);
    }

    if (compact.startsWith('INSERT INTO classes')) {
      const item: MemoryClass = {
        id: params[0] as string,
        teacher_id: params[1] as string,
        name: params[2] as string,
        grade_level: params[3] as GradeLevel,
        academic_year: params[4] as string,
        created_at: new Date('2026-05-15T08:00:00.000Z'),
        updated_at: new Date('2026-05-15T08:00:00.000Z'),
      };
      this.classes.set(item.id, item);
      return rows<T>([classRow(item)]);
    }

    if (compact.startsWith('DELETE FROM teacher_progress')) {
      const classId = params[0] as string;
      this.progress = this.progress.filter(item => item.class_id !== classId);
      return rows([]);
    }

    if (compact.startsWith('INSERT INTO teacher_progress')) {
      if (this.failOnProgressInsert) throw new Error('insert failed');
      this.progress.push({
        curriculum_unit_id: params[0] as string,
        topic_id: params[1] as string,
        class_id: params[2] as string,
        status: params[3] as TopicProgressStatus,
        hours_spent: params[4] as number,
        last_taught_date: params[5] as string | null,
        notes: params[6] as string | null,
      });
      return rows([]);
    }

    if (compact.startsWith('DELETE FROM classes WHERE teacher_id = $1 AND NOT')) {
      const teacherId = params[0] as string;
      const keep = new Set(params[1] as string[]);
      for (const [id, item] of this.classes.entries()) {
        if (item.teacher_id === teacherId && !keep.has(id)) this.classes.delete(id);
      }
      this.progress = this.progress.filter(item => this.classes.has(item.class_id));
      return rows([]);
    }

    if (compact.startsWith('DELETE FROM classes WHERE teacher_id')) {
      const teacherId = params[0] as string;
      for (const [id, item] of this.classes.entries()) {
        if (item.teacher_id === teacherId) this.classes.delete(id);
      }
      this.progress = this.progress.filter(item => this.classes.has(item.class_id));
      return rows([]);
    }

    throw new Error(`Unhandled SQL: ${compact}`);
  }
}

function rows<T extends Record<string, unknown>>(rowsValue: object[]): { rows: T[] } {
  return { rows: rowsValue as T[] };
}

function classRow(item: MemoryClass) {
  return {
    id: item.id,
    name: item.name,
    grade_level: item.grade_level,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

const uuidA = '11111111-1111-4111-8111-111111111111';
const uuidB = '22222222-2222-4222-8222-222222222222';

describe('server class progress store', () => {
  it('lists teacher-owned classes with topic progress', async () => {
    const db = new MemoryClient();
    db.classes.set(uuidA, {
      id: uuidA,
      teacher_id: 'teacher-1',
      name: "ז' 1",
      grade_level: 'זי',
      academic_year: 'תשפ"ו',
      created_at: '2026-05-15T08:00:00.000Z',
      updated_at: new Date('2026-05-15T08:30:00.000Z'),
    });
    db.classes.set(uuidB, {
      id: uuidB,
      teacher_id: 'teacher-2',
      name: "ח' 1",
      grade_level: 'חי',
      academic_year: 'תשפ"ו',
      created_at: new Date('2026-05-15T08:00:00.000Z'),
      updated_at: new Date('2026-05-15T08:00:00.000Z'),
    });
    db.progress.push({
      class_id: uuidA,
      curriculum_unit_id: 'middle-school-grade7-tashpav',
      topic_id: 'ms-grade7-t01',
      status: 'needs_review',
      hours_spent: 2.5,
      last_taught_date: new Date('2026-05-14T00:00:00.000Z'),
      notes: 'לחזור על סימון זוויות',
    });
    db.progress.push({
      class_id: uuidA,
      curriculum_unit_id: 'middle-school-grade7-tashpav',
      topic_id: 'ms-grade7-t02',
      status: 'completed',
      hours_spent: 3,
      last_taught_date: '2026-05-13',
      notes: null,
    });

    await expect(listClassProgressProfiles(db, 'missing')).resolves.toEqual([]);
    await expect(listClassProgressProfiles(db, 'teacher-1')).resolves.toEqual([
      {
        id: uuidA,
        name: "ז' 1",
        grade: 'זי',
        createdAt: '2026-05-15T08:00:00.000Z',
        updatedAt: '2026-05-15T08:30:00.000Z',
        topics: {
          'ms-grade7-t01': {
            topicId: 'ms-grade7-t01',
            status: 'needs_review',
            hoursSpent: 2.5,
            lastTaughtDate: '2026-05-14',
            notes: 'לחזור על סימון זוויות',
          },
          'ms-grade7-t02': {
            topicId: 'ms-grade7-t02',
            status: 'completed',
            hoursSpent: 3,
            lastTaughtDate: '2026-05-13',
          },
        },
      },
    ]);
  });

  it('replaces teacher profiles transactionally and skips untouched topic defaults', async () => {
    const db = new MemoryClient();
    db.classes.set(uuidA, {
      id: uuidA,
      teacher_id: 'teacher-1',
      name: 'old',
      grade_level: 'זי',
      academic_year: 'תשפ"ו',
      created_at: new Date('2026-05-15T07:00:00.000Z'),
      updated_at: new Date('2026-05-15T07:00:00.000Z'),
    });
    db.classes.set(uuidB, {
      id: uuidB,
      teacher_id: 'teacher-1',
      name: 'delete me',
      grade_level: 'חי',
      academic_year: 'תשפ"ו',
      created_at: new Date('2026-05-15T07:00:00.000Z'),
      updated_at: new Date('2026-05-15T07:00:00.000Z'),
    });

    const profiles: ClassProgressProfile[] = [
      {
        id: uuidA,
        name: "ז' מעודכן",
        grade: 'זי',
        createdAt: '2026-05-15T07:00:00.000Z',
        updatedAt: '2026-05-15T08:00:00.000Z',
        topics: {
          'ms-grade7-t01': { topicId: 'ms-grade7-t01', status: 'completed', hoursSpent: 2 },
          'ms-grade7-t02': { topicId: 'ms-grade7-t02', status: 'not_started', hoursSpent: 0 },
        },
      },
      {
        id: 'local-id',
        name: "ח' חדשה",
        grade: 'חי',
        createdAt: '2026-05-15T08:00:00.000Z',
        updatedAt: '2026-05-15T08:00:00.000Z',
        topics: {
          'ms-grade8-t01': {
            topicId: 'ms-grade8-t01',
            status: 'in_progress',
            hoursSpent: 1,
            lastTaughtDate: '2026-05-15',
            notes: 'נפתח',
          },
        },
      },
    ];

    const saved = await replaceClassProgressProfiles(db as unknown as PoolClient, 'teacher-1', profiles);

    expect(db.queries).toContain('BEGIN');
    expect(db.queries).toContain('COMMIT');
    expect(db.classes.has(uuidB)).toBe(false);
    expect(saved).toHaveLength(2);
    expect(saved[0]?.name).toBe("ז' מעודכן");
    expect(saved[1]?.id).not.toBe('local-id');
    expect(db.progress.map(item => item.topic_id).sort()).toEqual(['ms-grade7-t01', 'ms-grade8-t01']);
  });

  it('can replace with an empty profile list', async () => {
    const db = new MemoryClient();
    db.classes.set(uuidA, {
      id: uuidA,
      teacher_id: 'teacher-1',
      name: "ז' 1",
      grade_level: 'זי',
      academic_year: 'תשפ"ו',
      created_at: new Date('2026-05-15T08:00:00.000Z'),
      updated_at: new Date('2026-05-15T08:00:00.000Z'),
    });

    await expect(replaceClassProgressProfiles(db as unknown as PoolClient, 'teacher-1', [])).resolves.toEqual([]);
    expect(db.classes.size).toBe(0);
  });

  it('rolls back when a write fails', async () => {
    const db = new MemoryClient();
    db.failOnProgressInsert = true;
    const profiles: ClassProgressProfile[] = [{
      id: uuidA,
      name: "ז' 1",
      grade: 'זי',
      createdAt: '2026-05-15T08:00:00.000Z',
      updatedAt: '2026-05-15T08:00:00.000Z',
      topics: {
        'ms-grade7-t01': { topicId: 'ms-grade7-t01', status: 'completed', hoursSpent: 1 },
      },
    }];

    await expect(replaceClassProgressProfiles(db as unknown as PoolClient, 'teacher-1', profiles)).rejects.toThrow('insert failed');
    expect(db.queries).toContain('ROLLBACK');
  });
});
