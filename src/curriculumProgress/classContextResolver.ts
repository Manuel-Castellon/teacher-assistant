import { renderClassContext, type ClassProgressProfile } from './progress';
import { loadClassProgressProfile, type Queryable } from './serverStore';

export type ClassContextSource = 'manual' | 'auto' | 'none';

export interface ResolveClassContextParams {
  source?: ClassContextSource;
  classId?: string;
  previousLessonContext?: string;
  userId?: string;
  db?: Queryable;
  loader?: (classId: string, userId: string) => Promise<ClassProgressProfile | undefined>;
}

export interface ResolvedClassContext {
  context: string;
  classId?: string;
  origin: 'manual' | 'auto' | 'none';
}

/**
 * Resolves the class context that goes into the generator prompt.
 *
 * Behavior by source:
 *   none     → empty.
 *   manual   → caller-supplied previousLessonContext, as-is.
 *   auto     → server-load by classId when authenticated. Fall back to caller-supplied
 *              previousLessonContext when there is no auth/DB profile (so signed-out
 *              clients can still pass a locally-rendered snapshot).
 *   (unset)  → if previousLessonContext is supplied, treat as manual (back-compat).
 *              Otherwise behave as auto.
 */
export async function resolveClassContext(
  params: ResolveClassContextParams,
): Promise<ResolvedClassContext> {
  const source = params.source ?? (params.previousLessonContext?.trim() ? 'manual' : 'auto');

  if (source === 'none') {
    return { context: '', origin: 'none' };
  }

  if (source === 'manual') {
    const manual = params.previousLessonContext?.trim();
    if (!manual) return { context: '', origin: 'none' };
    return {
      context: manual,
      origin: 'manual',
      ...(params.classId ? { classId: params.classId } : {}),
    };
  }

  const profile = params.classId && params.userId ? await loadProfile(params) : undefined;
  if (profile && params.classId) {
    return {
      context: renderClassContext(profile),
      classId: params.classId,
      origin: 'auto',
    };
  }

  const fallback = params.previousLessonContext?.trim();
  if (fallback) {
    return {
      context: fallback,
      origin: 'manual',
      ...(params.classId ? { classId: params.classId } : {}),
    };
  }

  return { context: '', ...(params.classId ? { classId: params.classId } : {}), origin: 'none' };
}

async function loadProfile(
  params: ResolveClassContextParams,
): Promise<ClassProgressProfile | undefined> {
  if (!params.classId || !params.userId) return undefined;
  if (params.loader) return params.loader(params.classId, params.userId);
  if (params.db) return loadClassProgressProfile(params.db, params.userId, params.classId);
  return undefined;
}
