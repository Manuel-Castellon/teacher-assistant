import type { VerificationItem } from '../exam/types';
import type { GradeLevel } from '../types/shared';

export type QuestionBankSourceKind =
  | 'generated_exam'
  | 'generated_lesson'
  | 'manual'
  | 'bagrut_archive'
  | 'teacher_provided';

export type QuestionBankDifficulty = 'בסיסי' | 'בינוני' | 'מתקדם' | 'אתגר';

export type RepresentationType = 'טקסט' | 'גרף' | 'טבלה' | 'שרטוט' | 'ציר_מספרים' | 'מעורב';

export type QuestionType = 'חישובי' | 'בעיה_מילולית' | 'הוכחה' | 'קריאה_וניתוח' | 'מעורב';

// License governs how a bank item may be used in generated artifacts. Every
// licensed insert must carry a matching QuestionProvenance object.
//   ministry-public           — ministry-published materials; classroom/exam
//                               reuse is expected, but redistribution still
//                               depends on the source terms.
//   teacher-original          — teacher's own work, full rights.
//   open-license              — explicitly reusable under the recorded terms.
//   public-domain             — no active copyright restrictions identified.
//   copyrighted-personal-use  — textbook content; verbatim classroom/exam use
//                               requires teacher acknowledgement and provenance.
//   student-submitted         — reserved for future MVP (graded student work).
//   unknown                   — legacy/in-flight rows; cannot be used as exam seed.
export type QuestionLicense =
  | 'ministry-public'
  | 'teacher-original'
  | 'open-license'
  | 'public-domain'
  | 'copyrighted-personal-use'
  | 'student-submitted'
  | 'unknown';

// Trademark/copyright audit trail. sourceTitle + license are required; the rest
// are optional but every field that exists must be accurate at ingest time.
export interface QuestionProvenance {
  license: QuestionLicense;
  sourceTitle: string;
  author?: string;
  publisher?: string;
  year?: number;
  edition?: string;
  isbn?: string;
  pageNumber?: number;
  exerciseNumber?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  ingestedAt: string;
  ingestedBy?: string;
  notes?: string;
}

export interface QuestionBankItemInput {
  teacherId?: string;
  sourceArtifactId?: string;
  sourceKind: QuestionBankSourceKind;
  sourceLabel?: string;
  grade: GradeLevel;
  curriculumTopicId?: string;
  questionType: QuestionType;
  difficulty?: QuestionBankDifficulty;
  representationType?: RepresentationType;
  promptMarkdown: string;
  answerMarkdown?: string;
  verificationItem?: VerificationItem;
  rubric?: unknown;
  tags?: string[];
  provenance: QuestionProvenance;
  metadata?: Record<string, unknown>;
}

export interface QuestionBankItemSummary {
  id: string;
  grade: GradeLevel;
  curriculumTopicId?: string;
  questionType: QuestionType;
  difficulty?: QuestionBankDifficulty;
  representationType?: RepresentationType;
  license: QuestionLicense;
  sourceTitle: string;
  tags: string[];
  createdAt: string;
}

export interface QuestionBankItemFull extends QuestionBankItemSummary {
  teacherId: string | null;
  sourceKind: QuestionBankSourceKind;
  sourceLabel: string | null;
  promptMarkdown: string;
  answerMarkdown: string | null;
  verificationItem: VerificationItem | null;
  rubric: unknown | null;
  provenance: QuestionProvenance;
  metadata: Record<string, unknown>;
}

const LICENSES: readonly QuestionLicense[] = [
  'ministry-public',
  'teacher-original',
  'open-license',
  'public-domain',
  'copyrighted-personal-use',
  'student-submitted',
  'unknown',
] as const;

export class ProvenanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvenanceValidationError';
  }
}

// Strict gate: every persisted item must pass this before it touches the DB.
// Keep error messages specific so the ingest CLI can point at the failing field.
export function validateProvenance(provenance: unknown): asserts provenance is QuestionProvenance {
  if (!provenance || typeof provenance !== 'object') {
    throw new ProvenanceValidationError('provenance is required and must be an object');
  }
  const p = provenance as Record<string, unknown>;
  if (typeof p.license !== 'string' || !LICENSES.includes(p.license as QuestionLicense)) {
    throw new ProvenanceValidationError(
      `provenance.license must be one of ${LICENSES.join(', ')}; got ${String(p.license)}`,
    );
  }
  if (p.license === 'unknown') {
    throw new ProvenanceValidationError(
      'provenance.license=unknown is not allowed on insert; pick a real license tier',
    );
  }
  if (typeof p.sourceTitle !== 'string' || p.sourceTitle.trim().length === 0) {
    throw new ProvenanceValidationError('provenance.sourceTitle is required (non-empty string)');
  }
  if (typeof p.ingestedAt !== 'string' || Number.isNaN(Date.parse(p.ingestedAt))) {
    throw new ProvenanceValidationError('provenance.ingestedAt must be an ISO datetime string');
  }
  if (p.license === 'open-license') {
    const hasLicensePointer =
      (typeof p.licenseUrl === 'string' && p.licenseUrl.trim().length > 0)
      || (typeof p.sourceUrl === 'string' && p.sourceUrl.trim().length > 0)
      || (typeof p.notes === 'string' && p.notes.trim().length > 0);
    if (!hasLicensePointer) {
      throw new ProvenanceValidationError(
        'open-license items must record provenance.licenseUrl, sourceUrl, or notes describing reuse terms',
      );
    }
  }
  // Copyrighted material must carry a page number AND an exercise number AND author —
  // this is the trademark audit trail. Ministry/teacher-original are looser.
  if (p.license === 'copyrighted-personal-use') {
    if (typeof p.author !== 'string' || p.author.trim().length === 0) {
      throw new ProvenanceValidationError(
        'copyrighted-personal-use items must record provenance.author',
      );
    }
    if (typeof p.pageNumber !== 'number' || !Number.isFinite(p.pageNumber)) {
      throw new ProvenanceValidationError(
        'copyrighted-personal-use items must record provenance.pageNumber',
      );
    }
    if (typeof p.exerciseNumber !== 'string' || p.exerciseNumber.trim().length === 0) {
      throw new ProvenanceValidationError(
        'copyrighted-personal-use items must record provenance.exerciseNumber',
      );
    }
  }
}
