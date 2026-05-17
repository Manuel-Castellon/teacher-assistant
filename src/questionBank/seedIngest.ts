import type {
  QuestionBankDifficulty,
  QuestionBankItemInput,
  QuestionBankSourceKind,
  QuestionLicense,
  QuestionProvenance,
  QuestionType,
  RepresentationType,
} from './types';
import { ProvenanceValidationError, validateProvenance } from './types';
import type { GradeLevel } from '../types/shared';

// A seed file groups items by source. File-level provenance fields apply to
// every item; items can add per-exercise overrides (pageNumber, exerciseNumber,
// notes). The CLI deep-merges file → item and then revalidates each item.
export interface SeedFile {
  source: {
    sourceKind: QuestionBankSourceKind;
    license: QuestionLicense;
    sourceTitle: string;
    author?: string;
    publisher?: string;
    year?: number;
    edition?: string;
    isbn?: string;
    sourceUrl?: string;
    licenseUrl?: string;
    notes?: string;
  };
  defaultTags?: string[];
  items: SeedItem[];
}

export interface SeedItem {
  grade: GradeLevel;
  curriculumTopicId?: string;
  questionType: QuestionType;
  difficulty?: QuestionBankDifficulty;
  representationType?: RepresentationType;
  promptMarkdown: string;
  answerMarkdown?: string;
  tags?: string[];
  // Per-item overrides for the provenance object.
  pageNumber?: number;
  exerciseNumber?: string;
  notes?: string;
  // Optional verification block if the question is SymPy-checkable.
  verification?: QuestionBankItemInput['verificationItem'];
}

export interface ResolvedSeedItem {
  input: QuestionBankItemInput;
  naturalKey: string;
}

export class SeedValidationError extends Error {
  constructor(message: string, public readonly itemIndex?: number) {
    super(itemIndex === undefined ? message : `item[${itemIndex}]: ${message}`);
    this.name = 'SeedValidationError';
  }
}

const VALID_QUESTION_TYPES: readonly QuestionType[] = [
  'חישובי', 'בעיה_מילולית', 'הוכחה', 'קריאה_וניתוח', 'מעורב',
];
const VALID_DIFFICULTY: readonly QuestionBankDifficulty[] = [
  'בסיסי', 'בינוני', 'מתקדם', 'אתגר',
];
const VALID_REP: readonly RepresentationType[] = [
  'טקסט', 'גרף', 'טבלה', 'שרטוט', 'ציר_מספרים', 'מעורב',
];
const VALID_GRADES: readonly GradeLevel[] = ['זי','חי','טי','יי','יאי','יבי'];

export function resolveSeedFile(file: SeedFile, ingestedAt: string, ingestedBy?: string): ResolvedSeedItem[] {
  if (!file.source || typeof file.source !== 'object') {
    throw new SeedValidationError('source block is required');
  }
  if (!file.source.sourceTitle?.trim()) {
    throw new SeedValidationError('source.sourceTitle is required');
  }
  if (!Array.isArray(file.items) || file.items.length === 0) {
    throw new SeedValidationError('items must be a non-empty array');
  }

  return file.items.map((item, idx) => resolveOne(file, item, idx, ingestedAt, ingestedBy));
}

function resolveOne(
  file: SeedFile,
  item: SeedItem,
  idx: number,
  ingestedAt: string,
  ingestedBy?: string,
): ResolvedSeedItem {
  if (!VALID_GRADES.includes(item.grade)) {
    throw new SeedValidationError(`grade=${String(item.grade)} is invalid`, idx);
  }
  if (!VALID_QUESTION_TYPES.includes(item.questionType)) {
    throw new SeedValidationError(`questionType=${String(item.questionType)} is invalid`, idx);
  }
  if (item.difficulty && !VALID_DIFFICULTY.includes(item.difficulty)) {
    throw new SeedValidationError(`difficulty=${String(item.difficulty)} is invalid`, idx);
  }
  if (item.representationType && !VALID_REP.includes(item.representationType)) {
    throw new SeedValidationError(`representationType=${String(item.representationType)} is invalid`, idx);
  }
  if (!item.promptMarkdown?.trim()) {
    throw new SeedValidationError('promptMarkdown is required', idx);
  }

  const provenance: QuestionProvenance = {
    license: file.source.license,
    sourceTitle: file.source.sourceTitle,
    ...(file.source.author ? { author: file.source.author } : {}),
    ...(file.source.publisher ? { publisher: file.source.publisher } : {}),
    ...(file.source.year ? { year: file.source.year } : {}),
    ...(file.source.edition ? { edition: file.source.edition } : {}),
    ...(file.source.isbn ? { isbn: file.source.isbn } : {}),
    ...(file.source.sourceUrl ? { sourceUrl: file.source.sourceUrl } : {}),
    ...(file.source.licenseUrl ? { licenseUrl: file.source.licenseUrl } : {}),
    ...(item.pageNumber !== undefined ? { pageNumber: item.pageNumber } : {}),
    ...(item.exerciseNumber ? { exerciseNumber: item.exerciseNumber } : {}),
    ingestedAt,
    ...(ingestedBy ? { ingestedBy } : {}),
    ...(item.notes ?? file.source.notes ? { notes: item.notes ?? file.source.notes } : {}),
  };

  try {
    validateProvenance(provenance);
  } catch (err) {
    if (err instanceof ProvenanceValidationError) {
      throw new SeedValidationError(err.message, idx);
    }
    throw err;
  }

  const naturalKey = buildNaturalKey(provenance);
  const tags = dedupTags([...(file.defaultTags ?? []), ...(item.tags ?? [])]);

  const input: QuestionBankItemInput = {
    sourceKind: file.source.sourceKind,
    sourceLabel: naturalKey,
    grade: item.grade,
    ...(item.curriculumTopicId ? { curriculumTopicId: item.curriculumTopicId } : {}),
    questionType: item.questionType,
    ...(item.difficulty ? { difficulty: item.difficulty } : {}),
    ...(item.representationType ? { representationType: item.representationType } : {}),
    promptMarkdown: item.promptMarkdown,
    ...(item.answerMarkdown ? { answerMarkdown: item.answerMarkdown } : {}),
    ...(item.verification ? { verificationItem: item.verification } : {}),
    tags,
    provenance,
  };

  return { input, naturalKey };
}

// Stable natural key for catalog dedup. Combines title + page + exercise so
// re-ingest is a no-op. Falls back to a hash of prompt content for items
// without page/exercise refs (e.g., ministry-public exam questions).
export function buildNaturalKey(provenance: QuestionProvenance): string {
  const title = provenance.sourceTitle.trim();
  if (provenance.pageNumber !== undefined && provenance.exerciseNumber) {
    return `${title} p${provenance.pageNumber} ex${provenance.exerciseNumber}`;
  }
  if (provenance.exerciseNumber) {
    return `${title} ex${provenance.exerciseNumber}`;
  }
  return title;
}

function dedupTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'he'));
}
