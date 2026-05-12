import { jest } from '@jest/globals';
import type { ExecFileException } from 'node:child_process';

type ExecCallback = (err: ExecFileException | null, stdout: string, stderr: string) => void;

const execFileMock = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  execFile: execFileMock,
}));

const { SympyMathVerifier } = await import('./SympyMathVerifier');

function mockChildProcess(stdout: string, stderr = '', err: ExecFileException | null = null) {
  execFileMock.mockImplementationOnce((...args: unknown[]) => {
    const callback = args[3] as ExecCallback;
    callback(err, stdout, stderr);
    return {
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
    };
  });
}

describe('SympyMathVerifier subprocess errors', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('rejects when the verifier subprocess fails', async () => {
    const verifier = new SympyMathVerifier();
    const err = new Error('boom') as ExecFileException;
    mockChildProcess('', 'traceback', err);

    await expect(verifier.verifyExamItems([])).rejects.toThrow(/SymPy verification failed/);
  });

  it('rejects when subprocess output is not JSON', async () => {
    const verifier = new SympyMathVerifier();
    mockChildProcess('not json');

    await expect(verifier.verifyExamItems([])).rejects.toThrow(/Failed to parse SymPy output/);
  });
});
