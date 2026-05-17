import type { Queryable } from '../curriculumProgress/serverStore';
import type {
  ExamQuestionBankAttribution,
  ExamQuestionBankSeed,
  ExamQuestionBankSeedExample,
} from './types';
import type { GradeLevel } from '../types/shared';
import { loadQuestionBankItem } from '../questionBank/serverStore';
import type { QuestionBankItemFull, QuestionProvenance } from '../questionBank/types';

export interface ResolveExamQuestionBankSeedInput {
  db: Queryable;
  seed?: ExamQuestionBankSeed;
  grade: GradeLevel;
  userId?: string;
}

export interface ResolvedExamQuestionBankSeed {
  seed?: ExamQuestionBankSeed;
  warning?: string;
  verbatimAttributions: ExamQuestionBankAttribution[];
}

const MAX_BANK_SEED_ITEMS = 12;

export async function resolveExamQuestionBankSeed(
  input: ResolveExamQuestionBankSeedInput,
): Promise<ResolvedExamQuestionBankSeed> {
  const rawIds = input.seed?.itemIds ?? [];
  const itemIds = Array.from(new Set(rawIds.map(id => id.trim()).filter(Boolean)))
    .slice(0, MAX_BANK_SEED_ITEMS);

  if (!input.seed || itemIds.length === 0) {
    return { verbatimAttributions: [] };
  }

  const items: QuestionBankItemFull[] = [];
  for (const id of itemIds) {
    const item = await loadQuestionBankItem(input.db, id);
    if (!item) throw new Error(`Question bank item not found: ${id}`);
    if (item.license === 'unknown') {
      throw new Error(`Question bank item has unknown license and cannot seed an exam: ${id}`);
    }
    if (item.grade !== input.grade) {
      throw new Error(`Question bank item ${id} is grade ${item.grade}, not ${input.grade}`);
    }
    items.push(item);
  }

  const acknowledgedAt = input.seed.copyrightAcknowledged
    && items.some(item => item.license === 'copyrighted-personal-use')
    && input.seed.mode === 'verbatim'
    ? new Date().toISOString()
    : undefined;
  const examples = items.map(item => toPromptExample(item, input.seed!, input.userId));
  const verbatimAttributions = items
    .filter(item => examples.find(ex => ex.id === item.id)?.useMode === 'verbatim')
    .map(item => ({
      itemId: item.id,
      sourceTitle: item.provenance.sourceTitle,
      license: item.license,
      provenance: item.provenance,
    }));

  return {
    seed: {
      mode: input.seed.mode,
      itemIds,
      ...(input.seed.copyrightAcknowledged ? { copyrightAcknowledged: true } : {}),
      ...(acknowledgedAt ? { copyrightAcknowledgedAt: acknowledgedAt } : {}),
      examples,
    },
    ...(acknowledgedAt
      ? { warning: 'שאלות מוגנות שולבו כלשונן לפי אישור המורה לשימוש לימודי סגור, עם שמירת ייחוס המקור.' }
      : {}),
    verbatimAttributions,
  };
}

function toPromptExample(
  item: QuestionBankItemFull,
  seed: ExamQuestionBankSeed,
  userId: string | undefined,
): ExamQuestionBankSeedExample {
  const useMode = seed.mode === 'verbatim' && canUseVerbatim(item, seed, userId)
    ? 'verbatim'
    : 'style-reference';

  return {
    id: item.id,
    requestedMode: seed.mode,
    useMode,
    license: item.license,
    sourceTitle: item.provenance.sourceTitle,
    provenanceLabel: renderProvenanceLabel(item.provenance),
    promptMarkdown: item.promptMarkdown,
    ...(item.answerMarkdown ? { answerMarkdown: item.answerMarkdown } : {}),
  };
}

function canUseVerbatim(
  item: QuestionBankItemFull,
  seed: ExamQuestionBankSeed,
  userId: string | undefined,
): boolean {
  if (item.license === 'copyrighted-personal-use') {
    if (seed.copyrightAcknowledged) return true;
    throw new Error(
      'Copyrighted textbook items require teacher acknowledgement before verbatim classroom use',
    );
  }
  if (item.license === 'student-submitted') {
    if (userId && item.teacherId === userId) return true;
    throw new Error('Student-submitted items require teacher ownership before verbatim use');
  }
  return true;
}

export function renderProvenanceLabel(provenance: QuestionProvenance): string {
  const details = [
    provenance.author,
    provenance.publisher,
    provenance.year ? String(provenance.year) : undefined,
    provenance.edition,
    provenance.pageNumber !== undefined ? `עמ' ${provenance.pageNumber}` : undefined,
    provenance.exerciseNumber ? `תרגיל ${provenance.exerciseNumber}` : undefined,
    provenance.isbn ? `ISBN/סמל ${provenance.isbn}` : undefined,
  ].filter(Boolean);
  return [provenance.sourceTitle, ...details].join(' · ');
}
