import { jest } from '@jest/globals';
import { resolveClassContext } from './classContextResolver';
import { renderClassContext, type ClassProgressProfile } from './progress';

const profile: ClassProgressProfile = {
  id: 'class-1',
  name: 'שכבה ב',
  grade: 'חי',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  topics: {
    'ms-grade8-t01': {
      topicId: 'ms-grade8-t01',
      status: 'completed',
      hoursSpent: 4,
      lastTaughtDate: '2026-05-10',
    },
  },
};

const renderedProfile = renderClassContext(profile);

describe('resolveClassContext', () => {
  test('source none returns empty regardless of inputs', async () => {
    const result = await resolveClassContext({
      source: 'none',
      classId: 'class-1',
      previousLessonContext: 'should be ignored',
      userId: 'teacher-1',
      loader: async () => profile,
    });
    expect(result).toEqual({ context: '', origin: 'none' });
  });

  test('source manual returns supplied text and ignores server load', async () => {
    const result = await resolveClassContext({
      source: 'manual',
      classId: 'class-1',
      previousLessonContext: 'my hand-typed context',
      userId: 'teacher-1',
      loader: async () => profile,
    });
    expect(result).toEqual({
      context: 'my hand-typed context',
      origin: 'manual',
      classId: 'class-1',
    });
  });

  test('source auto with authenticated user returns server-rendered context', async () => {
    const loader = jest.fn(async () => profile);
    const result = await resolveClassContext({
      source: 'auto',
      classId: 'class-1',
      userId: 'teacher-1',
      loader,
      previousLessonContext: 'stale-local-snapshot',
    });
    expect(loader).toHaveBeenCalledWith('class-1', 'teacher-1');
    expect(result).toEqual({
      context: renderedProfile,
      origin: 'auto',
      classId: 'class-1',
    });
  });

  test('source auto falls back to client text when no auth/profile', async () => {
    const result = await resolveClassContext({
      source: 'auto',
      classId: 'class-1',
      previousLessonContext: 'client-rendered fallback',
    });
    expect(result).toEqual({
      context: 'client-rendered fallback',
      origin: 'manual',
      classId: 'class-1',
    });
  });

  test('source auto returns empty when no profile and no fallback', async () => {
    const result = await resolveClassContext({
      source: 'auto',
      classId: 'class-1',
      userId: 'teacher-1',
      loader: async () => undefined,
    });
    expect(result).toEqual({ context: '', classId: 'class-1', origin: 'none' });
  });

  test('back-compat: no source + previousLessonContext is treated as manual', async () => {
    const loader = jest.fn(async () => profile);
    const result = await resolveClassContext({
      previousLessonContext: 'legacy text',
      classId: 'class-1',
      userId: 'teacher-1',
      loader,
    });
    expect(loader).not.toHaveBeenCalled();
    expect(result).toEqual({
      context: 'legacy text',
      origin: 'manual',
      classId: 'class-1',
    });
  });

  test('back-compat: no source + no text behaves like auto', async () => {
    const loader = jest.fn(async () => profile);
    const result = await resolveClassContext({
      classId: 'class-1',
      userId: 'teacher-1',
      loader,
    });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.origin).toBe('auto');
    expect(result.context).toBe(renderedProfile);
  });

  test('manual with empty text returns empty', async () => {
    const result = await resolveClassContext({
      source: 'manual',
      classId: 'class-1',
      previousLessonContext: '   ',
    });
    expect(result).toEqual({ context: '', origin: 'none' });
  });
});
