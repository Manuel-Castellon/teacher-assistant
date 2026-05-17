import { jest } from '@jest/globals';
import type { QuestionBankItemFull, QuestionBankItemSummary } from '@/questionBank/types';

const listQuestionBankItems = jest.fn();
const loadQuestionBankItem = jest.fn();

jest.unstable_mockModule('@/lib/db', () => ({ pool: { query: jest.fn() } }));
jest.unstable_mockModule('@/questionBank/serverStore', () => ({
  listQuestionBankItems,
  loadQuestionBankItem,
}));

let listGET: (request: Request) => Promise<Response>;
let detailGET: (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

beforeAll(async () => {
  ({ GET: listGET } = await import('./route'));
  ({ GET: detailGET } = await import('./[id]/route'));
});

beforeEach(() => {
  listQuestionBankItems.mockReset();
  loadQuestionBankItem.mockReset();
});

describe('GET /api/question-bank', () => {
  it('returns filtered question-bank summaries', async () => {
    const item: QuestionBankItemSummary = {
      id: '11111111-1111-4111-8111-111111111111',
      grade: 'חי',
      questionType: 'חישובי',
      difficulty: 'בינוני',
      license: 'teacher-original',
      sourceTitle: 'מבחן מורה',
      tags: ['אלגברה'],
      createdAt: '2026-05-17T10:00:00.000Z',
    };
    listQuestionBankItems.mockResolvedValue([item] as never);

    const response = await listGET(new Request(
      'http://test/api/question-bank?grade=חי&questionType=חישובי&difficulty=בינוני&license=teacher-original&topic=ms-grade8-t04',
    ));
    const body = await response.json() as { items?: QuestionBankItemSummary[] };

    expect(response.status).toBe(200);
    expect(body.items).toEqual([item]);
    expect(listQuestionBankItems).toHaveBeenCalledWith(expect.anything(), {
      grade: 'חי',
      questionType: 'חישובי',
      difficulty: 'בינוני',
      license: 'teacher-original',
      curriculumTopicId: 'ms-grade8-t04',
      limit: 200,
    });
  });

  it('rejects invalid enum filters before querying', async () => {
    const response = await listGET(new Request('http://test/api/question-bank?grade=bad'));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid grade=bad');
    expect(listQuestionBankItems).not.toHaveBeenCalled();
  });
});

describe('GET /api/question-bank/[id]', () => {
  it('returns a full question-bank item', async () => {
    const item: QuestionBankItemFull = {
      id: '11111111-1111-4111-8111-111111111111',
      teacherId: null,
      sourceKind: 'teacher_provided',
      sourceLabel: 'teacher exam q1',
      grade: 'חי',
      questionType: 'חישובי',
      difficulty: 'בינוני',
      license: 'teacher-original',
      sourceTitle: 'מבחן מורה',
      promptMarkdown: 'פתרו $2x=8$',
      answerMarkdown: '$x=4$',
      verificationItem: null,
      rubric: null,
      tags: ['אלגברה'],
      provenance: {
        license: 'teacher-original',
        sourceTitle: 'מבחן מורה',
        ingestedAt: '2026-05-17T10:00:00.000Z',
      },
      metadata: {},
      createdAt: '2026-05-17T10:00:00.000Z',
    };
    loadQuestionBankItem.mockResolvedValue(item as never);

    const response = await detailGET(new Request('http://test/api/question-bank/11111111-1111-4111-8111-111111111111'), {
      params: Promise.resolve({ id: item.id }),
    });
    const body = await response.json() as { item?: QuestionBankItemFull };

    expect(response.status).toBe(200);
    expect(body.item?.id).toBe(item.id);
  });

  it('rejects invalid ids and returns 404 for missing items', async () => {
    const invalid = await detailGET(new Request('http://test/api/question-bank/not-a-uuid'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(invalid.status).toBe(400);

    loadQuestionBankItem.mockResolvedValue(null as never);
    const missing = await detailGET(new Request('http://test/api/question-bank/11111111-1111-4111-8111-111111111111'), {
      params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
    });
    expect(missing.status).toBe(404);
  });
});
