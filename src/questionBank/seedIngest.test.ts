import { buildNaturalKey, resolveSeedFile, SeedValidationError } from './seedIngest';

const INGESTED_AT = '2026-05-17T10:00:00.000Z';

describe('resolveSeedFile', () => {
  it('merges source provenance, item provenance, and tags', () => {
    const [resolved] = resolveSeedFile({
      source: {
        sourceKind: 'teacher_provided',
        license: 'copyrighted-personal-use',
        sourceTitle: 'בני גורן ג-2',
        author: 'בני גורן',
        publisher: 'הוצאת מבחנים',
        year: 2024,
      },
      defaultTags: [' מרוכבים ', 'אלגברה'],
      items: [{
        grade: 'יבי',
        curriculumTopicId: 'hs-grade12-5u-complex',
        questionType: 'חישובי',
        difficulty: 'בינוני',
        representationType: 'טקסט',
        promptMarkdown: 'חשבו $(1+i)^2$',
        answerMarkdown: '$2i$',
        pageNumber: 17,
        exerciseNumber: '12',
        tags: ['אלגברה', 'חזקות'],
      }],
    }, INGESTED_AT, 'seed-cli');

    expect(resolved?.naturalKey).toBe('בני גורן ג-2 p17 ex12');
    expect(resolved?.input.tags).toEqual(['אלגברה', 'חזקות', 'מרוכבים']);
    expect(resolved?.input.provenance).toMatchObject({
      sourceTitle: 'בני גורן ג-2',
      author: 'בני גורן',
      pageNumber: 17,
      exerciseNumber: '12',
      ingestedAt: INGESTED_AT,
      ingestedBy: 'seed-cli',
    });
  });

  it('wraps copyrighted provenance failures with the item index', () => {
    expect(() => resolveSeedFile({
      source: {
        sourceKind: 'teacher_provided',
        license: 'copyrighted-personal-use',
        sourceTitle: 'בני גורן ג-2',
        author: 'בני גורן',
      },
      items: [{
        grade: 'יבי',
        questionType: 'חישובי',
        promptMarkdown: 'x',
      }],
    }, INGESTED_AT)).toThrow(SeedValidationError);

    try {
      resolveSeedFile({
        source: {
          sourceKind: 'teacher_provided',
          license: 'copyrighted-personal-use',
          sourceTitle: 'בני גורן ג-2',
          author: 'בני גורן',
        },
        items: [{
          grade: 'יבי',
          questionType: 'חישובי',
          promptMarkdown: 'x',
        }],
      }, INGESTED_AT);
    } catch (err) {
      expect(err).toBeInstanceOf(SeedValidationError);
      expect(String((err as Error).message)).toContain('item[0]');
      expect(String((err as Error).message)).toContain('pageNumber');
    }
  });
});

describe('buildNaturalKey', () => {
  it('falls back from page/exercise to source title', () => {
    expect(buildNaturalKey({
      license: 'teacher-original',
      sourceTitle: 'מבחן מורה מאי 2026',
      ingestedAt: INGESTED_AT,
    })).toBe('מבחן מורה מאי 2026');
  });
});

describe('open-license provenance', () => {
  it('accepts source-level licenseUrl', () => {
    const [resolved] = resolveSeedFile({
      source: {
        sourceKind: 'manual',
        license: 'open-license',
        sourceTitle: 'Open worksheet',
        sourceUrl: 'https://example.test/worksheet',
        licenseUrl: 'https://example.test/license',
      },
      items: [{
        grade: 'חי',
        questionType: 'חישובי',
        promptMarkdown: 'פתרו $x+1=2$',
      }],
    }, INGESTED_AT);

    expect(resolved?.input.provenance.licenseUrl).toBe('https://example.test/license');
  });
});
