import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { saveGeneratedArtifact } from '@/artifacts/serverStore';
import { ExamGenerator } from '@/exam/ExamGenerator';
import { renderExamMarkdown, renderAnswerKeyMarkdown } from '@/exam/renderExam';
import { SympyMathVerifier } from '@/providers/impl/SympyMathVerifier';
import { validateExamRequestCurriculumTopics } from '@/exam/curriculumContext';
import {
  resolveClassContext,
  type ClassContextSource,
} from '@/curriculumProgress/classContextResolver';
import type { ExamRequest, GeneratedExam } from '@/exam/types';
import { buildRubricFromExam } from '@/examRubric/buildRubricFromExam';
import { generateAiRubric } from '@/examRubric/aiRubricGenerator';
import { generateRubricId, saveExamRubric } from '@/examRubric/saveRubric';
import { createBackendByName, createDefaultBackend, type BackendName } from '@/exam/backends';
import { resolveExamQuestionBankSeed } from '@/exam/questionBankSeed';

export type RubricMode = 'deterministic' | 'ai' | 'none';

interface GenerateExamBody extends ExamRequest {
  classId?: string;
  classContextSource?: ClassContextSource;
  rubricMode?: RubricMode;
  backend?: BackendName | 'auto';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateExamBody;
    const curriculumErrors = validateExamRequestCurriculumTopics(body);
    if (curriculumErrors.length > 0) {
      return NextResponse.json({ error: curriculumErrors.join('\n') }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const classId = body.classId?.trim() || undefined;
    const resolved = await resolveClassContext({
      ...(body.classContextSource ? { source: body.classContextSource } : {}),
      ...(classId ? { classId } : {}),
      ...(userId ? { userId } : {}),
      db: pool,
    });

    const mergedTeacherNotes = mergeClassContextIntoNotes(body.teacherNotes, resolved.context);
    const resolvedBankSeed = await resolveExamQuestionBankSeed({
      db: pool,
      grade: body.grade,
      ...(body.bankSeed ? { seed: body.bankSeed } : {}),
      ...(userId ? { userId } : {}),
    });
    const examRequest: ExamRequest = {
      ...stripWrapperFields(body),
      ...(mergedTeacherNotes ? { teacherNotes: mergedTeacherNotes } : {}),
      ...(resolvedBankSeed.seed ? { bankSeed: resolvedBankSeed.seed } : {}),
    };

    const backend = body.backend && body.backend !== 'auto'
      ? createBackendByName(body.backend)
      : undefined;
    const generator = new ExamGenerator(backend);
    const exam = await generator.generate(examRequest);
    if (resolvedBankSeed.verbatimAttributions.length > 0) {
      exam.questionBankAttributions = resolvedBankSeed.verbatimAttributions;
    }
    const persistedExamRequest = stripResolvedBankExamples(examRequest);

    const verifier = new SympyMathVerifier();
    const verification = await verifier.verifyExamItems(exam.verificationItems);

    const examMarkdown = renderExamMarkdown(exam);
    const answerKeyMarkdown = renderAnswerKeyMarkdown(exam);
    const examArtifact = await persistExamArtifact({
      ...(userId ? { userId } : {}),
      ...(resolved.classId ? { classId: resolved.classId } : {}),
      exam,
      examRequest: persistedExamRequest,
      examMarkdown,
      answerKeyMarkdown,
      verification,
    });

    const rubricMode: RubricMode = body.rubricMode ?? 'deterministic';
    const rubricResult = await persistRubric({
      mode: rubricMode,
      ...(userId ? { userId } : {}),
      ...(resolved.classId ? { classId: resolved.classId } : {}),
      ...(examArtifact.artifactId ? { sourceArtifactId: examArtifact.artifactId } : {}),
      exam,
      examRequest: persistedExamRequest,
      examMarkdown,
      answerKeyMarkdown,
    });

    return NextResponse.json({
      exam,
      examMarkdown,
      answerKeyMarkdown,
      verification,
      artifactId: examArtifact.artifactId,
      artifactWarning: examArtifact.warning,
      bankSeedWarning: resolvedBankSeed.warning,
      rubricId: rubricResult.rubricId,
      rubricArtifactId: rubricResult.artifactId,
      rubricMode: rubricResult.appliedMode,
      rubricWarning: [rubricResult.warning, rubricResult.artifactWarning].filter(Boolean).join('\n') || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getAuthenticatedUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id ?? session?.user?.email ?? undefined;
}

function stripWrapperFields(body: GenerateExamBody): ExamRequest {
  const {
    classId: _classId,
    classContextSource: _src,
    rubricMode: _rm,
    backend: _b,
    bankSeed: _seed,
    ...rest
  } = body;
  return rest;
}

function stripResolvedBankExamples(request: ExamRequest): ExamRequest {
  if (!request.bankSeed) return request;
  const { examples: _examples, ...bankSeed } = request.bankSeed;
  return {
    ...request,
    bankSeed,
  };
}

interface PersistRubricInput {
  mode: RubricMode;
  userId?: string;
  classId?: string;
  sourceArtifactId?: string;
  exam: GeneratedExam;
  examRequest: ExamRequest;
  examMarkdown: string;
  answerKeyMarkdown: string;
}

interface PersistRubricResult {
  rubricId?: string;
  artifactId?: string;
  appliedMode: RubricMode;
  warning?: string;
  artifactWarning?: string;
}

interface PersistExamArtifactInput {
  userId?: string;
  classId?: string;
  exam: GeneratedExam;
  examRequest: ExamRequest;
  examMarkdown: string;
  answerKeyMarkdown: string;
  verification: Awaited<ReturnType<SympyMathVerifier['verifyExamItems']>>;
}

async function persistExamArtifact(input: PersistExamArtifactInput): Promise<{ artifactId?: string; warning?: string }> {
  if (!input.userId) return {};

  try {
    const saved = await saveGeneratedArtifact(pool, {
      teacherId: input.userId,
      kind: 'exam',
      title: `${input.exam.header.subject} - ${input.exam.header.className}`,
      grade: input.examRequest.grade,
      ...(input.classId ? { classId: input.classId } : {}),
      payload: input.exam,
      markdown: input.examMarkdown,
      metadata: {
        request: input.examRequest,
        answerKeyMarkdown: input.answerKeyMarkdown,
        verification: input.verification,
      },
    });
    return { artifactId: saved.id };
  } catch (err) {
    return {
      warning: `שמירת המבחן למסד הנתונים נכשלה: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

async function persistRubric(input: PersistRubricInput): Promise<PersistRubricResult> {
  if (input.mode === 'none') return { appliedMode: 'none' };

  const id = generateRubricId();
  const base = buildRubricFromExam(input.exam, input.examRequest, { id });

  let rubric = base;
  let appliedMode: RubricMode = 'deterministic';
  let warning: string | undefined;

  if (input.mode === 'ai') {
    try {
      const complete = createDefaultBackend();
      rubric = await generateAiRubric({
        baseRubric: base,
        examMarkdown: input.examMarkdown,
        answerKeyMarkdown: input.answerKeyMarkdown,
        complete,
      });
      appliedMode = 'ai';
    } catch (err) {
      warning = `מחוון AI נכשל ונשמרה גרסה דטרמיניסטית: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  saveExamRubric(rubric);
  let artifactId: string | undefined;
  let artifactWarning: string | undefined;
  if (input.userId) {
    try {
      const saved = await saveGeneratedArtifact(pool, {
        teacherId: input.userId,
        kind: 'rubric',
        title: rubric.title,
        grade: input.examRequest.grade,
        ...(input.classId ? { classId: input.classId } : {}),
        ...(input.sourceArtifactId ? { sourceArtifactId: input.sourceArtifactId } : {}),
        payload: rubric,
        metadata: {
          rubricId: id,
          mode: appliedMode,
          filesystemPath: `data/exam-rubrics/${id}.json`,
        },
      });
      artifactId = saved.id;
    } catch (err) {
      artifactWarning = `שמירת המחוון למסד הנתונים נכשלה: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  return {
    rubricId: id,
    ...(artifactId ? { artifactId } : {}),
    appliedMode,
    ...(warning ? { warning } : {}),
    ...(artifactWarning ? { artifactWarning } : {}),
  };
}

export function mergeClassContextIntoNotes(
  teacherNotes: string | undefined,
  classContext: string,
): string | undefined {
  const notes = teacherNotes?.trim();
  const context = classContext.trim();
  if (!context) return notes || undefined;

  const block = `הקשר כיתה (מעקב התקדמות):\n${context}`;
  if (!notes) return block;
  if (notes.includes(context)) return notes;
  return `${notes}\n\n${block}`;
}
