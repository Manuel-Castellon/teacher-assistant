import { GET as listGET } from './route';
import { GET as detailGET } from './[id]/route';

interface DetailBody {
  rubric?: { id: string; questions: { questionNumber: number }[] };
  markdown?: string;
  error?: string;
}

interface ListBody {
  rubrics?: { id: string; questionCount: number; totalPoints: number }[];
  error?: string;
}

describe('GET /api/rubrics', () => {
  it('returns summaries for rubrics in data/exam-rubrics', async () => {
    const response = await listGET();
    const body = (await response.json()) as ListBody;

    expect(response.status).toBe(200);
    expect(body.rubrics?.length ?? 0).toBeGreaterThan(0);
    const sample = body.rubrics?.find(r => r.id === 'mivhan-b-may-26');
    expect(sample).toBeDefined();
    expect(sample?.totalPoints).toBe(100);
    expect(sample?.questionCount).toBeGreaterThan(0);
  });
});

describe('GET /api/rubrics/[id]', () => {
  it('returns the rubric JSON and rendered markdown', async () => {
    const response = await detailGET(new Request('http://test/api/rubrics/mivhan-b-may-26'), {
      params: Promise.resolve({ id: 'mivhan-b-may-26' }),
    });
    const body = (await response.json()) as DetailBody;

    expect(response.status).toBe(200);
    expect(body.rubric?.id).toBe('mivhan-b-may-26');
    expect(body.markdown).toContain('# מחוון');
    expect(body.markdown).toContain('| קריטריון | נקודות |');
  });

  it('rejects ids that fail the safe-id check', async () => {
    const response = await detailGET(new Request('http://test/api/rubrics/bad.id'), {
      params: Promise.resolve({ id: 'bad.id' }),
    });
    const body = (await response.json()) as DetailBody;

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid rubric id');
  });

  it('returns 404 when the rubric file is missing', async () => {
    const response = await detailGET(new Request('http://test/api/rubrics/no-such-rubric'), {
      params: Promise.resolve({ id: 'no-such-rubric' }),
    });
    const body = (await response.json()) as DetailBody;

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/no such file|ENOENT/);
  });
});
